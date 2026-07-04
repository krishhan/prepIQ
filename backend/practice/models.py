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
    question = models.ForeignKey('resume_sessions.InterviewQuestion', on_delete=models.CASCADE, related_name='attempts')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    user_answer = models.TextField()
    score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    ai_feedback = models.JSONField(blank=True, default=dict)  # keys: score, strengths, missed_points, communication_quality, improved_answer
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - Q{self.question.id} - Score: {self.score}/10"
