# Email Security Assistant

An email security project that combines a Gmail/IMAP workflow, SpamAssassin scoring, rule-based checks, Gemini-assisted classification, and a web dashboard for reviewing analysis results.

The repository contains the application source and a sample n8n workflow. It does not include mailbox credentials, API keys, or runtime database files.

## What it includes

- **Email workflow:** n8n reads messages over IMAP, sends them to SpamAssassin and the AI service, then routes results to Gmail label actions for clean, suspicious, and phishing messages.
- **Spam filtering:** SpamAssassin plus a small Node.js HTTP wrapper.
- **AI and rule-based analysis:** a FastAPI service combines basic indicators with Gemini classification and records analysis summaries.
- **Email parsing:** a Node.js service that parses raw RFC 822 messages and exposes structured fields.
- **Dashboard:** a React/Vite interface for manual analysis, statistics, and recent results.
- **Persistence:** PostgreSQL stores n8n state; the AI service stores review logs in SQLite.

## Architecture

```text
IMAP/Gmail
    │
    ▼
n8n workflow ──► SpamAssassin wrapper ──► SpamAssassin
    │
    ├────────────► AI service ──► Gemini API (when configured)
    │                    │
    │                    └── SQLite analysis log
    └────────────► Gmail label actions

React dashboard ──► AI service
```

The email parser is a separate service for parsing raw email messages; the included workflow does not call it.

## Requirements

- Docker Desktop (Windows/macOS) or Docker Engine with the Docker Compose plugin
- A Gemini API key for Gemini-backed classification (optional; without it, the service returns a conservative suspicious fallback)
- Gmail/IMAP and Gmail API credentials configured inside n8n if you want to run the mailbox workflow

## Run locally with Docker Compose

From the repository root:

```sh
cp .env.example .env
```

On PowerShell, use `Copy-Item .env.example .env` instead. Edit `.env` and set a unique `POSTGRES_PASSWORD`. Add `GEMINI_API_KEY` if you want Gemini-backed classification. Keep `.env` private.

Build and start the services:

```sh
docker compose up --build -d
docker compose ps
```

Open the dashboard at `http://localhost:3000`. The n8n editor is at `http://localhost:5678`; on first visit, create the local owner account using n8n's setup screen. The other local development endpoints are:

| Service | Address |
| --- | --- |
| Dashboard | http://localhost:3000 |
| n8n | http://localhost:5678 |
| AI service | http://localhost:8000 |
| SpamAssassin wrapper | http://localhost:3001 |
| Email parser | http://localhost:3002 |

Change `DASHBOARD_PORT` or `AI_SERVICE_PORT` in `.env` if those host ports are already in use. All published ports bind to `127.0.0.1` for local use.

To inspect startup logs:

```sh
docker compose logs -f ai-service
docker compose logs -f dashboard
docker compose logs -f n8n
```

To stop the containers while keeping saved data:

```sh
docker compose down
```

The PostgreSQL, n8n, and AI service data are stored in Docker volumes. `docker compose down -v` deletes those volumes and their saved data.

## Configure the n8n workflow

1. Open the local n8n editor and create its owner account.
2. Import [`n8n-workflows/email-security-workflow.json`](n8n-workflows/email-security-workflow.json).
3. Select your own IMAP and Gmail credentials for the imported nodes. Credential IDs in an exported workflow are local references and do not transfer to another n8n instance.
4. Confirm the Gmail labels and review the routing rules. Keep the workflow inactive until you have tested it with a mailbox you control.
5. Configure the IMAP mailbox and any Gmail labels in n8n. Do not put mailbox passwords or app passwords in this repository or in `.env`.

The workflow calls the AI service by its Compose service name, so the services can communicate on the Docker network without relying on a host-specific address.

## AI service endpoints

The local AI service provides:

- `GET /health` — health status
- `POST /classify` — analyze an email
- `GET /stats` — classification counts
- `GET /logs` — recent analysis records
- `POST /logs/{id}/action` — save a review action or override

The dashboard uses these endpoints through its local Nginx proxy. The API does not implement user authentication.

## Data handling and security

This is a demo application, not a production mail security gateway. The APIs and dashboard do not have authentication. Compose publishes their ports only on the local machine; do not expose them through a public reverse proxy, firewall rule, or cloud deployment without adding authentication, authorization, rate limits, and appropriate hardening.

When `GEMINI_API_KEY` is configured, the AI service sends the email sender, subject, body text, links, attachment names, and SpamAssassin score to Google's Gemini API for classification. The local SQLite log stores sender, subject, classification, confidence, risk level, and summary. Use only test messages or data you are authorized to process, and review Google's current data-handling terms before using real mail.

Before publishing this repository, confirm that `.env` is not staged and that no credentials appear in files, screenshots, or commit history. The local `.env` is excluded from a fresh repository by `.gitignore`; do not reuse secrets that were committed in the previous repository history. Rotate any real mailbox app passwords or service passwords that were committed there.

## Project layout

```text
ai-service/              FastAPI classifier and SQLite logging
dashboard/               React/Vite dashboard served by Nginx
email-parser/             Raw email parsing service
sa-wrapper/               SpamAssassin HTTP bridge
spamassassin-config/      SpamAssassin configuration
n8n-workflows/            Importable n8n workflow
docs/                     Current service and workflow notes
```

## License

No license is currently declared. Confirm the project and source-code rights with all contributors before adding one.
