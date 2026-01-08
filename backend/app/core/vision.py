"""
Vision Analysis for CNN Diagram Intelligence Tutor.

This module provides AI-powered analysis of CNN architecture diagrams using:
1. Primary: Groq API with llama-3.2-11b-vision-preview (cloud, fast)
2. Fallback: Local Ollama with llava model (requires: ollama pull llava)

No mocks. Real AI inference only.
"""
import httpx
import base64
import json
import re
import logging
import os
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"  # Current multimodal vision model
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_VISION_MODEL = "llava"


def encode_image_to_base64(image_path: str) -> str:
    """Read image file and encode to base64."""
    with open(image_path, "rb") as image_file:
        return base64.standard_b64encode(image_file.read()).decode("utf-8")


def get_image_media_type(image_path: str) -> str:
    """Determine media type from file extension."""
    ext = image_path.lower().rsplit(".", 1)[-1]
    media_types = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp"
    }
    return media_types.get(ext, "image/png")


# The expert prompt for CNN diagram analysis
CNN_ANALYSIS_PROMPT = """You are a Computer Vision Professor specializing in Deep Learning and Convolutional Neural Networks.

A student has submitted a diagram of a CNN architecture. Your task is to:

1. **Identify all layers** in the diagram (Conv2D, ReLU, MaxPool, BatchNorm, Dropout, Flatten, Dense/FC, Softmax, etc.)
2. **Validate the flow** - Check if the architecture follows logical CNN conventions:
   - Convolution layers should be followed by activation (ReLU) and optionally pooling
   - The network should end with fully connected layers for classification
   - Input shape should flow correctly to output
3. **Detect errors** - Missing activations, incorrect layer order, dimension mismatches
4. **Provide SPECIFIC step-by-step instructions** on how to correct the diagram

Respond ONLY with valid JSON in this exact format:
{
  "layers": [
    {"name": "Conv2D", "order": 1, "valid": true, "issue": null},
    {"name": "ReLU", "order": 2, "valid": true, "issue": null},
    {"name": "MaxPool", "order": 3, "valid": true, "issue": null}
  ],
  "flow_valid": true,
  "overall_feedback": "Your CNN architecture analysis...",
  "correctness_score": 0.85,
  "suggestions": [
    "Consider adding BatchNorm after Conv layers for faster training"
  ],
  "correction_steps": [
    {
      "step": 1,
      "action": "Add ReLU activation after Conv2D layer",
      "where": "Between layer 1 (Conv2D) and layer 2 (MaxPool)",
      "why": "Activation functions introduce non-linearity. Without ReLU after convolution, your network can only learn linear transformations, severely limiting its power.",
      "how": "Draw a box labeled 'ReLU' or 'Activation' between the Conv2D and MaxPool layers. Connect it with arrows showing the data flow."
    },
    {
      "step": 2,
      "action": "Add Flatten layer before Dense/FC",
      "where": "After the last pooling layer, before the first Dense layer",
      "why": "Convolutional layers output 3D tensors (height x width x channels). Dense layers expect 1D vectors. Flatten converts the 3D tensor to 1D.",
      "how": "Draw a box labeled 'Flatten' between your last Conv/Pool block and the Dense layer."
    }
  ]
}

CRITICAL INSTRUCTIONS:
- correctness_score should be between 0.0 and 1.0
- Be encouraging but accurate - students learn better with positive reinforcement
- Focus on Module 4 CNN concepts (convolution, pooling, feature extraction, classification)
- If the image is not a CNN diagram, set correctness_score to 0 and explain in feedback
- The "correction_steps" MUST be specific to THIS diagram - tell them EXACTLY what to add/change
- Each correction step must include:
  * "action": What to do
  * "where": Exact location in their diagram
  * "why": Educational explanation of why this matters
  * "how": Practical instruction on how to draw/add it
- If the diagram is perfect, return an empty correction_steps array and congratulate them
- Order correction_steps by importance (most critical error first)"""


async def analyze_cnn_diagram(image_path: str) -> dict:
    """
    Analyze a CNN diagram image using Vision AI.
    
    Tries Groq Vision API first, falls back to Ollama Llava.
    
    Returns:
        dict with keys: layers, flow_valid, overall_feedback, correctness_score, suggestions
        OR dict with key "error" if all methods fail
    """
    if not os.path.exists(image_path):
        return {"error": f"Image file not found: {image_path}"}
    
    # Try Groq Vision API first
    logger.info("Attempting CNN diagram analysis with Groq Vision API...")
    result = await _analyze_with_groq(image_path)
    if result and "error" not in result:
        logger.info("Groq Vision analysis successful")
        return result
    
    # Fallback to Ollama Llava
    logger.info("Groq failed, trying Ollama Llava...")
    result = await _analyze_with_ollama(image_path)
    if result and "error" not in result:
        logger.info("Ollama Llava analysis successful")
        return result
    
    # Both failed
    error_msg = result.get("error", "Vision AI unavailable") if result else "Vision AI unavailable"
    return {
        "error": f"Could not analyze diagram: {error_msg}. Please ensure Groq API key is set or Ollama Llava is installed (ollama pull llava)."
    }


async def _analyze_with_groq(image_path: str) -> Optional[dict]:
    """Analyze diagram using Groq Vision API."""
    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.warning("GROQ_API_KEY not set")
        return {"error": "Groq API key not configured"}
    
    logger.info(f"Groq API key found (starts with: {api_key[:10]}...)")
    
    try:
        image_base64 = encode_image_to_base64(image_path)
        media_type = get_image_media_type(image_path)
        
        logger.info(f"Image encoded, size: {len(image_base64)} chars, type: {media_type}")
        logger.info(f"Calling Groq Vision model: {GROQ_VISION_MODEL}")
        
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": GROQ_VISION_MODEL,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": CNN_ANALYSIS_PROMPT
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{media_type};base64,{image_base64}"
                                    }
                                }
                            ]
                        }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000
                }
            )
            
            logger.info(f"Groq response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                logger.info(f"Groq returned content length: {len(content)}")
                return _parse_vision_response(content)
            else:
                error_text = response.text[:500]
                logger.error(f"Groq Vision error: {response.status_code} - {error_text}")
                return {"error": f"Groq API error {response.status_code}: {error_text[:100]}"}
                
    except httpx.TimeoutException:
        logger.error("Groq Vision timeout")
        return {"error": "Vision API timeout"}
    except Exception as e:
        logger.error(f"Groq Vision error: {e}")
        return {"error": str(e)}


async def _analyze_with_ollama(image_path: str) -> Optional[dict]:
    """Analyze diagram using local Ollama Llava model."""
    try:
        image_base64 = encode_image_to_base64(image_path)
        
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_VISION_MODEL,
                    "prompt": CNN_ANALYSIS_PROMPT,
                    "images": [image_base64],
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data.get("response", "")
                return _parse_vision_response(content)
            else:
                logger.error(f"Ollama Llava error: {response.status_code}")
                return {"error": f"Ollama error: {response.status_code}"}
                
    except httpx.ConnectError:
        return {"error": "Could not connect to Ollama. Run: ollama pull llava && ollama serve"}
    except httpx.TimeoutException:
        return {"error": "Ollama timeout - model may be loading"}
    except Exception as e:
        logger.error(f"Ollama Llava error: {e}")
        return {"error": str(e)}


def _parse_vision_response(content: str) -> dict:
    """Parse the JSON response from vision model."""
    try:
        # Clean up markdown code blocks if present
        cleaned = content.strip()
        cleaned = re.sub(r'^```(?:json)?\s*\n?', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'\n?```\s*$', '', cleaned, flags=re.MULTILINE)
        cleaned = cleaned.strip()
        
        # Find JSON object
        start = cleaned.find('{')
        end = cleaned.rfind('}') + 1
        if start >= 0 and end > start:
            json_str = cleaned[start:end]
            result = json.loads(json_str)
            
            # Validate required fields
            if "layers" in result or "overall_feedback" in result:
                # Ensure all expected fields exist with defaults
                return {
                    "layers": result.get("layers", []),
                    "flow_valid": result.get("flow_valid", True),
                    "overall_feedback": result.get("overall_feedback", "Analysis complete."),
                    "correctness_score": min(1.0, max(0.0, float(result.get("correctness_score", 0.5)))),
                    "suggestions": result.get("suggestions", []),
                    "correction_steps": result.get("correction_steps", [])
                }
        
        # If we couldn't parse JSON but got some text, return it as feedback
        if cleaned:
            return {
                "layers": [],
                "flow_valid": False,
                "overall_feedback": cleaned[:1000],
                "correctness_score": 0.0,
                "suggestions": ["The AI could not parse this diagram properly. Please upload a clearer image."]
            }
            
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse vision response: {e}")
    
    return {"error": "Failed to parse AI response"}
