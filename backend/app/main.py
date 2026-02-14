from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api_v1.api import api_router
from app.api.api_v1.endpoints import mcp

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.on_event("startup")
async def startup_event():
    from app.db.session import engine, Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# CORS Configuration - Always enabled with hardcoded production origins as fallback
# This ensures deployment works even if BACKEND_CORS_ORIGINS is not set correctly
PRODUCTION_ORIGINS = [
    "https://eduaithon.vercel.app",
    "http://localhost:3000",
    "http://localhost:8001",
]
# Merge environment-specified origins with hardcoded production origins
cors_origins = list(set(settings.BACKEND_CORS_ORIGINS + PRODUCTION_ORIGINS))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)
# Explicitly mount MCP router at /api so endpoints are available at /api/scale, /api/monitor, etc.
app.include_router(mcp.router, prefix="/api", tags=["mcp-monitoring-root"])

@app.get("/")
def root():
    return {"message": "Welcome to CourseTwin Lite API"}

