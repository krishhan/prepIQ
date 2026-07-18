from django.conf import settings
from django.middleware.csrf import get_token
from django.contrib.auth import get_user_model, authenticate
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserSerializer, SignupSerializer
from .auth import set_auth_cookies, clear_auth_cookies
from .throttles import LoginSignupThrottle

User = get_user_model()

class CSRFTokenView(APIView):
    """
    Endpoint that sets the CSRF token cookie and returns it in the JSON body.
    """
    permission_classes = [AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        token = get_token(request)
        return Response({"csrfToken": token}, status=status.HTTP_200_OK)

class SignupView(APIView):
    """
    Handles user registration. Logs the user in automatically by setting JWT cookies.
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginSignupThrottle]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            data = UserSerializer(user).data

            response = Response(data, status=status.HTTP_201_CREATED)
            set_auth_cookies(response, access_token, refresh_token)
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    """
    Authenticates user and sets JWT cookies.
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginSignupThrottle]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, email=email, password=password)
        if user is not None:
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            data = UserSerializer(user).data

            response = Response(data, status=status.HTTP_200_OK)
            set_auth_cookies(response, access_token, refresh_token)
            return response
        
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED
        )

class LogoutView(APIView):
    """
    Blacklists the active refresh token and clears authentication cookies.
    """
    permission_classes = [AllowAny]  # Allow anonymous or authenticated to clear cookies

    def post(self, request):
        refresh_cookie_name = getattr(settings, 'JWT_COOKIE_REFRESH_NAME', 'refresh_token')
        refresh_token = request.COOKIES.get(refresh_cookie_name)
        
        # Blacklist the refresh token if it exists
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # If token is already invalid, expired or blacklisted, ignore
                pass

        response = Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        clear_auth_cookies(response)
        return response

class TokenRefreshCookieView(APIView):
    """
    Reads the refresh token from cookies, rotates it, and updates cookies.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_cookie_name = getattr(settings, 'JWT_COOKIE_REFRESH_NAME', 'refresh_token')
        refresh_token = request.COOKIES.get(refresh_cookie_name)
        
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is missing."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            user_id = token.payload.get('user_id')
            user = User.objects.get(id=user_id)
            
            # Create a new refresh token and access token (Refresh token rotation)
            new_token = RefreshToken.for_user(user)
            
            # Blacklist the old refresh token
            try:
                token.blacklist()
            except Exception:
                pass
            
            response = Response({"detail": "Token refreshed successfully."}, status=status.HTTP_200_OK)
            set_auth_cookies(response, str(new_token.access_token), str(new_token))
            return response
        except Exception:
            # If the refresh token is invalid or expired, clear cookies and deny
            response = Response(
                {"detail": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED
            )
            clear_auth_cookies(response)
            return response

class UserProfileView(APIView):
    """
    Retrieves the authenticated user's profile details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
