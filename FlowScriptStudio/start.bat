@echo off
echo =========================================================
echo    FlowScript Studio - Launching Backend and Frontend
echo =========================================================
echo.

:: Check if setup was run
if not exist "%~dp0.venv\Scripts\python.exe" (
    echo [NOTICE] Environment not initialized yet. Running setup.bat first...
    call "%~dp0setup.bat"
)

if not exist "%~dp0frontend\node_modules" (
    echo [NOTICE] Frontend node_modules missing. Installing...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
)

echo Starting FastAPI Backend Server on port 8000...
start "FlowScript Backend (FastAPI :8000)" cmd /k "cd /d "%~dp0" && .venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"

echo Starting Vite Frontend Dev Server on port 5173...
start "FlowScript Frontend (Vite :5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo =========================================================
echo    FlowScript Studio is LIVE!
echo =========================================================
echo  - Frontend Web Studio: http://localhost:5173
echo  - Backend API:         http://127.0.0.1:8000
echo  - Interactive Swagger: http://127.0.0.1:8000/docs
echo.
echo (To stop the servers, simply close the backend and frontend terminal windows)
echo.
pause
