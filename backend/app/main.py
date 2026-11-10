from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine, SessionLocal
from app.routers import (
    auth, workspaces, projects, documents, claims,
    conflicts, risks, gaps,
    simulator, copilot, handovers, audit, invitations,
    responsibilities
)
from app.services.demo_seeder import seed_reference_projects

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise Knowledge Continuity and Structured Handover Platform.",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
api_v1 = settings.API_V1_STR
app.include_router(auth.router, prefix=api_v1)
app.include_router(workspaces.router, prefix=api_v1)
app.include_router(projects.router, prefix=api_v1)
app.include_router(documents.router, prefix=api_v1)
app.include_router(claims.router, prefix=api_v1)
app.include_router(conflicts.router, prefix=api_v1)
app.include_router(risks.router, prefix=api_v1)
app.include_router(gaps.router, prefix=api_v1)
app.include_router(simulator.router, prefix=api_v1)
app.include_router(copilot.router, prefix=api_v1)
app.include_router(handovers.router, prefix=api_v1)
app.include_router(audit.router, prefix=api_v1)
app.include_router(invitations.router, prefix=api_v1)
app.include_router(responsibilities.router, prefix=api_v1)

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # Seed realistic reference projects in the owner's private workspace
        seed_reference_projects(db, settings.UPLOAD_DIR)
    except Exception as e:
        print(f"Reference project seed notification: {e}")
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "product": settings.PROJECT_NAME,
        "team": settings.ORGANIZATION,
        "tagline": settings.TAGLINE,
        "status": "operational",
        "version": settings.VERSION,
        "docs": "/docs",
        "ai_engine": {
            "mode": settings.AI_PROVIDER,
            "grounding": "strict_evidence_backed",
            "active_live_llm": bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY)
        }
    }
