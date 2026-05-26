"""OUT Tattoo Leads - FastAPI Backend Application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.routers.profile import router as profile_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    settings = get_settings()
    print(f"🚀 OUT Tattoo Leads API starting in {settings.APP_ENV} mode")
    yield
    # Shutdown
    print("👋 Shutting down API")


def create_application() -> FastAPI:
    """Application factory."""
    settings = get_settings()
    
    app = FastAPI(
        title="OUT Tattoo Leads API",
        description="B2B SaaS API for tattoo masters lead generation",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan
    )
    
    # CORS Configuration
    origins = settings.ALLOWED_ORIGINS.copy()
    
    # Add Vercel deployment domains in production
    if settings.APP_ENV == "production":
        origins.extend([
            "https://out-tattoo-leads.vercel.app",
            "https://*.vercel.app"
        ])
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["*"]
    )
    
    # Include routers
    app.include_router(profile_router)
    
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "ok", "service": "out-tattoo-leads-api"}
    
    @app.get("/")
    async def root():
        """Root endpoint."""
        return {
            "name": "OUT Tattoo Leads API",
            "version": "1.0.0",
            "docs": "/docs"
        }
    
    return app


# Create application instance
app = create_application()


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.APP_ENV == "development"
    )
