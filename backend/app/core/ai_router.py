import logging
import httpx
from typing import List, Optional, Dict, Any
from app.core import ollama, groq_client
from app.core.rag import query_materials

logger = logging.getLogger(__name__)

# ==============================================================================
# CHAT ROUTER
# ==============================================================================

async def generate_chat_response(
    course_id: int,
    user_message: str,
    chat_history: List[dict] = None,
    model: str = "qwen2.5-coder:7b" 
) -> str:
    """
    Centralized Chat Generation.
    1. Retrieval (RAG)
    2. Prompt Construction
    3. Generation (Ollama Primary -> Groq Fallback)
    """
    chat_history = chat_history or []
    
    # --- 1. RAG Retrieval ---
    try:
        relevant_docs = query_materials(course_id, user_message, n_results=5)
        logger.info(f"Router: Found {len(relevant_docs)} docs for course {course_id}")
    except Exception as e:
        logger.error(f"Router: RAG error: {e}")
        relevant_docs = []
    
    # --- 2. Prompt Construction ---
    context_parts = []
    if relevant_docs:
        for doc in relevant_docs:
            title = doc.get('metadata', {}).get('title', 'Course Material')
            context_parts.append(f"[From: {title}]\n{doc['content']}")
        context = "\n\n".join(context_parts)
    else:
        context = ""
    
    system_prompt = """You are an AI tutor helping students learn course material. 
You should:
- Answer questions based on the course materials provided in the context
- Be helpful, encouraging, and clear in your explanations
- If the answer isn't in the provided context, say so and try to help anyway
- Keep responses concise but thorough
- Use examples when helpful"""

    if context:
        system_prompt += f"\n\nRelevant course materials for reference:\n{context}"
    
    messages = [{"role": "system", "content": system_prompt}]
    # Add limited history
    for msg in chat_history[-6:]:
        messages.append(msg)
    messages.append({"role": "user", "content": user_message})
    
    # --- 3. Generation with Fallback ---
    # PRIMARY: Ollama (Local)
    try:
        logger.info("Router: Attempting Primary (Ollama)...")
        return await ollama.generate_chat_completion_raw(messages, model)
    except Exception as e:
        logger.warning(f"Router: Ollama failed ({e}). Switching to Fallback (Groq)...")
        
        # FALLBACK: Groq (Cloud)
        try:
            return await groq_client.generate_chat_with_groq(messages)
        except Exception as groq_e:
            logger.error(f"Router: Groq fallback failed: {groq_e}")
            return "I'm currently unable to connect to any AI service. Please ensure Ollama is running locally or check your internet connection."

# ==============================================================================
# QUIZ ROUTER
# ==============================================================================

async def generate_quiz(
    video_descriptions: List[str],
    pdf_content: str = "",
    num_questions: int = 10,
    model: str = "qwen2.5-coder:7b"
) -> Dict[str, Any]:
    """
    Centralized Quiz Generation.
    1. Prompt Construction
    2. Generation (Ollama Primary -> Groq Fallback)
    """
    
    # Build Context
    video_context = "\n".join([
        f"Topic {i+1}: {desc}" 
        for i, desc in enumerate(video_descriptions) if desc
    ])
    
    combined_content = ""
    if video_context.strip():
        combined_content += f"VIDEO TOPICS:\n{video_context}\n\n"
    if pdf_content.strip():
        limited_pdf = pdf_content[:4000]
        combined_content += f"COURSE MATERIALS:\n{limited_pdf}"
        
    if not combined_content.strip():
         return {"error": "No content available for quiz generation."}

    # PRIMARY: Ollama (Local)
    # We need to construct the specific Quiz Prompt here or delegate to a raw prompt function?
    # Ollama module currently has 'generate_quiz_from_content' which does prompt building AND calling.
    # To keep it centralized, we should build prompt here.
    
    # ...However, reusing the prompt text from ollama.py is better than duplicating.
    # I will modify ollama.py to expose `generate_quiz_completion_raw(prompt)` 
    # and moved the Prompt Construction HERE.
    
    prompt = f"""You are a quiz generator. Based on the following course material, create exactly {num_questions} multiple choice questions.

{combined_content}

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
        logger.info("Router: Attempting Quiz Primary (Ollama)...")
        result = await ollama.generate_quiz_completion_raw(prompt, model)
        if result:
            return result
        raise Exception("Ollama returned empty/invalid quiz result")
        
    except Exception as e:
        logger.warning(f"Router: Ollama Quiz failed ({e}). Switching to Fallback (Groq)...")
        
        # FALLBACK: Groq
        # Groq client's generate_quiz_with_groq ALREADY builds its own prompt internally.
        # We can just call it passing the raw data.
        return await groq_client.generate_quiz_with_groq(
            video_descriptions=video_descriptions,
            pdf_content=pdf_content,
            num_questions=num_questions
        )
