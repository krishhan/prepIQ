from rest_framework import serializers
from .models import QuestionConfidence, PracticeAttempt

class QuestionConfidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionConfidence
        fields = ('id', 'question', 'level', 'updated_at')
        read_only_fields = ('id', 'question', 'updated_at')

class PracticeAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticeAttempt
        fields = ('id', 'question', 'user_answer', 'score', 'ai_feedback', 'status', 'error_message', 'created_at')
        read_only_fields = ('id', 'question', 'score', 'ai_feedback', 'status', 'error_message', 'created_at')
