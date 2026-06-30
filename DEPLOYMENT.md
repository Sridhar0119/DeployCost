# Deployment Guide - DeployCost Dashboard

This document provides step-by-step instructions for containerizing, building, and deploying the **DeployCost Dashboard** application to standard production environments.

---

## 🏗️ Architecture Overview

The application is structured as a full-stack, unified Node.js service:
- **Client Frontend**: React + Tailwind CSS built and bundled with Vite.
- **Backend Server**: Express API server serving as an API proxy, managing OAuth authentication, and SQLite persistence.
- **Unified Build**: Built via Vite + bundled with `esbuild` into a single, high-performance CJS file (`dist/server.cjs`) to minimize container cold-start overhead and avoid dependency resolution issues.

---

## 🐳 Container Deployment (Recommended)

The provided `Dockerfile` leverages a secure **multi-stage build** which minimizes image size and removes compiler devDependencies from the final runtime container.

### 1. Build & Run Locally with Docker

To build and run the application container manually:

```bash
# Build the Docker image
docker build -t deploycost-dashboard .

# Run the container mapping port 3000
docker run -p 3000:3000 \
  -e GEMINI_API_KEY="your-gemini-key" \
  -e SESSION_SECRET="your-session-secret" \
  deploycost-dashboard
```

### 2. Multi-Container Orchestration with Docker Compose

If you want to run the application with a persistent volume to store your SQLite database across container restarts, use Docker Compose:

```bash
# Start the container stack in detached mode
docker-compose up -d

# View live container logs
docker-compose logs -f

# Shut down the stack and preserve your data volume
docker-compose down
```

---

## 🚀 Cloud Platform Deployments

### Option A: Google Cloud Run (Recommended)

Since the container exposes standard port `3000` and stores state in SQLite, Google Cloud Run is an ideal choice for instant, scalable hosting:

1. **Submit to Container Registry**:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/deploycost-dashboard
   ```

2. **Deploy to Cloud Run**:
   - Ensure you configure a mount volume or persistent disk if you want the SQLite database (`/app/data`) to survive instance terminations, OR connect to Cloud SQL.
   ```bash
   gcloud run deploy deploycost-dashboard \
     --image gcr.io/YOUR_PROJECT_ID/deploycost-dashboard \
     --platform managed \
     --port 3000 \
     --allow-unauthenticated \
     --set-env-vars="SESSION_SECRET=your-random-session-secret,ALLOW_DEV_LOGIN=true"
   ```

### Option B: Render or Railway

For platforms that build directly from GitHub (PaaS):

1. **Configure Build & Start Commands**:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
2. **Environment Variables**:
   Configure the following in the platform dashboard:
   - `NODE_ENV`: `production`
   - `SESSION_SECRET`: A long, randomly generated secret string.
   - `GEMINI_API_KEY`: Your Google Gen AI API Key.
   - `ALLOW_DEV_LOGIN`: `true` to enable sandbox bypass or `false` in production.
   - `DB_PATH`: `/opt/data/deploycost.db` (make sure to mount a persistent disk at `/opt/data` on Render/Railway so SQLite does not wipe on redeploys).

---

## 🔑 Environment Variables Reference

Ensure the following variables are defined in your deployment configuration:

| Variable | Description | Production Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment identifier | `production` |
| `SESSION_SECRET` | Custom private key to sign user session cookies | A long, secure random sequence |
| `GEMINI_API_KEY` | Google Gemini API Key | Secure secret from Google AI Studio / GCP |
| `DB_PATH` | Path to your persistent SQLite file | `/app/data/deploycost.db` (must have write permissions) |
| `ALLOW_DEV_LOGIN` | Toggle standard test/sandbox login forms | `false` (highly recommended for production) |
| `GOOGLE_CLIENT_ID` | OAuth Client ID for Google Authentication | *(Optional)* Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret for Google Authentication | *(Optional)* Secret key from Google Cloud Console |
| `GITHUB_CLIENT_ID` | OAuth Client ID for GitHub Authentication | *(Optional)* Client ID from GitHub Developer Portal |
| `GITHUB_CLIENT_SECRET` | OAuth Client Secret for GitHub Authentication | *(Optional)* Secret key from GitHub Developer Portal |
