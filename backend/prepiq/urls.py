from django.contrib import admin
from django.urls import path, include
from .views import live_check_view, ready_check_view, health_check_view

urlpatterns = [
    path('admin/', admin.site.url_pattern if hasattr(admin.site, 'url_pattern') else admin.site.urls),
    path('live/', live_check_view, name='liveness_check'),
    path('ready/', ready_check_view, name='readiness_check'),
    path('health/', health_check_view, name='health_check'),
    path('api/auth/', include('accounts.urls')),
    path('api/sessions/', include('resume_sessions.urls')),
    path('api/', include('practice.urls')),  # For /api/questions/{id}/...
    path('api/mock/', include('mock.urls')),
]

