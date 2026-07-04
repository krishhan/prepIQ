import logging
from django.utils import timezone
from datetime import timedelta
from celery import shared_task
from django.core.management import call_command
from .models import ResumeSession, InterviewQuestion
from .llm import generate_interview_questions, LLMError, LLMRateLimitError

logger = logging.getLogger(__name__)

@shared_task
def generate_questions_task(session_id):
    """
    Background Celery task that parses the decrypted resume text, calls the OpenRouter
    integration to generate questions, and populates the database.
    """
    try:
        session = ResumeSession.objects.get(id=session_id)
    except ResumeSession.DoesNotExist:
        logger.error(f"ResumeSession with ID {session_id} does not exist.")
        return

    session.status = 'processing'
    session.save(update_fields=['status'])

    try:
        # Generate questions using the retry and fallback pipeline
        data = generate_interview_questions(
            resume_text=session.resume_text,
            job_role=session.job_role,
            experience_level=session.experience_level
        )
        
        # Save generated questions
        categories_data = data.get('categories', [])
        order_index = 0
        questions_to_create = []

        for category_data in categories_data:
            category_name = category_data.get('name')
            questions_list = category_data.get('questions', [])
            
            for q_data in questions_list:
                # Map to target choices if needed
                category_mapping = {
                    'Technical Questions': 'Technical',
                    'Project-Based Questions': 'Project-Based',
                    'Behavioral Questions': 'Behavioral',
                    'Role-Specific Conceptual Questions': 'Role-Specific'
                }
                category = category_mapping.get(category_name, category_name)

                # Ideal answer outline validation: ensure list of 3 strings
                outline = q_data.get('ideal_answer_outline', [])
                if not isinstance(outline, list):
                    outline = [str(outline)]
                while len(outline) < 3:
                    outline.append("N/A")
                outline = outline[:3]

                questions_to_create.append(
                    InterviewQuestion(
                        session=session,
                        category=category,
                        question_text=q_data.get('question', ''),
                        difficulty=q_data.get('difficulty', 'Medium'),
                        why_asked=q_data.get('why_asked', ''),
                        ideal_answer_outline=outline,
                        order_index=order_index
                    )
                )
                order_index += 1

        # Atomically save all questions in the DB
        InterviewQuestion.objects.bulk_create(questions_to_create)
        
        # Update session status
        session.status = 'ready'
        session.save(update_fields=['status'])
        logger.info(f"Successfully generated questions for Session {session_id}")

    except LLMRateLimitError as e:
        session.status = 'failed'
        session.error_message = f"OpenRouter API rate limit reached: {str(e)}"
        session.save(update_fields=['status', 'error_message'])
        logger.error(f"Rate limit failed questions generation for Session {session_id}: {str(e)}")

    except Exception as e:
        session.status = 'failed'
        session.error_message = f"Failed to generate questions: {str(e)}"
        session.save(update_fields=['status', 'error_message'])
        logger.error(f"Failed questions generation for Session {session_id}: {str(e)}")


@shared_task
def cleanup_old_sessions_task():
    """
    Daily Celery beat task that deletes ResumeSessions and cascading child items
    older than 30 days, measured from ResumeSession.created_at.
    """
    threshold = timezone.now() - timedelta(days=30)
    old_sessions = ResumeSession.objects.filter(created_at__lt=threshold)
    count = old_sessions.count()
    old_sessions.delete()
    logger.info(f"Cleaned up {count} old sessions created before {threshold}")


@shared_task
def flush_expired_tokens_task():
    """
    Daily Celery beat task that flushes expired simplejwt tokens to prevent DB bloat.
    """
    try:
        call_command('flushexpiredtokens')
        logger.info("Successfully flushed expired SimpleJWT tokens.")
    except Exception as e:
        logger.error(f"Failed to flush expired tokens: {str(e)}")
