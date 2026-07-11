import os
import sys
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(os.path.join(BASE_DIR, '.env'), override=True)

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/

DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# Essential Environment Validation (Fail-Fast Startup)
if not DEBUG:
    missing_keys = []
    if not os.environ.get('SECRET_KEY'):
        missing_keys.append('SECRET_KEY')
    if not os.environ.get('RESUME_ENCRYPTION_KEY'):
        missing_keys.append('RESUME_ENCRYPTION_KEY')
    if not os.environ.get('DATABASE_URL'):
        missing_keys.append('DATABASE_URL')
    if missing_keys:
        raise ImproperlyConfigured(
            f"FATAL: Missing essential environment variables for production: {', '.join(missing_keys)}"
        )

# Optional Integration validation
if not os.environ.get('OPENROUTER_API_KEY'):
    print(
        "WARNING: 'OPENROUTER_API_KEY' is missing in the environment. "
        "AI evaluations and question generation features will be unavailable.",
        file=sys.stderr
    )

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-default-secret-key-12345')

ALLOWED_HOSTS = [
    host.strip() for host in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if host.strip()
]

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_celery_results',
    
    # Local apps
    'accounts',
    'resume_sessions',
    'practice',
    'mock',
]

MIDDLEWARE = [
    'prepiq.middleware.CorrelationIdMiddleware',  # CorrelationIdMiddleware first for trace id matching
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'prepiq.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'prepiq.wsgi.application'

# Database configuration
# PostgreSQL fallback for production (unquoted safely), SQLite for local dev
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    import urllib.parse as urlparse
    url = urlparse.urlparse(DATABASE_URL)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': urlparse.unquote(url.path[1:]) if url.path else '',
            'USER': urlparse.unquote(url.username) if url.username else '',
            'PASSWORD': urlparse.unquote(url.password) if url.password else '',
            'HOST': url.hostname,
            'PORT': url.port,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static & Media files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.auth.JWTCookieAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'EXCEPTION_HANDLER': 'prepiq.utils.custom_exception_handler',
}

# Simple JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# JWT Cookie Settings
JWT_COOKIE_ACCESS_NAME = 'access_token'
JWT_COOKIE_REFRESH_NAME = 'refresh_token'
JWT_COOKIE_SECURE = not DEBUG  # True in production (HTTPS required)
JWT_COOKIE_HTTPONLY = True     # Prevent JS access
JWT_COOKIE_SAMESITE = 'Lax' if DEBUG else 'None'

# CORS Configuration
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    origin.strip() for origin in os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',') if origin.strip()
]

# CSRF Cookie Settings (exposed to frontend to read and send as X-CSRFToken)
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax' if DEBUG else 'None'
CSRF_COOKIE_SECURE = not DEBUG
CSRF_TRUSTED_ORIGINS = [
    origin.strip() for origin in os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',') if origin.strip()
]

# Production Security Settings (SSL/HTTPS/HSTS)
if not DEBUG:
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'True').lower() == 'true'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    
    # HSTS headers
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    
    # MIME Sniffing & Framing
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_REFERRER_POLICY = 'origin-when-cross-origin'

# Encryption Key
RESUME_ENCRYPTION_KEY = os.environ.get('RESUME_ENCRYPTION_KEY', 'R6a3bvE_noMXZAHtrNPaNsKLq_3KUKVmztctWhZ6im4=')

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = 'django-db'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Eager Fallback if Redis is not running (local development only)
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = False

if DEBUG:
    import urllib.parse as urlparse
    parsed_broker = urlparse.urlparse(CELERY_BROKER_URL)
    if parsed_broker.scheme in ('redis', 'rediss'):
        broker_host = parsed_broker.hostname or 'localhost'
        broker_port = parsed_broker.port or 6379
        
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        try:
            s.connect((broker_host, broker_port))
            s.close()
        except (socket.error, ConnectionRefusedError):
            CELERY_TASK_ALWAYS_EAGER = True
            CELERY_TASK_EAGER_PROPAGATES = True

# Conditional Celery Beat Schedules
CELERY_BEAT_ENABLED = os.environ.get('CELERY_BEAT_ENABLED', 'False').lower() == 'true'
if CELERY_BEAT_ENABLED:
    from celery.schedules import crontab
    CELERY_BEAT_SCHEDULE = {
        'cleanup-old-sessions': {
            'task': 'resume_sessions.tasks.cleanup_old_sessions_task',
            'schedule': crontab(hour=0, minute=0),
        },
        'flush-expired-tokens': {
            'task': 'resume_sessions.tasks.flush_expired_tokens_task',
            'schedule': crontab(hour=1, minute=0),
        },
    }
else:
    CELERY_BEAT_SCHEDULE = {}

# OpenRouter Settings
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'meta-llama/llama-3.1-8b-instruct:free')
OPENROUTER_FALLBACK_MODEL = os.environ.get('OPENROUTER_FALLBACK_MODEL', 'google/gemma-2-9b-it:free')

# Structured Verbose Traceable Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'correlation_id_filter': {
            '()': 'prepiq.middleware.CorrelationIdFilter',
        },
    },
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} [req_id: {request_id}] {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'filters': ['correlation_id_filter'],
            'formatter': 'verbose' if not DEBUG else 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING' if not DEBUG else 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR' if not DEBUG else 'INFO',
            'propagate': False,
        },
        'accounts': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'resume_sessions': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'practice': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'mock': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
