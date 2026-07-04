# PrepIQ - Production Grade AI Interview Coach

PrepIQ is an AI-powered SaaS application designed to help candidates prepare for interviews. By analyzing text-based PDF resumes, the platform generates a custom bank of interview questions tailored to the candidate's target job role and experience level. Candidates can practice individual questions or simulate realistic mock interviews under pressure.

---

## 1. System Architecture

The project consists of a modern, decoupled three-tier architecture:

```mermaid
graph TD
    Client[Next.js Client App] -->|HTTPS Requests| API[Django REST API]
    API -->|Session & Auth Data| PostgreSQL[(PostgreSQL Database)]
    API -->|Queue Tasks| Redis[(Redis Message Broker)]
    Celery[Celery Background Workers] -->|Listen/Poll| Redis
    Celery -->|Read/Write Session Data| PostgreSQL
    Celery -->|Evaluate Text Responses| OpenRouter[OpenRouter AI Provider]
```

### Back-End Tech Stack
- **Web Framework**: Django & Django REST Framework (DRF)
- **Task Queue**: Celery (using Redis as broker)
- **Database**: PostgreSQL (or local SQLite for dev)
- **Authentication**: JWT Cookies (using `django-rest-framework-simplejwt`)
- **Encryption**: AES-256 via Fernet tokens for secure resume storage at rest

### Front-End Tech Stack
- **Framework**: Next.js 15+ (App Router, Tailwind CSS, TypeScript)
- **Icons**: Lucide React
- **API Client**: Axios with automated response interceptors for JWT cookie rotation

---

## 2. Environment Variables & Setup

Create a `.env` file in the `backend/` directory:

```env
# Core Django Config
DEBUG=False
SECRET_KEY=your_django_production_secret_key
DATABASE_URL=postgresql://user:password@host:port/dbname
ALLOWED_HOSTS=yourdomain.com,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000

# Security Redirects (Set to False if reverse proxy terminates SSL)
SECURE_SSL_REDIRECT=True

# Database Encryption
RESUME_ENCRYPTION_KEY=your_fernet_256bit_key

# Celery & Caching
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_BEAT_ENABLED=True

# AI Integrations (Optional on boot, required for AI runs)
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 3. Production Deployment Guide

### Deploying the Backend (API & Celery)
1. **Migrations**: Ensure migrations run on startup:
   ```bash
   python manage.py migrate
   ```
2. **Collect Static**: Gather administrative static assets:
   ```bash
   python manage.py collectstatic --noinput
   ```
3. **Web Worker (Gunicorn)**:
   ```bash
   gunicorn prepiq.wsgi:application --bind 0.0.0.0:8000
   ```
4. **Celery Task Worker**:
   ```bash
   celery -A prepiq worker --loglevel=info
   ```
5. **Celery Beat Worker**: (Required for daily database cleanup tasks)
   Ensure `CELERY_BEAT_ENABLED=True` is defined in settings, and launch:
   ```bash
   celery -A prepiq beat --loglevel=info
   ```

### Deploying the Frontend
Build the Next.js application for optimized static HTML generation:
```bash
npm run build
npm run start
```

---

## 4. API Documentation

### Authentication Routes (`/api/auth/`)
- `GET  /api/auth/csrf/` - Sets ensure CSRF token cookie.
- `POST /api/auth/signup/` - Registers a new user. Set JWT HTTPOnly cookies.
- `POST /api/auth/login/` - Authenticates user.
- `POST /api/auth/logout/` - Clears authentication cookies and blacklists active tokens.
- `POST /api/auth/refresh/` - Rotates refresh tokens to issue new access tokens.
- `GET  /api/auth/me/` - Retrieves active profile details.

### Resume Sessions (`/api/sessions/`)
- `GET  /api/sessions/` - List user resume sessions.
- `POST /api/sessions/` - Upload PDF resume, parse layout, and trigger AI processing.
- `GET  /api/sessions/<id>/status/` - Poll processing status (`processing`, `ready`, `failed`).
- `GET  /api/sessions/<id>/questions/` - List generated practice bank questions.

### Mock Interviews (`/api/mock/`)
- `POST /api/sessions/<id>/mock/` - Prepares a mock interview.
- `GET  /api/mock/<id>/` - Load active questions order and interview parameters.
- `POST /api/mock/<id>/answer/` - Submit answer response (initiates asynchronous AI grading).
- `POST /api/mock/<id>/skip/` - Record skipped questions.
- `POST /api/mock/<id>/complete/` - Finish interview (aggregates scores to generate final report).
- `GET  /api/mock/<id>/report/` - Fetch final performance scorecard.

---

## 5. Troubleshooting & Diagnostics

- **Infinite Redirect Loops**: If your app gets stuck in a redirect loop, it's likely because your host (e.g. Render, Railway, Vercel) terminates SSL before forwarding to Django. In your environment variables, set `SECURE_SSL_REDIRECT=False`.
- **Hanging Processing Statuses**: If mock interviews or resume processing gets stuck in `processing`:
  1. Confirm your Celery worker is active and listening to Redis.
  2. Inspect task logs.
  3. The API includes a self-healing trigger: querying the `/status/` endpoint of a stuck item will automatically re-dispatch the grading task if it was dropped.
- **Observability Tracing**: All API logs include a `[req_id: <UUID>]` prefix. Every request response includes a corresponding `X-Request-ID` header. If a user encounters a failure, match the response header with the server stdout logs to locate the exact traceback.