from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class MockInterview(models.Model):
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
        ('failed', 'Failed'),
    ]
    HIRING_RECOMMENDATION_CHOICES = [
        ('Strong Yes', 'Strong Yes'),
        ('Yes', 'Yes'),
        ('Maybe', 'Maybe'),
        ('No', 'No'),
    ]
    session = models.ForeignKey('resume_sessions.ResumeSession', on_delete=models.CASCADE, related_name='mocks')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    question_count = models.IntegerField()  # 5, 10, 20
    question_mix = models.CharField(max_length=20)  # balanced, technical, behavioral
    time_limit_per_question = models.IntegerField(null=True, blank=True)  # in seconds (e.g. 120, 180, or null)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    error_message = models.TextField(blank=True, null=True)
    question_order = models.JSONField(blank=True, default=list)  # list of InterviewQuestion IDs
    current_question_index = models.IntegerField(default=0)
    question_started_at = models.DateTimeField(null=True, blank=True)  # Timestamp when current question started
    overall_score = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        null=True,
        blank=True
    )
    hiring_recommendation = models.CharField(
        max_length=20,
        choices=HIRING_RECOMMENDATION_CHOICES,
        null=True,
        blank=True
    )
    full_report = models.JSONField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.email} - Mock {self.id} - {self.status}"

class MockAnswer(models.Model):
    mock_interview = models.ForeignKey(MockInterview, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey('resume_sessions.InterviewQuestion', on_delete=models.CASCADE)
    user_answer = models.TextField(blank=True)
    was_skipped = models.BooleanField(default=False)
    was_timed_out = models.BooleanField(default=False)
    time_taken_seconds = models.IntegerField(default=0)
    per_question_score = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        null=True,
        blank=True
    )
    per_question_feedback = models.JSONField(null=True, blank=True)  # keys: score, strengths, missed_points, communication_quality, improved_answer
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('mock_interview', 'question')

    def __str__(self):
        return f"Mock {self.mock_interview.id} - Q{self.question.id} - Score: {self.per_question_score}"
