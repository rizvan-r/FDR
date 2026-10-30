import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routers import health, users, fdrs, verification, heartbeat, renewals

# Configure structured logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("fdr_chain.api")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FDR-Chain Institutional Security Deposit / Fixed Deposit Receipt Management Portal - Phase 5 API",
    version="5.0.0 (Phase 5: Renewal Management & FDR Lineage)",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list if settings.cors_origins_list else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Central Exception Handler
@app.exception_handler(Exception)
async def central_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception at {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred on the government gateway. Please try again later.",
            "path": request.url.path
        }
    )

# Include API Routers
app.include_router(health.router)
app.include_router(users.router)
app.include_router(fdrs.router)
app.include_router(verification.router)
app.include_router(heartbeat.router, prefix="/api/v1")
app.include_router(renewals.router)

@app.get("/")
async def root():
    return {
        "title": "FDR-Chain API Gateway",
        "description": "Government-style Security Deposit / FDR Management Portal (SIH 2026)",
        "phase": "Phase 5 - Renewal Management & FDR Lineage (Directed Acyclic Graph)",
        "health": "/api/health",
        "docs": "/docs"
    }
