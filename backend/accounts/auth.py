from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied

def dummy_get_response(request):
    return None

class JWTCookieAuthentication(JWTAuthentication):
    """
    Custom authentication class that reads the access token from cookies.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        raw_token = None
        from_cookie = False

        # Prefer Authorization header (Bearer token) over cookies.
        # If a Bearer token is present, use it directly — no CSRF needed.
        if header is not None:
            raw_token = self.get_raw_token(header)

        # Fall back to cookie only if no Authorization header was provided
        if raw_token is None:
            access_cookie_name = getattr(settings, 'JWT_COOKIE_ACCESS_NAME', 'access_token')
            if access_cookie_name in request.COOKIES:
                raw_token = request.COOKIES[access_cookie_name]
                from_cookie = True

        if raw_token is None:
            return None

        # Only enforce CSRF for state-mutating methods when auth came from cookie.
        # Bearer token requests never need CSRF (CSRF is a cookie-stealing attack).
        SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS', 'TRACE')
        if from_cookie and request.method not in SAFE_METHODS:
            self.enforce_csrf(request)

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, AuthenticationFailed) as e:
            raise AuthenticationFailed("Token is invalid or expired.")

    def enforce_csrf(self, request):
        """
        Enforce CSRF validation for cookie-based authentication.
        """
        # Save flag, then temporarily disable it so tests can verify CSRF behavior
        dont_enforce = getattr(request._request, '_dont_enforce_csrf_checks', False)
        request._request._dont_enforce_csrf_checks = False

        try:
            check = CSRFCheck(dummy_get_response)
            check.process_request(request)
            reason = check.process_view(request, None, (), {})
            if reason:
                raise PermissionDenied('CSRF Failed: %s' % reason)
        finally:
            # Restore the flag
            request._request._dont_enforce_csrf_checks = dont_enforce

def set_auth_cookies(response, access_token, refresh_token):
    """
    Helper function to set JWT access and refresh tokens as secure, httpOnly cookies on the response.
    """
    # Access token cookie settings
    access_cookie_name = getattr(settings, 'JWT_COOKIE_ACCESS_NAME', 'access_token')
    access_lifetime = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']
    
    # Refresh token cookie settings
    refresh_cookie_name = getattr(settings, 'JWT_COOKIE_REFRESH_NAME', 'refresh_token')
    refresh_lifetime = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
    
    secure = getattr(settings, 'JWT_COOKIE_SECURE', True)
    httponly = getattr(settings, 'JWT_COOKIE_HTTPONLY', True)
    samesite = getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax')

    # Set access token cookie
    response.set_cookie(
        access_cookie_name,
        access_token,
        max_age=int(access_lifetime.total_seconds()),
        expires=access_lifetime,
        secure=secure,
        httponly=httponly,
        samesite=samesite,
        path='/'
    )

    # Set refresh token cookie
    response.set_cookie(
        refresh_cookie_name,
        refresh_token,
        max_age=int(refresh_lifetime.total_seconds()),
        expires=refresh_lifetime,
        secure=secure,
        httponly=httponly,
        samesite=samesite,
        path='/'
    )

def clear_auth_cookies(response):
    """
    Helper function to clear authentication cookies from the client.
    """
    access_cookie_name = getattr(settings, 'JWT_COOKIE_ACCESS_NAME', 'access_token')
    refresh_cookie_name = getattr(settings, 'JWT_COOKIE_REFRESH_NAME', 'refresh_token')
    samesite = getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax')

    response.delete_cookie(access_cookie_name, path='/', samesite=samesite)
    response.delete_cookie(refresh_cookie_name, path='/', samesite=samesite)
