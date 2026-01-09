import httpx
from typing import List, Optional, Dict, Any
import json
import logging
import re

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "qwen2.5-coder:7b" 

async def generate_chat_completion_raw(
    messages: List[dict],
    model: str = DEFAULT_MODEL
) -> str:
    """
    Low-level Ollama Chat Completion.
    """
    logger.info(f"Ollama Client: Calling model {model}")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data.get("message", {}).get("content", "")
                if content:
                    return content
                raise Exception("Empty Ollama response")
            else:
                 raise Exception(f"Ollama status {response.status_code}: {response.text[:100]}")

    except Exception as e:
        logger.warning(f"Ollama Client Error: {str(e)}")
        raise e  # Propagate error to Router for fallback handling

async def generate_quiz_completion_raw(prompt: str, model: str = DEFAULT_MODEL) -> Optional[Dict[str, Any]]:
    """
    Low-level Ollama Generation (for Quiz JSON).
    """
    logger.info(f"Ollama Client: Generating Quiz JSON with {model}")
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json" # Try forcing JSON if model supports it
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get("response", "")
                
                # Parse JSON
                try:
                    cleaned_text = response_text.strip()
                    # Remove markdown if present (though format:json usually avoids this)
                    cleaned_text = re.sub(r'^```(?:json)?\s*\n?', '', cleaned_text, flags=re.MULTILINE)
                    cleaned_text = re.sub(r'\n?```\s*$', '', cleaned_text, flags=re.MULTILINE)
                    cleaned_text = cleaned_text.strip()
                    
                    if not cleaned_text.startswith('{'):
                         # Try finding first {
                         start = cleaned_text.find('{')
                         if start != -1:
                             cleaned_text = cleaned_text[start:]
                    
                    result = json.loads(cleaned_text)
                    if "questions" in result and isinstance(result["questions"], list):
                        return result
                    else:
                        logger.error("Ollama JSON valid but missing 'questions' key")
                        return None
                        
                except json.JSONDecodeError:
                    logger.error("Ollama response was not valid JSON")
                    return None
            else:
                raise Exception(f"Ollama status {response.status_code}")
                    
    except Exception as e:
        logger.warning(f"Ollama Quiz Error: {e}")
        return None  # Return None to signal Router to try Fallback
