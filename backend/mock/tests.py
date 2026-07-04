import time
import unittest.mock as mock
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from celery.exceptions import MaxRetriesExceededError
from rest_framework import status
from rest_framework.test import APITestCase

from resume_sessions.models import ResumeSession, InterviewQuestion
from .models import MockInterview, MockAnswer
from .tasks import generate_final_report_task

User = get_user_model()

class MockAppTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="mockuser@example.com", name="Mock User", password="password123")
        self.session = ResumeSession.objects.create(
            user=self.user,
            resume_filename="resume.pdf",
            resume_text="Extracted skills",
            job_role="Frontend Developer",
            experience_level="Mid (3-5 years)",
            status="ready"
        )
        # Create 20 mock questions (8 Technical, 5 Project-Based, 4 Behavioral, 3 Role-Specific)
        self.questions = []
        categories = (
            ['Technical'] * 8 +
            ['Project-Based'] * 5 +
            ['Behavioral'] * 4 +
            ['Role-Specific'] * 3
        )
        for idx, cat in enumerate(categories):
            q = InterviewQuestion.objects.create(
                session=self.session,
                category=cat,
                question_text=f"Question {idx} of category {cat}",
                difficulty="Medium",
                why_asked="Why?",
                ideal_answer_outline=["Point 1", "Point 2", "Point 3"],
                order_index=idx
            )
            self.questions.append(q)

    def test_mock_setup_question_allocations(self):
        """
        Verify that question mixes (balanced, technical, behavioral) select proper distributions.
        """
        self.client.force_authenticate(user=self.user)
        
        # 1. Balanced mix, 10 questions
        response = self.client.post(
            f"/api/sessions/{self.session.id}/mock/",
            {"question_count": 10, "question_mix": "balanced", "time_limit": 120},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['questions']), 10)
        self.assertEqual(len(response.data['mock']['question_order']), 10)

    def test_out_of_order_question_rejected(self):
        """
        Verify that answer submissions reject question IDs that do not match current_question_index.
        """
        mock_interview = MockInterview.objects.create(
            session=self.session,
            user=self.user,
            question_count=5,
            question_mix="balanced",
            status="in_progress",
            question_order=[self.questions[0].id, self.questions[1].id],
            current_question_index=0,
            question_started_at=timezone.now()
        )

        self.client.force_authenticate(user=self.user)
        
        # Submit answer for questions[1].id (index 1) while expected is questions[0].id (index 0)
        response = self.client.post(
            f"/api/mock/{mock_interview.id}/answer/",
            {"question_id": self.questions[1].id, "user_answer": "My answer"},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid or out-of-order question ID", response.data['detail'])

    def test_timer_is_not_reset_on_get(self):
        """
        Verify GET /api/mock/{id}/ reads but does not modify question_started_at.
        """
        started_time = timezone.now() - timedelta(seconds=10)
        mock_interview = MockInterview.objects.create(
            session=self.session,
            user=self.user,
            question_count=5,
            question_mix="balanced",
            status="in_progress",
            question_order=[self.questions[0].id],
            current_question_index=0,
            question_started_at=started_time
        )

        self.client.force_authenticate(user=self.user)
        
        # First GET call
        response = self.client.get(f"/api/mock/{mock_interview.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Fetch timestamp from DB
        mock_interview.refresh_from_db()
        self.assertEqual(mock_interview.question_started_at, started_time)

        # Repeated GET call should leave it unchanged
        response_2 = self.client.get(f"/api/mock/{mock_interview.id}/")
        self.assertEqual(response_2.status_code, status.HTTP_200_OK)
        
        mock_interview.refresh_from_db()
        self.assertEqual(mock_interview.question_started_at, started_time)

    def test_server_side_timer_timeout(self):
        """
        Verify that submission after the time limit (plus grace period) triggers a timeout,
        clearing user_answer to empty string and setting was_timed_out=True.
        """
        limit = 60 # 1 minute
        started_time = timezone.now() - timedelta(seconds=70) # 70s ago (exceeds limit + 5s grace)
        
        mock_interview = MockInterview.objects.create(
            session=self.session,
            user=self.user,
            question_count=5,
            question_mix="balanced",
            time_limit_per_question=limit,
            status="in_progress",
            question_order=[self.questions[0].id],
            current_question_index=0,
            question_started_at=started_time
        )

        self.client.force_authenticate(user=self.user)
        
        # Submit after limit
        with mock.patch('mock.views.evaluate_mock_answer_task.delay') as mock_task:
            response = self.client.post(
                f"/api/mock/{mock_interview.id}/answer/",
                {"question_id": self.questions[0].id, "user_answer": "My detailed response"},
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            
            # Refetch answer
            ans = MockAnswer.objects.get(mock_interview=mock_interview, question=self.questions[0])
            self.assertTrue(ans.was_timed_out)
            # Answer should be stored as empty string
            self.assertEqual(ans.user_answer, "")
            self.assertEqual(ans.time_taken_seconds, limit)

    def test_skip_question_endpoint(self):
        """
        Verify that skip question sets was_skipped=True and advances the question index.
        """
        mock_interview = MockInterview.objects.create(
            session=self.session,
            user=self.user,
            question_count=5,
            question_mix="balanced",
            status="in_progress",
            question_order=[self.questions[0].id, self.questions[1].id],
            current_question_index=0,
            question_started_at=timezone.now()
        )

        self.client.force_authenticate(user=self.user)
        
        response = self.client.post(
            f"/api/mock/{mock_interview.id}/skip/",
            {"question_id": self.questions[0].id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        ans = MockAnswer.objects.get(mock_interview=mock_interview, question=self.questions[0])
        self.assertTrue(ans.was_skipped)
        self.assertEqual(ans.per_question_score, 0) # Skips score 0 directly
        
        mock_interview.refresh_from_db()
        self.assertEqual(mock_interview.current_question_index, 1)

    def test_mock_interview_complete_backfills_unanswered(self):
        """
        Verify completing a mock backfills unanswered questions as timed out.
        """
        mock_interview = MockInterview.objects.create(
            session=self.session,
            user=self.user,
            question_count=3,
            question_mix="balanced",
            status="in_progress",
            question_order=[self.questions[0].id, self.questions[1].id, self.questions[2].id],
            current_question_index=0
        )
        
        # User answered the first question
        MockAnswer.objects.create(
            mock_interview=mock_interview,
            question=self.questions[0],
            user_answer="First answer",
            per_question_score=8
        )

        self.client.force_authenticate(user=self.user)
        
        with mock.patch('mock.views.generate_final_report_task.delay') as mock_report_task:
            response = self.client.post(f"/api/mock/{mock_interview.id}/complete/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Check that questions[1] and questions[2] have been backfilled as timed out
            ans_1 = MockAnswer.objects.get(mock_interview=mock_interview, question=self.questions[1])
            ans_2 = MockAnswer.objects.get(mock_interview=mock_interview, question=self.questions[2])
            
            self.assertTrue(ans_1.was_timed_out)
            self.assertTrue(ans_2.was_timed_out)
            self.assertEqual(ans_1.per_question_score, 1)
            self.assertEqual(ans_2.per_question_score, 1)

    @mock.patch('celery.app.task.Task.retry')
    def test_report_generation_retries_on_pending_scores(self, mock_retry):
        """
        Verify generate_final_report_task retries while individual evaluations are pending.
        """
        mock_interview = MockInterview.objects.create(
            session=self.session,
            user=self.user,
            question_count=1,
            question_mix="balanced",
            status="processing",
            question_order=[self.questions[0].id]
        )
        
        # Score is still None (pending evaluation)
        MockAnswer.objects.create(
            mock_interview=mock_interview,
            question=self.questions[0],
            user_answer="Some answer",
            per_question_score=None
        )

        # Run task. It should trigger celery self.retry
        generate_final_report_task(mock_interview.id)
        mock_retry.assert_called_once()

    def test_report_generation_exhaustion_marks_failed(self):
        """
        Verify that report task retry exhaustion transitions status to failed.
        """
        mock_interview = MockInterview.objects.create(
            session=self.session,
            user=self.user,
            question_count=1,
            question_mix="balanced",
            status="processing",
            question_order=[self.questions[0].id]
        )
        # Score is still None (pending evaluation)
        MockAnswer.objects.create(
            mock_interview=mock_interview,
            question=self.questions[0],
            user_answer="Some answer",
            per_question_score=None
        )

        # Mock self.retry to raise MaxRetriesExceededError
        with mock.patch('celery.app.task.Task.retry') as mock_retry:
            mock_retry.side_effect = MaxRetriesExceededError()
            
            # Execute task
            generate_final_report_task(mock_interview.id)
            
            mock_interview.refresh_from_db()
            self.assertEqual(mock_interview.status, 'failed')
            self.assertIn("evaluations timed out", mock_interview.error_message)
