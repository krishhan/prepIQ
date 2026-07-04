import logging
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework.exceptions import APIException
from rest_framework import status
from prepiq.middleware import get_current_request_id, _thread_locals

logger = logging.getLogger(__name__)

class RateLimitExceeded(APIException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = "Rate limit exceeded."
    default_code = "rate_limit_exceeded"

def check_rate_limit_and_lock(user, limit_type, limit_count, model_class):
    """
    Checks the rolling 24-hour rate limit and acquires a concurrency lock.
    """
    user_id = user.id
    lock_key = f"lock_{user_id}_{limit_type}"
    
    # 1. Attempt to acquire the cache-based lock (non-blocking, atomic)
    if not cache.add(lock_key, True, timeout=10):
        raise RateLimitExceeded("Another request is currently processing. Please try again in a few seconds.")
        
    try:
        # 2. Check the rolling 24-hour limit
        time_threshold = timezone.now() - timedelta(days=1)
        
        # Performance/Database Optimization:
        # Use primary key sorting or direct filtering without filesort.
        if limit_type == 'mock':
            count = model_class.objects.filter(user=user, started_at__gte=time_threshold).count()
        else:
            count = model_class.objects.filter(user=user, created_at__gte=time_threshold).count()
            
        if count >= limit_count:
            # Release lock immediately if rate limit is exceeded
            cache.delete(lock_key)
            raise RateLimitExceeded(f"Daily limit reached. You can only create {limit_count} {limit_type}s per 24 hours.")
    except Exception:
        # Ensure we release lock on any exception during verification
        cache.delete(lock_key)
        raise

def release_lock(user, limit_type):
    """
    Manually releases the concurrency cache lock.
    """
    lock_key = f"lock_{user.id}_{limit_type}"
    cache.delete(lock_key)

def dispatch_task(task_func, *args, **kwargs):
    """
    Helper to dispatch a Celery task asynchronously.
    Attaches the current request correlation ID to kwargs to preserve observability context.
    If running tests, executes synchronously in the same thread to maintain transaction isolation.
    """
    from django.conf import settings
    import threading
    import sys

    # Propagate the request correlation ID to Celery task
    kwargs['_request_id'] = get_current_request_id()

    # Determine if we are running in Django test mode
    is_testing = 'test' in sys.argv or 'test_coverage' in sys.argv

    if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
        if is_testing:
            # Execute synchronously in the same thread during tests to avoid SQLite database locks
            _thread_locals.request_id = kwargs.get('_request_id', '-')
            task_func(*args, **kwargs)
        else:
            # Local development background thread fallback
            def thread_wrapper():
                _thread_locals.request_id = kwargs.get('_request_id', '-')
                task_func(*args, **kwargs)
            threading.Thread(target=thread_wrapper).start()
    else:
        task_func.delay(*args, **kwargs)

def custom_exception_handler(exc, context):
    """
    SaaS standard custom exception handler to format error responses consistently,
    prevent stack trace leak on 500s, and log failures with request tracing IDs.
    """
    response = exception_handler(exc, context)

    # If it is a DRF-handled exception (ValidationError, PermissionDenied, etc.)
    if response is not None:
        # Log authentication failures or client issues safely
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            logger.warning("Authentication failure: %s", str(exc))
        elif response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            logger.warning("Throttled/Rate limit exceeded: %s", str(exc))
        return response

    # Handle all unhandled exceptions (database errors, runtime faults, coding bugs)
    request_id = get_current_request_id()
    logger.error("Unhandled Exception [req_id: %s] encountered: %s", request_id, str(exc), exc_info=exc)

    # In production, never return raw traceback detail to user
    return Response(
        {"detail": "An internal server error occurred. Please try again later."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
