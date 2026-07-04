from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    total_sessions = serializers.SerializerMethodField()
    total_mocks = serializers.SerializerMethodField()
    avg_mock_score = serializers.SerializerMethodField()
    best_mock_score = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'total_sessions', 'total_mocks', 'avg_mock_score', 'best_mock_score')
        read_only_fields = ('id', 'email')

    def get_total_sessions(self, obj):
        return obj.sessions.count()

    def get_total_mocks(self, obj):
        from mock.models import MockInterview
        return MockInterview.objects.filter(user=obj).count()

    def get_avg_mock_score(self, obj):
        from mock.models import MockInterview
        from django.db.models import Avg
        avg = MockInterview.objects.filter(user=obj, status='completed').aggregate(Avg('overall_score'))['overall_score__avg']
        return round(avg, 1) if avg is not None else 0

    def get_best_mock_score(self, obj):
        from mock.models import MockInterview
        from django.db.models import Max
        best = MockInterview.objects.filter(user=obj, status='completed').aggregate(Max('overall_score'))['overall_score__max']
        return best if best is not None else 0

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ('email', 'name', 'password')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            name=validated_data.get('name', ''),
            password=validated_data['password']
        )
        return user
