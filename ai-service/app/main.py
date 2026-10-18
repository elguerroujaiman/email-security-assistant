import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.analyzer import analyze_email
from app.database import (
    get_email_stats,
    get_recent_email_logs,
    init_db,
    update_email_log_action,
)
from app.schemas import (
    EmailActionRequest,
    EmailAnalysisRequest,
    EmailAnalysisResponse,
    EmailLogResponse,
    EmailStatsResponse,
)


app = FastAPI()

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "ai-service",
    }


@app.post("/classify", response_model=EmailAnalysisResponse)
def classify_email(email: EmailAnalysisRequest):
    return analyze_email(email)


@app.get("/stats", response_model=EmailStatsResponse)
def stats():
    return get_email_stats()


@app.get("/logs", response_model=list[EmailLogResponse])
def logs():
    return get_recent_email_logs()


@app.post("/logs/{log_id}/action", response_model=EmailLogResponse)
def set_log_action(log_id: int, request: EmailActionRequest):
    from fastapi import HTTPException
    updated_log = update_email_log_action(
        log_id,
        request.action,
        request.override_classification,
    )
    if not updated_log:
        raise HTTPException(status_code=404, detail="Email log not found")
    return updated_log
