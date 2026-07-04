from django.urls import path
from .views import (
    MockInterviewDetailView,
    MockAnswerSubmitView,
    MockInterviewSkipView,
    MockInterviewCompleteView,
    MockInterviewStatusView,
    MockInterviewReportView
)

urlpatterns = [
    path('<int:pk>/', MockInterviewDetailView.as_view(), name='mock-detail'),
    path('<int:pk>/answer/', MockAnswerSubmitView.as_view(), name='mock-answer'),
    path('<int:pk>/skip/', MockInterviewSkipView.as_view(), name='mock-skip'),
    path('<int:pk>/complete/', MockInterviewCompleteView.as_view(), name='mock-complete'),
    path('<int:pk>/status/', MockInterviewStatusView.as_view(), name='mock-status'),
    path('<int:pk>/report/', MockInterviewReportView.as_view(), name='mock-report'),
]
