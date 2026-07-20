from django.urls import path
from .views import QuestionConfidenceView, PracticeAttemptView, PracticeAttemptHistoryView, PracticeAttemptStatusView

urlpatterns = [
    path('questions/<int:pk>/confidence/', QuestionConfidenceView.as_view(), name='question-confidence'),
    path('questions/<int:pk>/practice/', PracticeAttemptView.as_view(), name='question-practice'),
    path('questions/<int:pk>/attempts/', PracticeAttemptHistoryView.as_view(), name='question-attempts'),
    path('questions/attempts/<int:pk>/status/', PracticeAttemptStatusView.as_view(), name='practice-attempt-status'),
]
