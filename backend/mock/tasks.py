import logging
from django.utils import timezone
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError

from .models import MockInterview, MockAnswer
from resume_sessions.llm import evaluate_practice_answer, generate_overall_report

logger = logging.getLogger(__name__)

@shared_task
def evaluate_mock_answer_task(mock_answer_id):
    """
    Asynchronously evaluates a mock answer, updating its score and feedback.
    """
    try:
        mock_answer = MockAnswer.objects.get(id=mock_answer_id)
    except MockAnswer.DoesNotExist:
        logger.error(f"MockAnswer with ID {mock_answer_id} does not exist.")
        return

    # If it was skipped or timed out, no need to query LLM (pre-set to save API calls)
    if mock_answer.was_skipped:
        mock_answer.per_question_score = 0
        mock_answer.per_question_feedback = {
            "score": 0,
            "strengths": [],
            "missed_points": ["Question was skipped"],
            "communication_quality": "Poor",
            "improved_answer": "N/A"
        }
        mock_answer.save()
        return

    if mock_answer.was_timed_out and not mock_answer.user_answer:
        mock_answer.per_question_score = 1
        mock_answer.per_question_feedback = {
            "score": 1,
            "strengths": [],
            "missed_points": ["Question timed out without an answer."],
            "communication_quality": "Poor",
            "improved_answer": "N/A"
        }
        mock_answer.save()
        return

    mock_interview = mock_answer.mock_interview
    question = mock_answer.question

    try:
        feedback = evaluate_practice_answer(
            question_text=question.question_text,
            ideal_outline=question.ideal_answer_outline,
            user_answer=mock_answer.user_answer,
            job_role=mock_interview.session.job_role,
            experience_level=mock_interview.session.experience_level
        )
        mock_answer.per_question_score = feedback.get('score', 5)
        mock_answer.per_question_feedback = feedback
        mock_answer.save()
        logger.info(f"Evaluated answer ID {mock_answer_id} for Mock {mock_interview.id}.")
    except Exception as e:
        logger.error(f"Error evaluating answer ID {mock_answer_id}: {str(e)}")
        # Default safety fallback values to not hang report generation
        mock_answer.per_question_score = 5
        mock_answer.per_question_feedback = {
            "score": 5,
            "strengths": ["Answer logged."],
            "missed_points": ["AI evaluation failed. Manual score of 5 applied."],
            "communication_quality": "Good",
            "improved_answer": "AI feedback failed."
        }
        mock_answer.save()


@shared_task(bind=True)
def generate_final_report_task(self, mock_interview_id):
    """
    Aggregates all per-question evaluation scores, waits for any pending evaluation
    tasks via self.retry, then generates the overall interview report.
    """
    try:
        mock_interview = MockInterview.objects.get(id=mock_interview_id)
    except MockInterview.DoesNotExist:
        logger.error(f"MockInterview with ID {mock_interview_id} does not exist.")
        return

    # Filter out questions that have been answered
    answers = mock_interview.answers.all()
    answered_question_ids = [ans.question.id for ans in answers]

    # If any question in the order index doesn't have an answer, it represents a bug
    # or an abandoned mock. In completion endpoint, we backfill, but check again here.
    total_expected = len(mock_interview.question_order)
    if answers.count() < total_expected:
        # Backfill any remaining questions immediately
        for q_id in mock_interview.question_order:
            if q_id not in answered_question_ids:
                MockAnswer.objects.get_or_create(
                    mock_interview=mock_interview,
                    question_id=q_id,
                    defaults={
                        'user_answer': '',
                        'was_timed_out': True,
                        'was_skipped': False,
                        'time_taken_seconds': mock_interview.time_limit_per_question or 0,
                        'per_question_score': 1,
                        'per_question_feedback': {
                            "score": 1,
                            "strengths": [],
                            "missed_points": ["Question went unanswered / interview abandoned"],
                            "communication_quality": "Poor",
                            "improved_answer": "N/A"
                        }
                    }
                )
        # Re-fetch answers
        answers = mock_interview.answers.all()

    # Check if there are any answers whose evaluations are pending (score is still null)
    pending_evals = answers.filter(per_question_score__isnull=True).exists()
    
    if pending_evals:
        from django.conf import settings
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            # In eager/thread fallback mode, we block-wait and retry in a loop
            import time
            retries = 0
            while retries < 45:
                time.sleep(1)
                # Re-fetch answers
                if not mock_interview.answers.filter(per_question_score__isnull=True).exists():
                    break
                retries += 1
            else:
                mock_interview.status = 'failed'
                mock_interview.error_message = "Failed to generate report: Individual question evaluations timed out."
                mock_interview.save(update_fields=['status', 'error_message'])
                return
        else:
            # Exponential backoff retry for standard Celery worker
            try:
                countdown = min(2 ** self.request.retries, 60)
                self.retry(countdown=countdown, max_retries=15)
                return
            except MaxRetriesExceededError:
                mock_interview.status = 'failed'
                mock_interview.error_message = "Failed to generate report: Individual question evaluations timed out."
                mock_interview.save(update_fields=['status', 'error_message'])
                logger.error(f"Mock interview {mock_interview_id} report generation timed out on retries.")
                return

    # Convert answers to transcript string
    transcript_parts = []
    for ans in answers:
        if ans.was_skipped:
            ans_text = "SKIPPED"
        elif ans.was_timed_out and not ans.user_answer:
            ans_text = "TIMED OUT"
        else:
            ans_text = ans.user_answer
            
        transcript_parts.append(
            f"Q: {ans.question.question_text}\n"
            f"Category: {ans.question.category}\n"
            f"Candidate's Answer: {ans_text}\n"
            f"Per-question Score: {ans.per_question_score}/10\n"
        )
        
    transcript_text = "\n".join(transcript_parts)
    
    mock_interview.status = 'processing'
    mock_interview.save(update_fields=['status'])

    try:
        report = generate_overall_report(
            job_role=mock_interview.session.job_role,
            experience_level=mock_interview.session.experience_level,
            transcript_text=transcript_text
        )
        
        # Save results
        mock_interview.overall_score = report.get('overall_score', 50)
        
        rec = report.get('hiring_recommendation', 'Maybe')
        valid_recs = ['Strong Yes', 'Yes', 'Maybe', 'No']
        if rec not in valid_recs:
            rec = 'Maybe'
        mock_interview.hiring_recommendation = rec
        
        mock_interview.full_report = report
        mock_interview.status = 'completed'
        mock_interview.completed_at = timezone.now()
        mock_interview.save()
        logger.info(f"Successfully generated final report for Mock {mock_interview_id}.")
        
    except Exception as e:
        mock_interview.status = 'failed'
        mock_interview.error_message = f"Failed to generate report: {str(e)}"
        mock_interview.save(update_fields=['status', 'error_message'])
        logger.error(f"Report generation failed for Mock {mock_interview_id}: {str(e)}")
