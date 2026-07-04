import logging
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

def live_check_view(request):
    """
    Liveness probe: Confirms only that the Django server is online and accepting connections.
    Intentionally avoids querying backing services (DB, Redis) to prevent cascading timeouts.
    """
    return JsonResponse({
        "status": "ok",
        "timestamp": timezone.now().isoformat()
    }, status=200)

def ready_check_view(request):
    """
    Readiness probe: Verifies that required backing resources (PostgreSQL & Redis)
    are reachable, indicating the application is ready to handle user traffic.
    """
    # 1. PostgreSQL check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as e:
        logger.critical("Readiness check failure: database is unreachable. Error: %s", str(e))
        return JsonResponse({"status": "unready", "reason": "Database unreachable"}, status=503)

    # 2. Redis Cache check
    try:
        cache.set("readiness_ping", True, timeout=5)
        if not cache.get("readiness_ping"):
            raise ValueError("Cache did not return the written test key.")
    except Exception as e:
        logger.critical("Readiness check failure: cache (Redis) is unreachable. Error: %s", str(e))
        return JsonResponse({"status": "unready", "reason": "Cache unreachable"}, status=503)

    return JsonResponse({"status": "ready"}, status=200)

def health_check_view(request):
    """
    Lightweight health endpoint: Returns status parameters of backing dependencies
    without performing expensive or blocking diagnostic inspections (like worker pinging).
    """
    health = {
        "status": "healthy",
        "database": "connected",
        "cache": "connected",
        "timestamp": timezone.now().isoformat()
    }
    status_code = 200

    # 1. Database check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as e:
        health["database"] = "disconnected"
        health["status"] = "unhealthy"
        status_code = 503
        logger.error("Health check failure: database error: %s", str(e))

    # 2. Cache check
    try:
        cache.set("health_ping", True, timeout=5)
        if not cache.get("health_ping"):
            raise ValueError("Cache read verification failed")
    except Exception as e:
        health["cache"] = "disconnected"
        health["status"] = "unhealthy"
        status_code = 503
        logger.error("Health check failure: cache error: %s", str(e))

    return JsonResponse(health, status=status_code)
