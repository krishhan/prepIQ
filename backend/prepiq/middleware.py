import uuid
import logging
from threading import local

_thread_locals = local()

def get_current_request_id():
    """
    Retrieves the request/correlation ID for the current thread execution.
    """
    return getattr(_thread_locals, 'request_id', '-')

class CorrelationIdMiddleware:
    """
    Django middleware to inject X-Request-ID / X-Correlation-ID headers
    into thread locals and attach them to outgoing HTTP responses for log tracing.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Extract request ID from common correlation headers or generate a fresh UUID
        request_id = request.headers.get('X-Request-ID') or request.headers.get('X-Correlation-ID')
        if not request_id:
            request_id = str(uuid.uuid4())

        # Store request ID in thread-local storage for reference by the logging filter
        _thread_locals.request_id = request_id
        request.request_id = request_id

        response = self.get_response(request)

        # Propagate request ID back to client via header
        response['X-Request-ID'] = request_id
        return response

class CorrelationIdFilter(logging.Filter):
    """
    Logging filter that injects the current request correlation ID into the log record.
    """
    def filter(self, record):
        record.request_id = get_current_request_id()
        return True
