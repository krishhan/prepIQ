from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.url_pattern if hasattr(admin.site, 'url_pattern') else admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/sessions/', include('resume_sessions.urls')),
    path('api/', include('practice.urls')),  # For /api/questions/{id}/...
    path('api/mock/', include('mock.urls')),
]
