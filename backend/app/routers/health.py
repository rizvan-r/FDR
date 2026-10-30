from fastapi import APIRouter
from datetime import datetime, timezone
from app.config import settings
from app.services.supabase_admin import supabase_admin

router = APIRouter(prefix="/api", tags=["System & Health"])

@router.get("/health")
async def health_check():
    db_status = "connected" if supabase_admin.client is not None else "development_mock_mode"
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
