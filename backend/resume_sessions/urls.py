from django.urls import path
from .views import (
    ResumeSessionListView,
    ResumeSessionDetailView,
    ResumeSessionStatusView,
    SessionQuestionsListView
)
from mock.views import MockInterviewSetupView, SessionMockListView

urlpatterns = [
    path('', ResumeSessionListView.as_view(), name='sessions-list'),
    path('<int:pk>/', ResumeSessionDetailView.as_view(), name='sessions-detail'),
    path('<int:pk>/status/', ResumeSessionStatusView.as_view(), name='sessions-status'),
    path('<int:pk>/questions/', SessionQuestionsListView.as_view(), name='sessions-questions'),
    
    # Session-linked Mock routes
    path('<int:session_pk>/mock/', MockInterviewSetupView.as_view(), name='session-mock-create'),
    path('<int:session_pk>/mocks/', SessionMockListView.as_view(), name='session-mock-list'),
]
