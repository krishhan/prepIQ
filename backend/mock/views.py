import random
import logging
from django.db import transaction
from django.utils import timezone
from django.core.cache import cache
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from prepiq.utils import check_rate_limit_and_lock, release_lock, dispatch_task
from resume_sessions.models import ResumeSession, InterviewQuestion
from resume_sessions.serializers import InterviewQuestionSerializer
from .models import MockInterview, MockAnswer
from .serializers import (
    MockInterviewSerializer,
    MockAnswerSerializer,
    InterviewQuestionMockSerializer
)
from .tasks import evaluate_mock_answer_task, generate_final_report_task

logger = logging.getLogger(__name__)

class MockInterviewSetupView(APIView):
    """
    POST: Configures and starts a new MockInterview for a session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_pk):
        try:
            session = ResumeSession.objects.get(id=session_pk, user=request.user)
        except ResumeSession.DoesNotExist:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.status != 'ready':
            return Response({"detail": "Resume session is not ready. Questions are still generating."}, status=status.HTTP_400_BAD_REQUEST)

        question_count = request.data.get('question_count')  # 5, 10, 20
        question_mix = request.data.get('question_mix')      # balanced, technical, behavioral
        time_limit = request.data.get('time_limit')          # 120, 180 or null

        if question_count not in [5, 10, 20]:
            return Response({"detail": "Invalid question count. Choose 5, 10, or 20."}, status=status.HTTP_400_BAD_REQUEST)
        if question_mix not in ['balanced', 'technical', 'behavioral']:
            return Response({"detail": "Invalid question mix."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Check rate limits & acquire cache lock
        try:
            check_rate_limit_and_lock(request.user, 'mock', 3, MockInterview)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # 2. Select questions based on mix
        tech_qs = list(session.questions.filter(category='Technical'))
        proj_qs = list(session.questions.filter(category='Project-Based'))
        behav_qs = list(session.questions.filter(category='Behavioral'))
        concep_qs = list(session.questions.filter(category='Role-Specific'))

        # Seed allocations
        if question_mix == 'balanced':
            if question_count == 5:
                t, p, b, c = 2, 1, 1, 1
            elif question_count == 10:
                t, p, b, c = 4, 2, 2, 2
            else:
                t, p, b, c = 8, 5, 4, 3
        elif question_mix == 'technical':
            if question_count == 5:
                t, p, b, c = 2, 1, 1, 1
            elif question_count == 10:
                t, p, b, c = 4, 2, 2, 2
            else:
                t, p, b, c = 8, 5, 4, 3
        else:  # behavioral
            if question_count == 5:
                t, p, b, c = 1, 1, 2, 1
            elif question_count == 10:
                t, p, b, c = 2, 2, 3, 3
            else:
                t, p, b, c = 8, 5, 4, 3

        random.seed()
        selected_qs = []
        selected_qs.extend(random.sample(tech_qs, min(t, len(tech_qs))))
        selected_qs.extend(random.sample(proj_qs, min(p, len(proj_qs))))
        selected_qs.extend(random.sample(behav_qs, min(b, len(behav_qs))))
        selected_qs.extend(random.sample(concep_qs, min(c, len(concep_qs))))

        # Randomize order
        random.shuffle(selected_qs)
        question_order = [q.id for q in selected_qs]

        # 3. Create MockInterview
        try:
            with transaction.atomic():
                mock_interview = MockInterview.objects.create(
                    session=session,
                    user=request.user,
                    question_count=len(question_order),
                    question_mix=question_mix,
                    time_limit_per_question=time_limit,
                    status='in_progress',
                    question_order=question_order,
                    current_question_index=0,
                    question_started_at=timezone.now()
                )
            
            # Serialize
            serializer = MockInterviewSerializer(mock_interview)
            questions_serialized = InterviewQuestionMockSerializer(selected_qs, many=True)
            
            return Response({
                "mock": serializer.data,
                "questions": questions_serialized.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Failed to create MockInterview: {str(e)}")
            return Response({"detail": "Server error creating mock interview."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            release_lock(request.user, 'mock')

class MockInterviewDetailView(APIView):
    """
    GET: Retrieves the mock state. Hides ideal outlines for integrity.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            mock = MockInterview.objects.get(id=pk, user=request.user)
        except MockInterview.DoesNotExist:
            return Response({"detail": "Mock interview not found."}, status=status.HTTP_404_NOT_FOUND)

        # Retrieve questions in the mock order via single optimized query
        question_ids = mock.question_order
        questions_dict = {q.id: q for q in InterviewQuestion.objects.filter(id__in=question_ids)}
        questions = [questions_dict[q_id] for q_id in question_ids if q_id in questions_dict]

        serializer = MockInterviewSerializer(mock)
        questions_serialized = InterviewQuestionMockSerializer(questions, many=True)

        return Response({
            "mock": serializer.data,
            "questions": questions_serialized.data
        }, status=status.HTTP_200_OK)

class MockAnswerSubmitView(APIView):
    """
    POST: Submits answer for the active mock question. Validates order and server-side timer.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            mock = MockInterview.objects.get(id=pk, user=request.user)
        except MockInterview.DoesNotExist:
            return Response({"detail": "Mock interview not found."}, status=status.HTTP_404_NOT_FOUND)

        if mock.status != 'in_progress':
            return Response({"detail": "Mock interview is not in progress."}, status=status.HTTP_400_BAD_REQUEST)

        question_id = request.data.get('question_id')
        user_answer = request.data.get('user_answer', '')

        # 1. Validate out-of-order/incorrect question submissions
        current_idx = mock.current_question_index
        if current_idx >= len(mock.question_order):
            return Response({"detail": "All questions have already been answered."}, status=status.HTTP_400_BAD_REQUEST)

        expected_q_id = mock.question_order[current_idx]
        if question_id != expected_q_id:
            return Response({"detail": "Invalid or out-of-order question ID."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            question = InterviewQuestion.objects.get(id=question_id)
        except InterviewQuestion.DoesNotExist:
            return Response({"detail": "Referenced question does not exist."}, status=status.HTTP_404_NOT_FOUND)

        # 2. Idempotency Guard (unique_together verification)
        existing_answer = MockAnswer.objects.filter(mock_interview=mock, question=question).first()
        if existing_answer:
            serializer = MockAnswerSerializer(existing_answer)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # 3. Server-side Timer Check
        now = timezone.now()
        started_at = mock.question_started_at or mock.started_at
        elapsed = (now - started_at).total_seconds()
        
        was_timed_out = False
        time_taken = elapsed
        
        if mock.time_limit_per_question:
            # Stricter time check + 5s grace period for latency
            limit_with_grace = mock.time_limit_per_question + 5
            if elapsed > limit_with_grace:
                was_timed_out = True
                user_answer = ""  # Store empty string on timeouts
                time_taken = mock.time_limit_per_question

        # 4. Save MockAnswer
        try:
            with transaction.atomic():
                mock_answer = MockAnswer.objects.create(
                    mock_interview=mock,
                    question=question,
                    user_answer=user_answer,
                    was_skipped=False,
                    was_timed_out=was_timed_out,
                    time_taken_seconds=int(time_taken)
                )
                
                # Advance index
                mock.current_question_index += 1
                if mock.current_question_index < len(mock.question_order):
                    mock.question_started_at = timezone.now()  # reset timer for next question
                mock.save()

            # Trigger background evaluation task
            dispatch_task(evaluate_mock_answer_task, mock_answer.id)

            serializer = MockAnswerSerializer(mock_answer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error saving mock answer: {str(e)}")
            return Response({"detail": "Server error saving answer."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MockInterviewSkipView(APIView):
    """
    POST: Skips the current mock question.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            mock = MockInterview.objects.get(id=pk, user=request.user)
        except MockInterview.DoesNotExist:
            return Response({"detail": "Mock interview not found."}, status=status.HTTP_404_NOT_FOUND)

        if mock.status != 'in_progress':
            return Response({"detail": "Mock interview is not in progress."}, status=status.HTTP_400_BAD_REQUEST)

        question_id = request.data.get('question_id')

        # Validate index integrity
        current_idx = mock.current_question_index
        if current_idx >= len(mock.question_order):
            return Response({"detail": "All questions have already been addressed."}, status=status.HTTP_400_BAD_REQUEST)

        expected_q_id = mock.question_order[current_idx]
        if question_id != expected_q_id:
            return Response({"detail": "Invalid or out-of-order question ID."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            question = InterviewQuestion.objects.get(id=question_id)
        except InterviewQuestion.DoesNotExist:
            return Response({"detail": "Question does not exist."}, status=status.HTTP_404_NOT_FOUND)

        # Idempotency check
        existing_answer = MockAnswer.objects.filter(mock_interview=mock, question=question).first()
        if existing_answer:
            serializer = MockAnswerSerializer(existing_answer)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Save skip record (skips bypass LLM evaluations)
        try:
            with transaction.atomic():
                mock_answer = MockAnswer.objects.create(
                    mock_interview=mock,
                    question=question,
                    user_answer="",
                    was_skipped=True,
                    was_timed_out=False,
                    time_taken_seconds=0,
                    per_question_score=0,
                    per_question_feedback={
                        "score": 0,
                        "strengths": [],
                        "missed_points": ["Question was skipped"],
                        "communication_quality": "Poor",
                        "improved_answer": "N/A"
                    }
                )
                
                # Advance question pointer
                mock.current_question_index += 1
                if mock.current_question_index < len(mock.question_order):
                    mock.question_started_at = timezone.now()
                mock.save()

            serializer = MockAnswerSerializer(mock_answer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error skipping question: {str(e)}")
            return Response({"detail": "Server error processing skip request."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MockInterviewCompleteView(APIView):
    """
    POST: Completes the mock interview and starts overall report generation.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            mock = MockInterview.objects.get(id=pk, user=request.user)
        except MockInterview.DoesNotExist:
            return Response({"detail": "Mock interview not found."}, status=status.HTTP_404_NOT_FOUND)

        if mock.status not in ['in_progress', 'processing']:
            return Response({"detail": "Mock interview is not in a states that allows completion."}, status=status.HTTP_400_BAD_REQUEST)

        # Backfill any unanswered questions (in case user closed tabs or abandoned halfway)
        answered_q_ids = [ans.question.id for ans in mock.answers.all()]
        for q_id in mock.question_order:
            if q_id not in answered_q_ids:
                MockAnswer.objects.get_or_create(
                    mock_interview=mock,
                    question_id=q_id,
                    defaults={
                        'user_answer': '',
                        'was_timed_out': True,
                        'was_skipped': False,
                        'time_taken_seconds': mock.time_limit_per_question or 0,
                        'per_question_score': 1,
                        'per_question_feedback': {
                            "score": 1,
                            "strengths": [],
                            "missed_points": ["Question went unanswered / interview abandoned"],
                            "communication_quality": "Poor",
                            "improved_answer": "N/A"
                        }
                    }
                )

        mock.status = 'processing'
        mock.save(update_fields=['status'])

        # Start Celery beat/report generation task
        dispatch_task(generate_final_report_task, mock.id)

        serializer = MockInterviewSerializer(mock)
        return Response(serializer.data, status=status.HTTP_200_OK)

class MockInterviewStatusView(APIView):
    """
    GET: Polls report status.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            mock = MockInterview.objects.get(id=pk, user=request.user)
        except MockInterview.DoesNotExist:
            return Response({"detail": "Mock interview not found."}, status=status.HTTP_404_NOT_FOUND)

        # Self-healing: if stuck in processing, re-dispatch the final report generation task
        if mock.status == 'processing' and mock.overall_score is None:
            heal_key = f"heal_mock_{mock.id}"
            if cache.add(heal_key, True, timeout=10):
                dispatch_task(generate_final_report_task, mock.id)

        return Response({
            "status": mock.status,
            "error_message": mock.error_message
        }, status=status.HTTP_200_OK)

class MockInterviewReportView(APIView):
    """
    GET: Retrieves the completed mock report and transcript (outlines now fully revealed).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            mock = MockInterview.objects.get(id=pk, user=request.user)
        except MockInterview.DoesNotExist:
            return Response({"detail": "Mock interview not found."}, status=status.HTTP_404_NOT_FOUND)

        if mock.status != 'completed':
            return Response({"detail": f"Report is not ready. Status: {mock.status}"}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve questions in the mock order via single optimized query
        question_ids = mock.question_order
        questions_dict = {q.id: q for q in InterviewQuestion.objects.filter(id__in=question_ids)}
        questions = [questions_dict[q_id] for q_id in question_ids if q_id in questions_dict]

        answers = mock.answers.all()

        return Response({
            "mock": MockInterviewSerializer(mock).data,
            # Normal serializer includes the ideal outlines now
            "questions": InterviewQuestionSerializer(questions, many=True, context={'request': request}).data,
            "answers": MockAnswerSerializer(answers, many=True).data
        }, status=status.HTTP_200_OK)

class SessionMockListView(APIView):
    """
    GET: Lists all mocks created for a specific session.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, session_pk):
        try:
            session = ResumeSession.objects.get(id=session_pk, user=request.user)
        except ResumeSession.DoesNotExist:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        # Optimization: Sort by primary key '-id' instead of '-started_at' to utilize PK index
        mocks = session.mocks.all().order_by('-id')
        serializer = MockInterviewSerializer(mocks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
