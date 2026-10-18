# Dashboard

The React/Vite dashboard provides a manual email-analysis form, classification statistics, recent analysis records, and analyst review actions. In Docker, Nginx serves the built frontend and proxies API requests to the `ai-service` container.

## Run through Compose

Use the root instructions to build and start the stack. The dashboard is available at `http://localhost:3000` by default. It has no login and is intended for local development only.

## Local frontend development

From `dashboard/`:

```sh
npm install
npm run dev
```

The Vite development server runs on port 5173. The AI service's default CORS list includes this local origin. Start the AI service separately if you want the dashboard to load live analysis data.

Create a production build with:

```sh
npm run build
```
