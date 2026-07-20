from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class QuestionConfidence(models.Model):
    LEVEL_CHOICES = [
        ('not_practiced', 'Not Practiced'),
        ('needs_work', 'Needs Work'),
        ('confident', 'Confident'),
    ]
    question = models.ForeignKey('resume_sessions.InterviewQuestion', on_delete=models.CASCADE, related_name='confidences')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='not_practiced')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('question', 'user')

    def __str__(self):
        return f"{self.user.email} - Q{self.question.id} - {self.level}"

class PracticeAttempt(models.Model):
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    question = models.ForeignKey('resume_sessions.InterviewQuestion', on_delete=models.CASCADE, related_name='attempts')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    user_answer = models.TextField()
    score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], null=True, blank=True)
    ai_feedback = models.JSONField(blank=True, null=True, default=None)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - Q{self.question.id} - Status: {self.status}"
