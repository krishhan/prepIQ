import os
import json
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

class LLMError(Exception):
    pass

class LLMRateLimitError(LLMError):
    pass

def clean_and_parse_json(text):
    """
    Strips markdown code block markers and attempts to parse JSON.
    """
    cleaned = text.strip()
    
    # Remove ```json ... ``` or ``` ... ``` wrappers
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
        
    cleaned = cleaned.strip()
    return json.loads(cleaned)

def call_with_absolute_timeout(func, timeout_seconds, *args, **kwargs):
    import threading
    result = [None]
    exception = [None]

    def target():
        try:
            result[0] = func(*args, **kwargs)
        except Exception as e:
            exception[0] = e

    thread = threading.Thread(target=target)
    thread.daemon = True
    thread.start()
    thread.join(timeout=timeout_seconds)

    if thread.is_alive():
        raise TimeoutError("Request exceeded absolute timeout limits.")

    if exception[0] is not None:
        raise exception[0]

    return result[0]

def query_openrouter(messages, use_fallback=False, enforce_json=False):
    """
    Queries the OpenRouter API.
    """
    api_key = getattr(settings, 'OPENROUTER_API_KEY', '')
    if not api_key:
        api_key = os.environ.get('OPENROUTER_API_KEY', '')
    
    if api_key:
        api_key = api_key.strip()

    if not api_key:
        raise LLMError("OpenRouter API key is missing. Please set OPENROUTER_API_KEY in your env.")

    primary_model = getattr(settings, 'OPENROUTER_MODEL', 'meta-llama/llama-3.1-8b-instruct:free')
    fallback_model = getattr(settings, 'OPENROUTER_FALLBACK_MODEL', 'google/gemma-2-9b-it:free')
    
    model = fallback_model if use_fallback else primary_model
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "PrepIQ",
    }
    
    # Stricter formatting instructions if parsing failed before
    if enforce_json and len(messages) > 1:
        messages = list(messages)
        messages[-1] = {
            **messages[-1],
            "content": messages[-1]["content"] + "\n\nCRITICAL: Return ONLY raw JSON, absolutely nothing else, no backticks, no markdown, and no code blocks."
        }
        
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.1,
    }
    
    try:
        response = call_with_absolute_timeout(
            requests.post,
            35,  # absolute timeout
            url,
            headers=headers,
            json=payload,
            timeout=30  # read timeout
        )
    except (requests.exceptions.RequestException, TimeoutError) as e:
        logger.error(f"OpenRouter request failed: {str(e)}")
        raise LLMError(f"OpenRouter connection failed: {str(e)}")
        
    if response.status_code == 429:
        logger.warning("OpenRouter rate limit hit.")
        raise LLMRateLimitError("OpenRouter API rate limit reached. Please try again shortly.")
        
    if response.status_code != 200:
        logger.error(f"OpenRouter returned error {response.status_code}: {response.text}")
        raise LLMError(f"OpenRouter API returned error code {response.status_code}.")

    try:
        data = response.json()
        return data['choices'][0]['message']['content']
    except (KeyError, IndexError, ValueError) as e:
        logger.error(f"Malformed response payload from OpenRouter: {str(e)}")
        raise LLMError("Invalid response format received from OpenRouter API.")

def generate_interview_questions(resume_text, job_role, experience_level):
    """
    Attempts to generate exactly 20 interview questions using OpenRouter.
    """
    system_prompt = (
        "You are an expert technical interviewer with 15 years of hiring experience. "
        "Analyze the candidate's resume carefully and generate highly personalized interview "
        "questions they are likely to face. Base technical and project questions strictly on "
        "what is mentioned in their resume — do not invent technologies they haven't used."
    )
    
    user_prompt = f"""
Resume Content:
{resume_text}

Target Role: {job_role}
Experience Level: {experience_level}

Generate exactly 20 interview questions this candidate is likely to face, 
organized into these 4 categories:

1. Technical Questions (8 questions)
   - Based specifically on technologies, languages, and frameworks mentioned in resume
   - Should probe depth of knowledge, not just surface familiarity

2. Project-Based Questions (5 questions)
   - Deep dive questions about specific projects listed in their resume
   - Ask about architecture decisions, challenges faced, what they'd do differently

3. Behavioral Questions (4 questions)
   - STAR-format situational questions relevant to the target role
   - Based on experiences and achievements mentioned in resume

4. Role-Specific Conceptual Questions (3 questions)
   - Core fundamentals every {job_role} must know regardless of resume

For each question provide:
- difficulty: "Easy" | "Medium" | "Hard"
- why_asked: one sentence explaining why an interviewer would ask this
- ideal_answer_outline: 3 bullet points outlining what a strong answer should cover

Return ONLY valid JSON. No markdown. No explanation. No text outside the JSON.

JSON Schema:
{{
  "categories": [
    {{
      "name": "Technical Questions",
      "questions": [
        {{
          "question": "...",
          "difficulty": "Medium",
          "why_asked": "...",
          "ideal_answer_outline": ["...", "...", "..."]
        }}
      ]
    }},
    {{
      "name": "Project-Based Questions",
      "questions": [
        {{
          "question": "...",
          "difficulty": "Medium",
          "why_asked": "...",
          "ideal_answer_outline": ["...", "...", "..."]
        }}
      ]
    }},
    {{
      "name": "Behavioral Questions",
      "questions": [
        {{
          "question": "...",
          "difficulty": "Medium",
          "why_asked": "...",
          "ideal_answer_outline": ["...", "...", "..."]
        }}
      ]
    }},
    {{
      "name": "Role-Specific Conceptual Questions",
      "questions": [
        {{
          "question": "...",
          "difficulty": "Medium",
          "why_asked": "...",
          "ideal_answer_outline": ["...", "...", "..."]
        }}
      ]
    }}
  ]
}}
"""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    logger.info("Attempting question generation with primary model...")
    try:
        response_text = query_openrouter(messages, use_fallback=False, enforce_json=False)
        return clean_and_parse_json(response_text)
    except (json.JSONDecodeError, LLMError) as e:
        logger.warning(f"Primary model generation or JSON parse failed: {str(e)}. Retrying with stricter constraints...")
        try:
            response_text = query_openrouter(messages, use_fallback=False, enforce_json=True)
            return clean_and_parse_json(response_text)
        except (json.JSONDecodeError, LLMError) as e2:
            logger.warning(f"Primary model retry failed: {str(e2)}. Falling back to fallback model...")
            try:
                response_text = query_openrouter(messages, use_fallback=True, enforce_json=True)
                return clean_and_parse_json(response_text)
            except Exception as e3:
                logger.error(f"All LLM generation paths failed. Error: {str(e3)}")
                raise LLMError(f"Failed to generate structured interview questions: {str(e3)}")

def evaluate_practice_answer(question_text, ideal_outline, user_answer, job_role, experience_level):
    """
    Evaluates a candidate's answer to a practice question using OpenRouter.
    """
    user_prompt = f"""
Question: {question_text}
Ideal Answer Outline: {ideal_outline}
Candidate's Answer: {user_answer}
Job Role: {job_role}
Experience Level: {experience_level}

Evaluate this interview answer strictly and fairly.
Return ONLY valid JSON:
{{
  "score": <integer 1-10>,
  "strengths": ["...", "...", "..."],
  "missed_points": ["...", "...", "..."],
  "communication_quality": "Poor" | "Fair" | "Good" | "Excellent",
  "improved_answer": "A well-structured 3-4 sentence model answer"
}}
"""
    messages = [
        {"role": "system", "content": "You are a strict, fair, and professional technical interviewer. Return raw JSON feedback according to the requested schema."},
        {"role": "user", "content": user_prompt}
    ]

    logger.info("Evaluating practice answer with primary model...")
    try:
        response_text = query_openrouter(messages, use_fallback=False, enforce_json=True)
        return clean_and_parse_json(response_text)
    except (json.JSONDecodeError, LLMError) as e:
        logger.warning(f"Primary model evaluation or JSON parse failed: {str(e)}. Retrying with fallback...")
        try:
            response_text = query_openrouter(messages, use_fallback=True, enforce_json=True)
            return clean_and_parse_json(response_text)
        except Exception as e2:
            logger.error(f"Fallback model evaluation failed: {str(e2)}")
            # Default fallback JSON feedback
            return {
                "score": 5,
                "strengths": ["Answer submitted successfully."],
                "missed_points": ["Could not parse detailed feedback from AI. Standard review assigned."],
                "communication_quality": "Good",
                "improved_answer": "Model answer generation failed due to API load. Please review the ideal answer outline."
            }

def generate_overall_report(job_role, experience_level, transcript_text):
    """
    Calls OpenRouter LLM to evaluate the complete interview transcript.
    """
    user_prompt = f"""
You are a senior hiring manager evaluating a candidate for the role of {job_role} 
at {experience_level} level. Below is the complete interview transcript with 
per-question scores.

Interview Transcript:
{transcript_text}

Generate a comprehensive, honest performance report.
Return ONLY valid JSON:
{{
  "overall_score": <integer 1-100>,
  "hiring_recommendation": "Strong Yes" | "Yes" | "Maybe" | "No",
  "overall_summary": "3-4 sentence honest assessment of the candidate",
  "category_scores": {{
    "technical_knowledge": <1-10>,
    "project_understanding": <1-10>,
    "behavioral": <1-10>,
    "communication": <1-10>,
    "problem_solving": <1-10>
  }},
  "top_strengths": ["...", "...", "..."],
  "critical_gaps": ["...", "...", "..."],
  "improvement_roadmap": [
    {{
      "area": "...",
      "suggestion": "...",
      "priority": "High" | "Medium" | "Low"
    }}
  ],
  "best_answer": {{
    "question": "...",
    "reason": "..."
  }},
  "weakest_answer": {{
    "question": "...",
    "reason": "..."
  }},
  "interview_tips": ["...", "...", "..."]
}}
"""
    messages = [
        {"role": "system", "content": "You are a strict, fair, and professional hiring manager. Return ONLY valid JSON feedback structure matching the requested format."},
        {"role": "user", "content": user_prompt}
    ]

    logger.info("Generating final mock interview performance report...")
    try:
        response_text = query_openrouter(messages, use_fallback=False, enforce_json=True)
        return clean_and_parse_json(response_text)
    except (json.JSONDecodeError, LLMError) as e:
        logger.warning(f"Primary model report generation or JSON parse failed: {str(e)}. Retrying with fallback...")
        try:
            response_text = query_openrouter(messages, use_fallback=True, enforce_json=True)
            return clean_and_parse_json(response_text)
        except Exception as e2:
            logger.error(f"Fallback model report generation failed: {str(e2)}")
            # Default fallback JSON report structure
            return {
                "overall_score": 50,
                "hiring_recommendation": "Maybe",
                "overall_summary": "Evaluation completed, but AI failed to generate details due to load.",
                "category_scores": {
                    "technical_knowledge": 5,
                    "project_understanding": 5,
                    "behavioral": 5,
                    "communication": 5,
                    "problem_solving": 5
                },
                "top_strengths": ["Completed mock interview successfully."],
                "critical_gaps": ["Detailed report generation failed."],
                "improvement_roadmap": [
                    {
                        "area": "System Review",
                        "suggestion": "Retry the report generation or take another mock.",
                        "priority": "Medium"
                    }
                ],
                "best_answer": {
                    "question": "N/A",
                    "reason": "AI report generation failed."
                },
                "weakest_answer": {
                    "question": "N/A",
                    "reason": "AI report generation failed."
                },
                "interview_tips": ["Review each question bank detail individually."]
            }
