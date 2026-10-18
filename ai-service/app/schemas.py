from datetime import datetime

from pydantic import BaseModel


class EmailAnalysisRequest(BaseModel):
    subject: str
    from_email: str
    body_text: str
    links: list[str]
    attachments: list[str]
    spam_score: float
    spam_rules: list[str]


class EmailAnalysisResponse(BaseModel):
    classification: str
    confidence: float
    risk_level: str
    reasoning: list[str]
    iocs: list[str]
    summary: str


class EmailStatsResponse(BaseModel):
    total: int
    safe: int
    suspicious: int
    phishing: int


class EmailLogResponse(BaseModel):
    id: int
    sender: str
    subject: str
    classification: str
    confidence: float
    risk_level: str
    summary: str
    created_at: datetime
    action: str | None = None
    override_classification: str | None = None


class EmailActionRequest(BaseModel):
    action: str
    override_classification: str | None = None
