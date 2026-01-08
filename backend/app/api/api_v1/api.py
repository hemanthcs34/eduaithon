from fastapi import APIRouter

api_router = APIRouter()

from .endpoints import auth, users, courses, videos, materials, chat, quiz, diagram, vision, doubts, let

api_router.include_router(auth.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(videos.router, prefix="/videos", tags=["videos"])
api_router.include_router(materials.router, prefix="/courses", tags=["materials"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(quiz.router, prefix="/quiz", tags=["quiz"])
api_router.include_router(diagram.router, prefix="/diagram", tags=["diagram-tutor"])
api_router.include_router(vision.router, prefix="/vision", tags=["vision-lab"])
api_router.include_router(doubts.router, prefix="/doubts", tags=["doubts"])
api_router.include_router(let.router, prefix="/let", tags=["learning-evidence"])
