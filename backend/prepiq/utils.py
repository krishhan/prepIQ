from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache
from rest_framework.exceptions import APIException
from rest_framework import status

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
    If CELERY_TASK_ALWAYS_EAGER is True, it runs in a background thread
    so it does not block the HTTP request-response cycle.
    Otherwise, it dispatches via Celery (.delay()).
    """
    from django.conf import settings
    import threading
    if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
        threading.Thread(target=task_func, args=args, kwargs=kwargs).start()
    else:
        task_func.delay(*args, **kwargs)
