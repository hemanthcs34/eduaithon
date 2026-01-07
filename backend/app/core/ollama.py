import httpx
from typing import List, Optional
import json
from app.core.rag import query_materials
from app.core.groq_client import generate_quiz_with_groq
import logging
import re

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "qwen2.5-coder:7b"  # User's installed model

async def generate_response(
    course_id: int,
    user_message: str,
    chat_history: List[dict] = None,
    model: str = DEFAULT_MODEL
) -> str:
    """
    Generate a chatbot response using RAG + Ollama.
    """
    chat_history = chat_history or []
    
    # Step 1: Query RAG for relevant context
    try:
        relevant_docs = query_materials(course_id, user_message, n_results=5)
        logger.info(f"Found {len(relevant_docs)} relevant docs for course {course_id}")
    except Exception as e:
        logger.error(f"RAG query error: {e}")
        relevant_docs = []
    
    # Step 2: Build context
    if relevant_docs:
        context_parts = []
        for doc in relevant_docs:
            title = doc.get('metadata', {}).get('title', 'Course Material')
            context_parts.append(f"[From: {title}]\n{doc['content']}")
        context = "\n\n".join(context_parts)
    else:
        context = ""
    
    # Step 3: Build prompt
    system_prompt = """You are an AI tutor helping students learn course material. 
You should:
- Answer questions based on the course materials provided in the context
- Be helpful, encouraging, and clear in your explanations
- If the answer isn't in the provided context, say so and try to help anyway
- Keep responses concise but thorough
- Use examples when helpful"""

    if context:
        system_prompt += f"\n\nRelevant course materials for reference:\n{context}"
    
    # Build messages for Ollama
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add chat history (last 6 messages to keep context manageable)
    for msg in chat_history[-6:]:
        messages.append(msg)
    
    messages.append({"role": "user", "content": user_message})
    
    # Step 4: Call Ollama - increased timeout for larger models
    logger.info(f"Calling Ollama model: {model}")
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False
                }
            )
            
            logger.info(f"Ollama response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                content = data.get("message", {}).get("content", "")
                if content:
                    return content
                else:
                    return "I received an empty response. Please try again."
            else:
                error_text = response.text[:200]
                logger.error(f"Ollama error: {error_text}")
                return f"Error from AI model (Status: {response.status_code}). Make sure Ollama is running and the model is loaded."
    except httpx.TimeoutException:
        return "The AI model is taking too long to respond. Please try a shorter question or wait and try again."
    except httpx.ConnectError as e:
        logger.error(f"Connect error: {e}")
        return "Could not connect to Ollama. Please make sure Ollama is running on localhost:11434."
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return f"Error: {str(e)}"

async def generate_quiz_from_content(
    video_descriptions: List[str],
    pdf_content: str = "",
    num_questions: int = 10,
    model: str = DEFAULT_MODEL
) -> dict:
    """
    Generate a quiz based on video descriptions and optional PDF content.
    
    Strategy:
    1. Try Ollama first (local, fast if running)
    2. If Ollama fails, try Groq API (cloud, free)
    3. If both fail, return error (no hardcoded quiz)
    
    Args:
        video_descriptions: List of topic descriptions from the 3 videos
        pdf_content: Optional combined PDF content
        num_questions: Number of questions to generate
    """
    
    # Build the context from video descriptions
    video_context = "\n".join([
        f"Topic {i+1}: {desc}" 
        for i, desc in enumerate(video_descriptions) if desc
    ])
    
    # If no video descriptions, use PDF content as primary source
    if not video_context.strip() and not pdf_content.strip():
        return {"error": "No content available. Please add video descriptions or upload materials."}
    
    # Combine content for the prompt
    combined_content = ""
    if video_context.strip():
        combined_content += f"VIDEO TOPICS:\n{video_context}\n\n"
    if pdf_content.strip():
        limited_pdf = pdf_content[:4000]
        combined_content += f"COURSE MATERIALS:\n{limited_pdf}"
    
    # === ATTEMPT 1: Try Groq API first (fast cloud service) ===
    logger.info("Attempting quiz generation with Groq API (primary)...")
    groq_result = await generate_quiz_with_groq(
        video_descriptions=video_descriptions,
        pdf_content=pdf_content,
        num_questions=num_questions
    )
    
    if groq_result and "questions" in groq_result:
        logger.info(f"Groq generated {len(groq_result['questions'])} questions successfully")
        return groq_result
    
    # === ATTEMPT 2: Try Ollama as fallback (local, slower) ===
    logger.info("Groq failed, trying Ollama as fallback...")
    ollama_result = await _try_ollama_quiz(combined_content, num_questions, model)
    
    if ollama_result and "questions" in ollama_result:
        logger.info(f"Ollama generated {len(ollama_result['questions'])} questions successfully")
        return ollama_result
    
    # === BOTH FAILED ===
    error_msg = groq_result.get("error", "AI services unavailable") if groq_result else "AI services unavailable"
    logger.error(f"All quiz generation attempts failed: {error_msg}")
    return {"error": f"Could not generate quiz: {error_msg}"}


async def _try_ollama_quiz(content: str, num_questions: int, model: str) -> Optional[dict]:
    """
    Internal function to try generating quiz with Ollama.
    Returns None if Ollama fails (connection, timeout, parse error).
    """
    prompt = f"""You are a quiz generator. Based on the following course material, create exactly {num_questions} multiple choice questions.

{content}

IMPORTANT: Generate questions that are DIRECTLY based on the material above. Do NOT make up facts.

Generate the quiz in this exact JSON format (no markdown, no code blocks, just raw JSON):
{{
  "questions": [
    {{
      "question": "Question text here",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correct_answer": "A",
      "explanation": "Brief explanation of the correct answer"
    }}
  ]
}}

Requirements:
- Questions must test understanding of the material provided above
- All 4 options should be plausible based on the material
- Correct answer should be clearly from the material
- Return ONLY valid JSON, no markdown code blocks, no other text"""
    
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get("response", "")
                
                # Try to parse JSON from the response
                cleaned_text = response_text.strip()
                cleaned_text = re.sub(r'^```(?:json)?\s*\n?', '', cleaned_text, flags=re.MULTILINE)
                cleaned_text = re.sub(r'\n?```\s*$', '', cleaned_text, flags=re.MULTILINE)
                cleaned_text = cleaned_text.strip()
                
                # Try to find JSON object
                try:
                    start = cleaned_text.find('{')
                    end = cleaned_text.rfind('}') + 1
                    if start >= 0 and end > start:
                        json_str = cleaned_text[start:end]
                        result = json.loads(json_str)
                        if "questions" in result and isinstance(result["questions"], list):
                            return result
                except json.JSONDecodeError:
                    pass
                    
    except httpx.TimeoutException:
        logger.warning("Ollama timeout")
    except httpx.ConnectError:
        logger.warning("Could not connect to Ollama")
    except Exception as e:
        logger.warning(f"Ollama error: {e}")
    
    return None
