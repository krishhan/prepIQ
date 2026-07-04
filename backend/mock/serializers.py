from rest_framework import serializers
from .models import MockInterview, MockAnswer
from resume_sessions.serializers import InterviewQuestionSerializer

class MockInterviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockInterview
        fields = (
            'id', 'session', 'question_count', 'question_mix', 'time_limit_per_question',
            'status', 'error_message', 'question_order', 'current_question_index',
            'overall_score', 'hiring_recommendation', 'full_report', 'started_at', 'completed_at'
        )
        read_only_fields = ('id', 'status', 'error_message', 'overall_score', 'hiring_recommendation', 'full_report', 'started_at', 'completed_at')

class MockAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockAnswer
        fields = (
            'id', 'mock_interview', 'question', 'user_answer', 'was_skipped',
            'was_timed_out', 'time_taken_seconds', 'per_question_score',
            'per_question_feedback', 'submitted_at'
        )
        read_only_fields = ('id', 'per_question_score', 'per_question_feedback', 'submitted_at')

from resume_sessions.models import InterviewQuestion

class InterviewQuestionMockSerializer(serializers.ModelSerializer):
    """
    Special question serializer for active mocks that hides 'ideal_answer_outline' and 'why_asked'.
    """
    class Meta:
        model = InterviewQuestion
        fields = ('id', 'category', 'question_text', 'difficulty', 'order_index')
