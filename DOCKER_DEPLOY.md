# Deploying Livre Magique with Docker

This application is a **Single Page Application (SPA)** that runs entirely in the browser. It uses `indexedDB` for storage and connects directly to Google Gemini APIs.

Because of this, hosting is very cheap (or free) as you don't need a backend server or database.

## 1. Prerequisites
- Docker Desktop installed
- A Google Gemini API Key

## 2. Docker Setup (Already Created)
We have added the following files to your project:
- `Dockerfile`: Multi-stage build (Node.js build -> Nginx serve).
- `.dockerignore`: Optimizes build context.
- `docker-entrypoint.sh`: Injects your API Key at runtime.
- Updated `vite.config.ts`: Improved environment variable handling.

## 3. Build the Image
Open a terminal in the project folder and run:

```bash
docker build -t livre-magique .
```

## 4. Run Locally
To test the image locally, run this command (replace `YOUR_API_KEY` with your actual key):

```bash
docker run -p 8080:80 -e GEMINI_API_KEY="YOUR_API_KEY" livre-magique
```
Then open `http://localhost:8080`.

## 5. Hosting Options (Low Cost)

### Option A: Render (Free Tier) - Recommended
1. Push your code to GitHub.
2. Sign up for [Render.com](https://render.com).
3. Create a **New Web Service**.
4. Connect your GitHub repository.
5. Select **Docker** as the Runtime.
6. Scroll down to **Advanced** -> **Environment Variables**.
7. Add Key: `GEMINI_API_KEY`, Value: `Your_Actual_Key`.
8. Click **Create Web Service**.
   - Render will build the Docker image and deploy it.
   - It will sleep after inactivity (free tier), but wakes up quickly.

### Option B: Railway / Fly.io
Similar to Render, you can deploy the Dockerfile directly.
- **Fly.io**: Install flyctl -> `fly launch` -> Set secrets with `fly secrets set GEMINI_API_KEY=...`.

### Security Note
Since this is a client-side app, your API Key is technically exposed to the user's browser (it's in the network requests).
- **limit your API Key** in Google Cloud Console to specific Referrers (e.g., specific domains) to prevent misuse if you host it publicly.
- For a personal/family project, this is usually acceptable.
