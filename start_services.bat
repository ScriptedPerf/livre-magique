@echo off
echo Starting French Picture Book Reader Services...

:: 1. Start Frontend Service
echo Starting Frontend...
start "Frontend Service" cmd /k "npm run dev"

:: 2. Start Python Service
:: I couldn't find a '.py' file in the root, so I'm assuming 'server.py'.
:: If your python script has a different name or path, please edit the line below.
if exist server.py (
    echo Starting Python Backend...
    start "Python Backend" cmd /k "python server.py"
) else (
    echo.
    echo [WARNING] 'server.py' not found in the current directory.
    echo If you have a Python backend, please edit 'start_services.bat' and update the filename.
    echo.
)

echo.
echo Services have been launched in separate windows.
echo You can safely close this terminal or exit Antigravity/IDE, and they will keep running.
echo.
pause
