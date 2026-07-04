from django.urls import path
from .views import CSRFTokenView, SignupView, LoginView, LogoutView, TokenRefreshCookieView, UserProfileView

urlpatterns = [
    path('csrf/', CSRFTokenView.as_view(), name='auth-csrf'),
    path('signup/', SignupView.as_view(), name='auth-signup'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('refresh/', TokenRefreshCookieView.as_view(), name='auth-refresh'),
    path('me/', UserProfileView.as_view(), name='auth-me'),
]
