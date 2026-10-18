# Local Docker guide

This is a short local startup and smoke-check guide. For setup details and data-handling notes, see the root [README](README.md).

## Start the stack

Create `.env` from `.env.example`, set a unique `POSTGRES_PASSWORD`, and optionally set `GEMINI_API_KEY`. Then run:

```sh
docker compose config
docker compose up --build -d
docker compose ps
```

Open the dashboard at `http://localhost:3000` and n8n at `http://localhost:5678`. Create the n8n owner account on first launch. Import the workflow and assign credentials created in your own n8n instance before activating it.

## Check local service health

```sh
curl http://localhost:8000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

Use `Invoke-RestMethod` instead of `curl` in PowerShell if your shell maps `curl` to a PowerShell alias.

## Troubleshooting

```sh
docker compose ps
docker compose logs --tail=100 ai-service
docker compose logs --tail=100 dashboard
docker compose logs --tail=100 n8n
```

If the dashboard or AI port is already occupied, set `DASHBOARD_PORT` or `AI_SERVICE_PORT` in `.env`. These services are intended for local development only and have no user authentication.
