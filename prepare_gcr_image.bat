@echo off
echo ==========================================
echo   Google Cloud Run Prep - Build & Push
echo ==========================================
echo.

echo [1/3] Checking Docker...
docker --version
if %errorlevel% neq 0 (
    echo Error: Docker is not found. Please install Docker Desktop.
    pause
    exit /b
)

echo.
echo IMPORTANT: Ensure you are logged into GitHub Container Registry.
echo If not, run: docker login ghcr.io -u YOUR_USERNAME
echo.
set /p CONTINUE="Press Enter to continue building and pushing (or Ctrl+C to stop)..."

echo.
echo [2/3] Building Image...
docker build -t ghcr.io/scriptedperf/livre-magique:latest .
if %errorlevel% neq 0 (
    echo Build failed. Exiting.
    pause
    exit /b
)

echo.
echo [3/3] Pushing to GitHub Container Registry...
docker push ghcr.io/scriptedperf/livre-magique:latest
if %errorlevel% neq 0 (
    echo.
    echo Push failed! 
    echo Common reasons:
    echo  - You are not logged in (docker login ghcr.io).
    echo  - You don't have permission to the 'scriptedperf' organization (if it is one).
    echo.
    pause
    exit /b
)

echo.
echo Success! The image is now on ghcr.io.
echo NOW: Go into your GitHub Package Settings and make 'livre-magique' PUBLIC.
echo THEN: Proceed with the Google Cloud Console steps in CLOUD_RUN_DEPLOY.md.
echo.
pause
