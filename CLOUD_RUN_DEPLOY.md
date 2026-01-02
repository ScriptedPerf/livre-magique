# Deploying to Google Cloud Run

You chose to deploy to Google Cloud Run! This is a great choice for a serverless, scalable container deployment.

Since you don't have the Google Cloud CLI (`gcloud`) installed, we will follow the **UI (Console)** method you originally requested.

## Phase 1: Prepare the Image (Local)
Before Google Cloud can "see" your image at `ghcr.io/...`, you must **push** it there from your computer.

### 1. Login to GitHub Container Registry
You need a GitHub Personal Access Token (Classic) with `write:packages` scope.
Run this in your terminal:
```powershell
docker login ghcr.io -u YOUR_GITHUB_USERNAME
# When prompted for password, paste your Personal Access Token (PAT)
```

### 2. Build and Push
Run these commands in your project folder:

```powershell
# 1. Build the image with the correct tag
docker build -t ghcr.io/scriptedperf/livre-magique:latest .

# 2. Push it to the registry
docker push ghcr.io/scriptedperf/livre-magique:latest
```

### 3. Make Image Public (Crucial Step!)
By default, your new package on GitHub is **Private**. Google Cloud Run cannot pull it unless it is **Public**.
1. Go to your GitHub Profile -> **Packages**.
2. Click on `livre-magique`.
3. Go to **Package Settings**.
4. Scroll to "Danger Zone" -> **Change visibility** -> Select **Public**.

---

## Phase 2: Deploy (Google Cloud Console)
Now you can follow the steps you listed:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/run).
2. Click **"Create Service"**.
3. **Container Image URL**: 
   - Enter: `ghcr.io/scriptedperf/livre-magique:latest`
   - *Note: If it gives a permission error, ensure you completed Step 3 above.*
4. **Service Name**: `livre-magique` (or whatever you prefer).
5. **Region**: Choose one close to you (e.g., `us-central1`).
6. **Authentication**: 
   - Select **"Allow unauthenticated invocations"** (Public).
7. **Container, Variables & Secrets** (Expand this section):
   - **Environment Variables**:
     - Click "Add Variable".
     - Name: `GEMINI_API_KEY`
     - Value: `Your_Actual_API_Key`
   - **Capacity**:
     - Minimum number of instances: `0` (Cost saving).
     - Maximum: `1` or `10` (To prevent runaway costs).
8. Click **Create**.

## Success!
Google Cloud will now pull your image and start the service. Once green, click the provided **URL** to see your app.
