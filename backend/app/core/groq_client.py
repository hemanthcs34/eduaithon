"""
Groq API Client for Quiz Generation
This is the fallback when Ollama is unavailable.
Groq provides free access to LLaMA models with fast inference.

To get your API key:
1. Go to https://console.groq.com
2. Sign up (free, no credit card)
3. Create an API key
4. Set GROQ_API_KEY environment variable
"""
import httpx
import json
import os
import logging
import re
from app.core.config import settings

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"  # Current supported model (fast and free)

def get_groq_api_key() -> str:
    """Get Groq API key from settings."""
    return settings.GROQ_API_KEY

async def generate_quiz_with_groq(
    video_descriptions: list[str],
    pdf_content: str = "",
    num_questions: int = 10
) -> dict:
    """
    Generate quiz using Groq API (LLaMA model).
    
    Args:
        video_descriptions: List of video topic descriptions
        pdf_content: Optional PDF content for additional context
        num_questions: Number of questions to generate
    
    Returns:
        dict with "questions" list or "error" key
    """
    api_key = get_groq_api_key()
    if not api_key:
        logger.error("GROQ_API_KEY not set")
        return {"error": "Groq API key not configured. Please set GROQ_API_KEY environment variable."}
    
    # Build context from video descriptions
    video_context = "\n".join([
        f"Video {i+1}: {desc}" 
        for i, desc in enumerate(video_descriptions) if desc
    ])
    
    # Limit PDF content
    limited_pdf = pdf_content[:3000] if pdf_content else ""
    
    # Build the prompt - STRICT: Only use provided topics
    prompt = f"""You are a quiz generator for an educational course. Generate exactly {num_questions} multiple choice questions.

CRITICAL INSTRUCTION: You MUST ONLY generate questions about the EXACT topics listed below. Do NOT use any external knowledge. Do NOT add any topics that are not explicitly mentioned. If a topic says "Object Detection", only ask about object detection concepts. Do NOT make up facts.

VIDEO TOPICS COVERED (ONLY use these for questions):
{video_context}

{f"ADDITIONAL COURSE MATERIAL (use ONLY if relevant to the video topics above):\n{limited_pdf}" if limited_pdf else ""}

STRICT REQUIREMENTS:
- ONLY ask about the specific topics listed in VIDEO TOPICS COVERED
- Do NOT introduce any concepts not mentioned in the topics
- Each question must directly relate to what the videos taught
- If the topic is "Introduction to CNN", only ask about CNN basics
- If the topic is "YOLO Algorithm", only ask about YOLO
- Each question should have exactly 4 options (A, B, C, D)
- Only one correct answer per question
- Include a brief explanation for each correct answer

Return ONLY valid JSON in this exact format:
{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
      "correct_answer": "A",
      "explanation": "Brief explanation of why this is correct"
    }}
  ]
}}"""

    logger.info(f"Calling Groq API with model {GROQ_MODEL}")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are a helpful quiz generator. Always respond with valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 4000
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Parse JSON from response
                try:
                    # Remove markdown code blocks if present
                    cleaned = content.strip()
                    cleaned = re.sub(r'^```(?:json)?\s*\n?', '', cleaned, flags=re.MULTILINE)
                    cleaned = re.sub(r'\n?```\s*$', '', cleaned, flags=re.MULTILINE)
                    cleaned = cleaned.strip()
                    
                    # Try to find JSON object
                    start = cleaned.find('{')
                    end = cleaned.rfind('}') + 1
                    if start >= 0 and end > start:
                        json_str = cleaned[start:end]
                        result = json.loads(json_str)
                        if "questions" in result and isinstance(result["questions"], list):
                            logger.info(f"Groq generated {len(result['questions'])} questions successfully")
                            return result
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse Groq response: {e}")
                    return {"error": "Failed to parse quiz response from AI"}
            
            elif response.status_code == 401:
                return {"error": "Invalid Groq API key. Please check your GROQ_API_KEY."}
            elif response.status_code == 429:
                return {"error": "Groq API rate limit exceeded. Please wait and try again."}
            else:
                logger.error(f"Groq API error: {response.status_code} - {response.text[:200]}")
                return {"error": f"Groq API error: {response.status_code}"}
                
    except httpx.TimeoutException:
        logger.error("Groq API timeout")
        return {"error": "AI service timed out. Please try again."}
    except httpx.ConnectError:
        logger.error("Could not connect to Groq API")
        return {"error": "Could not connect to AI service. Check your internet connection."}
    except Exception as e:
        logger.error(f"Unexpected Groq error: {e}")
        return {"error": f"AI service error: {str(e)}"}
    
    return {"error": "Failed to generate quiz"}
