# AI service

The FastAPI service combines lightweight indicators with a Gemini-backed classification and stores recent review records in SQLite.

## API

- `GET /health`
- `POST /classify`
- `GET /stats`
- `GET /logs`
- `POST /logs/{id}/action`

The request and response models are defined in `../ai-service/app/schemas.py`. If `GEMINI_API_KEY` is empty or Gemini is unavailable, the service uses a conservative `SUSPICIOUS` fallback.

## Data handling

When configured, Gemini receives the sender, subject, body text, links, attachment names, and SpamAssassin score. The service stores sender, subject, classification, confidence, risk level, summary, and analyst action in its SQLite database volume. The full message body is not stored in that log.

The API has no authentication. Compose binds the published port to localhost for local development. Do not expose it to an untrusted network. Process only email data you are authorized to analyze.

## Classification limits

The indicators and model output are decision support, not proof that an email is safe or malicious. Human review is appropriate, especially for suspicious or borderline messages. Email contents are untrusted input and may contain misleading instructions or prompt-injection attempts.
