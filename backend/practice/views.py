import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.core.cache import cache
from prepiq.utils import dispatch_task
from resume_sessions.models import InterviewQuestion
from .models import QuestionConfidence, PracticeAttempt
from .serializers import QuestionConfidenceSerializer, PracticeAttemptSerializer
from .tasks import evaluate_practice_attempt_task

logger = logging.getLogger(__name__)

class QuestionConfidenceView(APIView):
    """
    PATCH: Updates or sets the user's confidence level for a specific question.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            # Verify the question belongs to a session owned by this user
            question = InterviewQuestion.objects.get(id=pk, session__user=request.user)
        except InterviewQuestion.DoesNotExist:
            return Response({"detail": "Question not found."}, status=status.HTTP_404_NOT_FOUND)

        level = request.data.get('level')
        valid_levels = ['not_practiced', 'needs_work', 'confident']
        if not level or level not in valid_levels:
            return Response({"detail": "Invalid or missing confidence level."}, status=status.HTTP_400_BAD_REQUEST)

        confidence, created = QuestionConfidence.objects.update_or_create(
            question=question,
            user=request.user,
            defaults={'level': level}
        )

        serializer = QuestionConfidenceSerializer(confidence)
        return Response(serializer.data, status=status.HTTP_200_OK)

class PracticeAttemptView(APIView):
    """
    POST: Submits an answer for evaluation and creates a PracticeAttempt.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            question = InterviewQuestion.objects.get(id=pk, session__user=request.user)
        except InterviewQuestion.DoesNotExist:
            return Response({"detail": "Question not found."}, status=status.HTTP_404_NOT_FOUND)

        user_answer = request.data.get('user_answer', '').strip()
        if not user_answer:
            return Response({"detail": "Answer text cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        # Save attempt in DB with processing status
        attempt = PracticeAttempt.objects.create(
            question=question,
            user=request.user,
            user_answer=user_answer,
            score=None,
            ai_feedback=None,
            status='processing'
        )

        # Auto-update question confidence if not practiced yet
        confidence, created = QuestionConfidence.objects.get_or_create(
            question=question,
            user=request.user,
            defaults={'level': 'needs_work'}
        )
        if not created and confidence.level == 'not_practiced':
            confidence.level = 'needs_work'
            confidence.save()

        # Trigger background Celery evaluation task
        dispatch_task(evaluate_practice_attempt_task, attempt.id)

        serializer = PracticeAttemptSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

class PracticeAttemptStatusView(APIView):
    """
    GET: Polls practice attempt evaluation status.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            attempt = PracticeAttempt.objects.get(id=pk, user=request.user)
        except PracticeAttempt.DoesNotExist:
            return Response({"detail": "Practice attempt not found."}, status=status.HTTP_404_NOT_FOUND)

        # Self-healing: if stuck in processing, re-dispatch evaluation task
        if attempt.status == 'processing':
            heal_key = f"heal_practice_{attempt.id}"
            if cache.add(heal_key, True, timeout=10):
                dispatch_task(evaluate_practice_attempt_task, attempt.id)

        serializer = PracticeAttemptSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_200_OK)

class PracticeAttemptHistoryView(APIView):
    """
    GET: Lists past practice attempts for this question.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            question = InterviewQuestion.objects.get(id=pk, session__user=request.user)
        except InterviewQuestion.DoesNotExist:
            return Response({"detail": "Question not found."}, status=status.HTTP_404_NOT_FOUND)

        # Optimization: Sort by primary key '-id' instead of '-created_at' to utilize PK index
        attempts = PracticeAttempt.objects.filter(question=question, user=request.user).order_by('-id')
        serializer = PracticeAttemptSerializer(attempts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
