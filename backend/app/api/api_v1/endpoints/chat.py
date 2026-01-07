from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app import models
from app.api import deps
from app.core.ollama import generate_response

router = APIRouter()

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    course_id: int
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []

@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Send a message to the AI tutor for a specific course.
    Uses RAG to retrieve relevant course materials and Ollama for generation.
    """
    # Convert history to list of dicts
    history = [{"role": msg.role, "content": msg.content} for msg in request.history]
    
    # Generate response
    response_text = await generate_response(
        course_id=request.course_id,
        user_message=request.message,
        chat_history=history
    )
    
    return ChatResponse(response=response_text, sources=[])
