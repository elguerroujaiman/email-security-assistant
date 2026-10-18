# Email Security Dashboard

React/Vite frontend for the Email Security Assistant.

## Local Development

```bash
npm install
npm run dev
```

The dev server runs on:

```text
http://localhost:5173
```

API requests go through `/api` and are proxied to:

```text
http://localhost:8000
```

Override the backend URL with:

```env
VITE_BACKEND_URL=http://localhost:8000
```

## Production Build

```bash
npm run build
```

Docker Compose serves the built dashboard on:

```text
http://localhost:3000
```

The Nginx container proxies `/api` to `http://ai-service:8000`.

## Backend Endpoints Used

- `GET /health`
- `GET /stats`
- `GET /logs`
- `POST /classify`
