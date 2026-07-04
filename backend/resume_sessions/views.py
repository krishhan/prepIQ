import pdfplumber
import logging
from django.db import transaction
from django.core.cache import cache
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from prepiq.utils import check_rate_limit_and_lock, release_lock, dispatch_task
from .models import ResumeSession, InterviewQuestion
from .serializers import ResumeSessionSerializer, InterviewQuestionSerializer
from .tasks import generate_questions_task

logger = logging.getLogger(__name__)

class ResumeSessionListView(APIView):
    """
    GET: Lists all resume sessions for the authenticated user.
    POST: Uploads a PDF resume, validates it, and triggers question generation.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = ResumeSession.objects.filter(user=request.user).order_by('-created_at')
        # Note: Pagination is deferred post-MVP as per requirements
        serializer = ResumeSessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        job_role = request.data.get('job_role')
        experience_level = request.data.get('experience_level')
        pdf_file = request.FILES.get('resume')

        # 1. Input validations
        valid_roles = [
            "Frontend Developer", "Backend Developer", "Full Stack Developer",
            "Data Scientist", "DevOps Engineer", "ML Engineer", "Product Manager",
            "UI/UX Designer", "Android Developer", "iOS Developer"
        ]
        valid_levels = ["Fresher (0-1 years)", "Junior (1-3 years)", "Mid (3-5 years)", "Senior (5+ years)"]

        if not job_role or job_role not in valid_roles:
            return Response({"detail": "Invalid or missing job role."}, status=status.HTTP_400_BAD_REQUEST)
        if not experience_level or experience_level not in valid_levels:
            return Response({"detail": "Invalid or missing experience level."}, status=status.HTTP_400_BAD_REQUEST)
        if not pdf_file:
            return Response({"detail": "No resume file was uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. File size and magic bytes validation
        if not pdf_file.name.lower().endswith('.pdf'):
            return Response({"detail": "Only PDF files are supported."}, status=status.HTTP_400_BAD_REQUEST)

        if pdf_file.size > 5 * 1024 * 1024:
            return Response({"detail": "File size exceeds the 5MB limit."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            magic_bytes = pdf_file.read(4)
            pdf_file.seek(0)
            if magic_bytes != b'%PDF':
                return Response({"detail": "Invalid file format. File is not a valid PDF."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"detail": "Could not read upload file header."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Rate limiting and concurrency check
        try:
            check_rate_limit_and_lock(request.user, 'session', 5, ResumeSession)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # 4. In-memory PDF text extraction
        extracted_text = ""
        try:
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += page_text + "\n"
        except Exception as e:
            release_lock(request.user, 'session')
            logger.error(f"Error parsing PDF: {str(e)}")
            return Response({"detail": "Error reading text from the PDF file."}, status=status.HTTP_400_BAD_REQUEST)

        # Scanned PDF check
        if len(extracted_text.strip()) < 100:
            release_lock(request.user, 'session')
            return Response(
                {"detail": "Your PDF appears to be an image or scanned document. Please upload a text-based PDF."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 5. Create ResumeSession & trigger background generation task
        try:
            with transaction.atomic():
                session = ResumeSession.objects.create(
                    user=request.user,
                    resume_filename=pdf_file.name,
                    resume_text=extracted_text,
                    job_role=job_role,
                    experience_level=experience_level,
                    status='processing'
                )
            
            # Start background Celery task
            dispatch_task(generate_questions_task, session.id)
            
            serializer = ResumeSessionSerializer(session)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Failed to initialize session: {str(e)}")
            return Response({"detail": "Server error initializing session."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            # Always release lock immediately after creation phase concludes
            release_lock(request.user, 'session')

class ResumeSessionDetailView(APIView):
    """
    GET: Retrieves a single resume session.
    DELETE: Deletes a session if no active mock interview is in progress (HTTP 409 otherwise).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            session = ResumeSession.objects.get(id=pk, user=request.user)
        except ResumeSession.DoesNotExist:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = ResumeSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            session = ResumeSession.objects.get(id=pk, user=request.user)
        except ResumeSession.DoesNotExist:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check for active in_progress mocks
        if session.mocks.filter(status='in_progress').exists():
            return Response(
                {"detail": "Cannot delete session while a mock interview is in progress."},
                status=status.HTTP_409_CONFLICT
            )

        session.delete()
        return Response({"detail": "Session deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

class ResumeSessionStatusView(APIView):
    """
    GET: Polls status of question generation for a session.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            session = ResumeSession.objects.get(id=pk, user=request.user)
        except ResumeSession.DoesNotExist:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "status": session.status,
            "error_message": session.error_message
        }, status=status.HTTP_200_OK)

class SessionQuestionsListView(APIView):
    """
    GET: Retrieves generated questions for a session. Optional category & difficulty filters.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            session = ResumeSession.objects.get(id=pk, user=request.user)
        except ResumeSession.DoesNotExist:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        questions = session.questions.all()

        # Query param filters
        category = request.query_params.get('category')
        difficulty = request.query_params.get('difficulty')

        if category:
            questions = questions.filter(category=category)
        if difficulty:
            questions = questions.filter(difficulty=difficulty)

        serializer = InterviewQuestionSerializer(questions, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
