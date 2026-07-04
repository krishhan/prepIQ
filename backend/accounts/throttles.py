from rest_framework.throttling import SimpleRateThrottle

class LoginSignupThrottle(SimpleRateThrottle):
    """
    Limits the rate of login and signup requests from a single IP to 5 per minute.
    """
    scope = 'login_signup'
    rate = '5/min'

    def get_cache_key(self, request, view):
        # Identify requester by IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')

        return self.cache_format % {
            'scope': self.scope,
            'ident': ip
        }
