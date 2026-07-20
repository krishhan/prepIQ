from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APITestCase

from resume_sessions.models import ResumeSession, InterviewQuestion
from .models import QuestionConfidence, PracticeAttempt
from .serializers import PracticeAttemptSerializer

User = get_user_model()

class PracticeAppTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="practice@example.com", name="Practice User", password="password123")
        self.session = ResumeSession.objects.create(
            user=self.user,
            resume_filename="resume.pdf",
            resume_text="Extracted skills",
            job_role="Frontend Developer",
            experience_level="Mid (3-5 years)",
            status="ready"
        )
        self.question = InterviewQuestion.objects.create(
            session=self.session,
            category="Technical",
            question_text="Explain JS Event Loop.",
            difficulty="Medium",
            why_asked="To test JS async concepts",
            ideal_answer_outline=["Call stack", "Callback queue", "Event loop check"],
            order_index=0
        )

    def test_score_bounds_validators(self):
        """
        Verify that PracticeAttempt validates that scores are between 1 and 10.
        """
        # Valid score
        attempt = PracticeAttempt(
            question=self.question,
            user=self.user,
            user_answer="My answer details",
            score=8,
            ai_feedback={}
        )
        attempt.full_clean()  # should not raise exception

        # Invalid low score (0)
        attempt_low = PracticeAttempt(
            question=self.question,
            user=self.user,
            user_answer="My answer",
            score=0,
            ai_feedback={}
        )
        with self.assertRaises(ValidationError):
            attempt_low.full_clean()

        # Invalid high score (11)
        attempt_high = PracticeAttempt(
            question=self.question,
            user=self.user,
            user_answer="My answer",
            score=11,
            ai_feedback={}
        )
        with self.assertRaises(ValidationError):
            attempt_high.full_clean()

    def test_question_confidence_auto_updates_on_practice(self):
        """
        Verify that making a practice attempt returns HTTP 202, automatically moves confidence level to 'needs_work'
        if it was originally 'not_practiced', and processes attempt asynchronously.
        """
        # Create confidence as 'not_practiced'
        confidence = QuestionConfidence.objects.create(
            question=self.question,
            user=self.user,
            level="not_practiced"
        )

        self.client.force_authenticate(user=self.user)
        
        # Mock OpenRouter API call inside practice/tasks.py
        import unittest.mock as mock
        with mock.patch('practice.tasks.evaluate_practice_answer') as mock_eval:
            mock_eval.return_value = {
                "score": 7,
                "strengths": ["Clear speech"],
                "missed_points": ["Could explain queues better"],
                "communication_quality": "Good",
                "improved_answer": "Event loops are..."
            }

            url = f"/api/questions/{self.question.id}/practice/"
            response = self.client.post(url, {"user_answer": "JavaScript handles async..."}, format='json')
            self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

            # Assert confidence updated to 'needs_work' automatically
            confidence.refresh_from_db()
            self.assertEqual(confidence.level, 'needs_work')

            # Fetch attempt status via status endpoint
            attempt_id = response.data['id']
            status_url = f"/api/questions/attempts/{attempt_id}/status/"
            status_res = self.client.get(status_url)
            self.assertEqual(status_res.status_code, status.HTTP_200_OK)
            self.assertEqual(status_res.data['status'], 'completed')
            self.assertEqual(status_res.data['score'], 7)
