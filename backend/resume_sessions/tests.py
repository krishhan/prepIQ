import os
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ResumeSession, InterviewQuestion
from .serializers import ResumeSessionSerializer
from .tasks import cleanup_old_sessions_task
from mock.models import MockInterview

User = get_user_model()

class ResumeSessionsTests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(email="usera@example.com", name="User A", password="password123")
        self.user_b = User.objects.create_user(email="userb@example.com", name="User B", password="password123")
        
        self.session_data = {
            "resume_filename": "resume.pdf",
            "resume_text": "Experienced Python engineer with Django skills.",
            "job_role": "Backend Developer",
            "experience_level": "Junior (1-3 years)",
            "status": "ready"
        }

    def test_resume_text_encryption_at_rest(self):
        """
        Tests that ResumeSession.resume_text is stored encrypted as ciphertext bytes in the database,
        but decrypted transparently to plain text on read.
        """
        session = ResumeSession.objects.create(
            user=self.user_a,
            resume_filename=self.session_data["resume_filename"],
            resume_text=self.session_data["resume_text"],
            job_role=self.session_data["job_role"],
            experience_level=self.session_data["experience_level"],
            status="ready"
        )

        # 1. Direct fetch from database model returns plaintext string
        refetched = ResumeSession.objects.get(id=session.id)
        self.assertEqual(refetched.resume_text, self.session_data["resume_text"])

        # 2. Raw SQL query checks raw DB column content is encrypted
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT resume_text FROM resume_sessions_resumesession WHERE id = %s", [session.id])
            row = cursor.fetchone()
            db_bytes = row[0]
            
            # DB stores bytes (BinaryField)
            self.assertTrue(isinstance(db_bytes, bytes))
            # Ciphertext should not match the plaintext
            self.assertNotEqual(db_bytes, self.session_data["resume_text"].encode())
            # Decrypting the raw DB bytes using Fernet succeeds
            from cryptography.fernet import Fernet
            fernet = Fernet(os.environ.get('RESUME_ENCRYPTION_KEY').encode())
            decrypted = fernet.decrypt(db_bytes).decode('utf-8')
            self.assertEqual(decrypted, self.session_data["resume_text"])

    def test_encryption_roundtrip_bulk_operations(self):
        """
        Tests that encryption applies correctly in bulk operations like bulk_create and update.
        """
        # Bulk Create
        sessions = [
            ResumeSession(
                user=self.user_a,
                resume_filename="file1.pdf",
                resume_text="Developer 1",
                job_role="Backend Developer",
                experience_level="Mid (3-5 years)"
            ),
            ResumeSession(
                user=self.user_a,
                resume_filename="file2.pdf",
                resume_text="Developer 2",
                job_role="Backend Developer",
                experience_level="Mid (3-5 years)"
            )
        ]
        ResumeSession.objects.bulk_create(sessions)
        
        # Verify bulk_created items decrypt properly
        db_sessions = ResumeSession.objects.filter(resume_filename__in=["file1.pdf", "file2.pdf"]).order_by('resume_filename')
        self.assertEqual(db_sessions[0].resume_text, "Developer 1")
        self.assertEqual(db_sessions[1].resume_text, "Developer 2")

        # Queryset Update
        ResumeSession.objects.filter(resume_filename="file1.pdf").update(resume_text="Updated Developer 1")
        
        # Verify updated item decrypts properly
        updated_session = ResumeSession.objects.get(resume_filename="file1.pdf")
        self.assertEqual(updated_session.resume_text, "Updated Developer 1")

    def test_serializer_presents_decrypted_text(self):
        """
        Tests that ResumeSessionSerializer exposes plain text string in resume_text,
        not base64 bytes representation.
        """
        session = ResumeSession.objects.create(
            user=self.user_a,
            resume_filename=self.session_data["resume_filename"],
            resume_text=self.session_data["resume_text"],
            job_role=self.session_data["job_role"],
            experience_level=self.session_data["experience_level"],
            status="ready"
        )
        serializer = ResumeSessionSerializer(session)
        # Serializer representation must match original plain text
        self.assertEqual(serializer.data['resume_text'], self.session_data["resume_text"])

    def test_permission_boundaries(self):
        """
        Verify that User A cannot view User B's sessions.
        """
        session_b = ResumeSession.objects.create(
            user=self.user_b,
            resume_filename="resume_b.pdf",
            resume_text="Secret profile info.",
            job_role="Full Stack Developer",
            experience_level="Senior (5+ years)",
            status="ready"
        )

        self.client.force_authenticate(user=self.user_a)
        
        # Attempt to read User B's session detail
        url = f"/api/sessions/{session_b.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_deletion_block_when_mock_in_progress(self):
        """
        Verify that deleting a session returns a 409 Conflict if an active mock interview is in progress.
        """
        session = ResumeSession.objects.create(
            user=self.user_a,
            resume_filename=self.session_data["resume_filename"],
            resume_text=self.session_data["resume_text"],
            job_role=self.session_data["job_role"],
            experience_level=self.session_data["experience_level"],
            status="ready"
        )
        
        # Create an in_progress MockInterview
        MockInterview.objects.create(
            session=session,
            user=self.user_a,
            question_count=5,
            question_mix="balanced",
            status="in_progress",
            question_order=[]
        )

        self.client.force_authenticate(user=self.user_a)
        
        url = f"/api/sessions/{session.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("mock interview is in progress", response.data['detail'])

    def test_daily_retention_cleanup_task(self):
        """
        Verify cleanup_old_sessions_task deletes sessions older than 30 days, keeping recent ones.
        """
        # Session A: Created 31 days ago
        session_old = ResumeSession.objects.create(
            user=self.user_a,
            resume_filename="old.pdf",
            resume_text="Very old text",
            job_role="Backend Developer",
            experience_level="Junior (1-3 years)"
        )
        # Update created_at using update to bypass auto_now_add
        ResumeSession.objects.filter(id=session_old.id).update(
            created_at=timezone.now() - timedelta(days=31)
        )

        # Session B: Created 1 day ago
        session_new = ResumeSession.objects.create(
            user=self.user_a,
            resume_filename="new.pdf",
            resume_text="Recent text",
            job_role="Backend Developer",
            experience_level="Junior (1-3 years)"
        )
        ResumeSession.objects.filter(id=session_new.id).update(
            created_at=timezone.now() - timedelta(days=1)
        )

        # Run Celery retention cleanup task
        cleanup_old_sessions_task()

        # Old session should be deleted, new session should remain
        self.assertFalse(ResumeSession.objects.filter(id=session_old.id).exists())
        self.assertTrue(ResumeSession.objects.filter(id=session_new.id).exists())
