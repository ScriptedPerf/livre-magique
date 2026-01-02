# 🚀 Deployment Guide

This application is a **Single Page Application (SPA)** that runs client-side. It can be easily containerized and deployed to any platform including Google Cloud Run.

## 🐳 Option 1: Run Locally (Docker)

1.  **Build the Image**:
    ```bash
    docker build -t livre-magique .
    ```

2.  **Run the Container**:
    Replace `YOUR_API_KEY` with your actual Google Gemini API key.
    ```bash
    docker run -p 8080:80 -e GEMINI_API_KEY="YOUR_API_KEY" livre-magique
    ```

3.  **Access**: Open `http://localhost:8080`

---

## ☁️ Option 2: Google Cloud Run (Recommended)

This method uses **Google Cloud Build** to build your image remotely, bypassing local network issues or Docker configuration problems.

### 1. Open Google Coud Shell
Go to the [Google Cloud Console](https://console.cloud.google.com/) and click the **Activate Cloud Shell** icon (`>_`) in the top right.

### 2. Prepare the Environment
Run these commands in Cloud Shell to correct permissions (replace `YOUR_EMAIL` and `PROJECT_ID`):

```bash
# Set your project (optional if already set)
gcloud config set project [YOUR_PROJECT_ID]

# Grant your account permission to build
gcloud projects add-iam-policy-binding [YOUR_PROJECT_ID] \
    --member="user:[YOUR_EMAIL]" \
    --role="roles/cloudbuild.builds.editor"

# Create a repository for your images (if you haven't yet)
gcloud services enable artifactregistry.googleapis.com
gcloud artifacts repositories create my-repo --repository-format=docker --location=us-east1
```

### 3. Build & Deploy
This single step uploads your code, builds it on Google's servers, and deploys it live.

```bash
# 1. Submit Build
gcloud builds submit --tag us-east1-docker.pkg.dev/[YOUR_PROJECT_ID]/my-repo/livre-magique:latest

# 2. Deploy Service
gcloud run deploy livre-magique \
  --image=us-east1-docker.pkg.dev/[YOUR_PROJECT_ID]/my-repo/livre-magique:latest \
  --region=us-east1 \
  --allow-unauthenticated \
  --set-env-vars=GEMINI_API_KEY="[YOUR_ACTUAL_API_KEY]"
```

---

## 🔒 Security Note
Since this is a client-side app, your API Key is verified in the user's browser.
- **Restrict your API Key**: Go to Google Cloud Console > APIs & Services > Credentials. Restrict your key to only allow requests from your deployment domain (e.g., `https://livre-magique-xyz.a.run.app`).

## 🛠 Troubleshooting
**"Connection Refused" during push?**
- Use the **Cloud Build** method (Option 2) above. It avoids utilizing your local internet or Cloud Shell's ephemeral network for the heavy lifting.
