import logging
from urllib.parse import urlparse

from app.database import save_email_log
from app.llm_client import analyze_with_ai
from app.schemas import EmailAnalysisRequest, EmailAnalysisResponse



logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


PHISHING_KEYWORDS = [
    "urgent",
    "verify",
    "password",
    "suspended",
    "click here",
    "login",
]

SPAM_THRESHOLD = 5.0
SUSPICIOUS_TLDS = [
    ".xyz",
    ".top",
    ".click",
    ".buzz",
]
SUSPICIOUS_ATTACHMENT_EXTENSIONS = [
    ".exe",
    ".zip",
    ".scr",
    ".bat",
]


def extract_domain(value: str) -> str:
    parsed_url = urlparse(value)
    domain = parsed_url.netloc or parsed_url.path.split("/")[0]
    return domain.lower()


def extract_root_domain(domain: str) -> str:
    parts = domain.lower().split(".")
    if len(parts) < 2:
        return domain.lower()

    return ".".join(parts[-2:])


def extract_iocs(email: EmailAnalysisRequest) -> list[str]:
    iocs = []

    for ioc in [email.from_email, *email.links]:
        if ioc not in iocs:
            iocs.append(ioc)

    return iocs


def detect_suspicious_tlds(email: EmailAnalysisRequest) -> list[str]:
    reasoning = []

    for link in email.links:
        lowered_link = link.lower()
        for tld in SUSPICIOUS_TLDS:
            if tld in lowered_link:
                reason = f"Suspicious domain TLD detected: {tld}"
                if reason not in reasoning:
                    reasoning.append(reason)

    return reasoning


def detect_sender_domain_mismatch(email: EmailAnalysisRequest) -> list[str]:
    sender_domain = extract_root_domain(email.from_email.split("@")[-1])

    for link in email.links:
        linked_domain = extract_root_domain(extract_domain(link))
        if linked_domain and linked_domain != sender_domain:
            return [
                "Sender domain differs from linked domain",
            ]

    return []


def detect_suspicious_attachments(email: EmailAnalysisRequest) -> list[str]:
    reasoning = []

    for attachment in email.attachments:
        lowered_attachment = attachment.lower()
        if any(
            lowered_attachment.endswith(extension)
            for extension in SUSPICIOUS_ATTACHMENT_EXTENSIONS
        ):
            reasoning.append(
                f"Suspicious attachment detected: {attachment}"
            )

    return reasoning


def analyze_email(email: EmailAnalysisRequest) -> EmailAnalysisResponse:
    content = f"{email.subject} {email.body_text}".lower()
    rule_reasoning = [
        f"Contains phishing keyword: {keyword}"
        for keyword in PHISHING_KEYWORDS
        if keyword in content
    ]
    rule_reasoning.extend(detect_suspicious_tlds(email))
    rule_reasoning.extend(detect_sender_domain_mismatch(email))
    rule_reasoning.extend(detect_suspicious_attachments(email))
    iocs = extract_iocs(email)

    if email.spam_score >= SPAM_THRESHOLD:
        rule_reasoning.append(
            f"SpamAssassin score exceeds threshold: {email.spam_score}"
        )

    ai_result = analyze_with_ai(email)
    final_reasoning = rule_reasoning + ai_result["reasoning"]
    rule_confidence = 0.7 if rule_reasoning else 0.3
    final_confidence = max(rule_confidence, ai_result["confidence"])
    phishing_indicators = (
        email.spam_score >= 10
        or len(rule_reasoning) >= 4
    )

    if phishing_indicators:
        classification = "PHISHING"
        risk_level = "HIGH"

    elif rule_reasoning or ai_result["classification"] == "SUSPICIOUS":
        classification = "SUSPICIOUS"
        risk_level = "MEDIUM"

    else:
        classification = "SAFE"
        risk_level = "LOW"
    response = EmailAnalysisResponse(
        classification=classification,
        confidence=final_confidence,
        risk_level=risk_level,
        reasoning=final_reasoning,
        iocs=iocs,
        summary=ai_result["summary"],
    )

    logger.info(
        "Email analyzed | classification=%s | confidence=%.3f",
        response.classification,
        response.confidence,
    )
    save_email_log(
        sender=email.from_email,
        subject=email.subject,
        classification=response.classification,
        confidence=response.confidence,
        risk_level=response.risk_level,
        summary=response.summary,
    )
    return response
