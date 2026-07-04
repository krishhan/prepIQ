from rest_framework import serializers
from .models import ResumeSession, InterviewQuestion

class EncryptedCharField(serializers.CharField):
    """
    Serializer field that ensures the encrypted database column is presented to DRF as a readable plain text string,
    preventing auto-generation from treating it as raw base64 or binary data.
    """
    def to_representation(self, value):
        # The database model field decrypts values automatically to strings, but we cast to be safe.
        return str(value) if value is not None else ""

    def to_internal_value(self, data):
        return str(data)

class ResumeSessionSerializer(serializers.ModelSerializer):
    resume_text = EncryptedCharField(required=False, allow_blank=True)
    question_count = serializers.SerializerMethodField()
    best_mock_score = serializers.SerializerMethodField()

    class Meta:
        model = ResumeSession
        fields = (
            'id', 'resume_filename', 'resume_text', 'job_role', 'experience_level',
            'status', 'error_message', 'created_at', 'question_count', 'best_mock_score'
        )
        read_only_fields = ('id', 'status', 'error_message', 'created_at')

    def get_question_count(self, obj):
        if hasattr(obj, 'annotated_question_count'):
            return obj.annotated_question_count
        return obj.questions.count()

    def get_best_mock_score(self, obj):
        if hasattr(obj, 'annotated_best_mock_score'):
            score = obj.annotated_best_mock_score
            return score if score is not None else 0
        from django.db.models import Max
        score = obj.mocks.filter(status='completed').aggregate(Max('overall_score'))['overall_score__max']
        return score if score is not None else 0

class InterviewQuestionSerializer(serializers.ModelSerializer):
    confidence = serializers.SerializerMethodField()

    class Meta:
        model = InterviewQuestion
        fields = ('id', 'category', 'question_text', 'difficulty', 'why_asked', 'ideal_answer_outline', 'order_index', 'confidence')
        read_only_fields = ('id',)

    def get_confidence(self, obj):
        if hasattr(obj, 'user_confidence'):
            confs = obj.user_confidence
            if confs:
                return confs[0].level
            return 'not_practiced'

        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from practice.models import QuestionConfidence
            conf = QuestionConfidence.objects.filter(question=obj, user=request.user).first()
            if conf:
                return conf.level
        return 'not_practiced'
