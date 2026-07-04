from django.db import models
from django.conf import settings
from .fields import EncryptedTextField

class ResumeSession(models.Model):
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('failed', 'Failed'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions')
    resume_filename = models.CharField(max_length=255)
    # EncryptedTextField stores the encrypted resume content
    resume_text = EncryptedTextField()
    job_role = models.CharField(max_length=100)
    experience_level = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"{self.user.email} - {self.job_role} ({self.experience_level})"

class InterviewQuestion(models.Model):
    CATEGORY_CHOICES = [
        ('Technical', 'Technical Questions'),
        ('Project-Based', 'Project-Based Questions'),
        ('Behavioral', 'Behavioral Questions'),
        ('Role-Specific', 'Role-Specific Conceptual Questions'),
    ]
    session = models.ForeignKey(ResumeSession, on_delete=models.CASCADE, related_name='questions')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    question_text = models.TextField()
    difficulty = models.CharField(max_length=20)  # Easy, Medium, Hard
    why_asked = models.TextField()
    ideal_answer_outline = models.JSONField(blank=True, default=list)  # list of 3 strings
    order_index = models.IntegerField(default=0)

    class Meta:
        unique_together = ('session', 'order_index')
        ordering = ['order_index']

    def __str__(self):
        return f"{self.category} - {self.difficulty} (Q {self.order_index})"
