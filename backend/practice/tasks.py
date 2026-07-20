import logging
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError

from .models import PracticeAttempt
from resume_sessions.llm import evaluate_practice_answer, LLMError, LLMRateLimitError

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def evaluate_practice_attempt_task(self, attempt_id, **kwargs):
    """
    Asynchronously evaluates a practice attempt answer, updating its score, feedback, and status.
    """
    from prepiq.middleware import _thread_locals
    
    # Propagate the request correlation ID to the Celery execution thread
    _thread_locals.request_id = kwargs.get('_request_id', '-')

    try:
        attempt = PracticeAttempt.objects.get(id=attempt_id)
    except PracticeAttempt.DoesNotExist:
        logger.error(f"PracticeAttempt with ID {attempt_id} does not exist.")
        return

    # Idempotency guard: do not re-evaluate completed attempts
    if attempt.status == 'completed':
        logger.warning(f"PracticeAttempt {attempt_id} is already completed. Skipping.")
        return

    question = attempt.question
    session = question.session

    try:
        feedback = evaluate_practice_answer(
            question_text=question.question_text,
            ideal_outline=question.ideal_answer_outline,
            user_answer=attempt.user_answer,
            job_role=session.job_role,
            experience_level=session.experience_level
        )
        attempt.score = feedback.get('score', 5)
        attempt.ai_feedback = feedback
        attempt.status = 'completed'
        attempt.save()
        logger.info(f"Evaluated practice attempt ID {attempt_id} for Question {question.id}.")
    except (LLMRateLimitError, LLMError) as exc:
        logger.warning(f"Temporary LLM failure evaluating practice attempt ID {attempt_id}: {str(exc)}. Retrying...")
        try:
            # Exponential backoff countdown: 4s, 8s, 16s
            countdown = min(2 ** (self.request.retries + 2), 30)
            self.retry(exc=exc, countdown=countdown)
        except MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for evaluating practice attempt ID {attempt_id}. Applying fallback score.")
            attempt.score = 5
            attempt.ai_feedback = {
                "score": 5,
                "strengths": ["Answer logged."],
                "missed_points": ["AI evaluation timed out. Default score of 5 applied."],
                "communication_quality": "Good",
                "improved_answer": "AI feedback failed."
            }
            attempt.status = 'completed'
            attempt.save()
    except Exception as e:
        logger.error(f"Unexpected error evaluating practice attempt ID {attempt_id}: {str(e)}", exc_info=e)
        attempt.status = 'failed'
        attempt.error_message = "AI evaluation failed. Please try again."
        attempt.save()
