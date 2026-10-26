@echo off
setlocal enabledelayedexpansion

echo =========================================================
echo    FlowScript Studio - Automated Environment Setup
echo =========================================================
echo.

:: Detect Python
echo [1/3] Detecting Python installation...
set "PYTHON_BIN="
for %%P in (python py python3) do (
    if not defined PYTHON_BIN (
        %%P --version >nul 2>&1
        if !errorlevel! equ 0 set "PYTHON_BIN=%%P"
    )
)

if not defined PYTHON_BIN (
    echo [ERROR] Python is not installed or not in your system PATH!
    echo Please install Python 3.11+ from https://www.python.org/downloads/
    echo Remember to check "Add python.exe to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo Found Python: !PYTHON_BIN!
!PYTHON_BIN! --version

:: Detect Node.js & npm
echo.
echo [2/3] Detecting Node.js and npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm is not installed or not in your system PATH!
    echo Please install Node.js 18+ from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

call node --version
call npm --version

:: Backend Virtual Environment & Dependencies
echo.
echo [3/3] Setting up Python virtual environment and dependencies...
if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment at .venv...
    !PYTHON_BIN! -m venv .venv
)

echo Installing backend Python packages (FastAPI, Uvicorn, Pytest, Pydantic)...
.venv\Scripts\python.exe -m pip install --upgrade pip >nul 2>&1
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

:: Frontend Dependencies
echo.
echo Installing frontend dependencies (React 19, Monaco Editor, Tailwind CSS, ReactFlow)...
cd frontend
call npm install
cd ..

echo.
echo =========================================================
echo    [SUCCESS] Setup Completed Successfully!
echo =========================================================
echo.
echo You can now start the studio with 1-click by running:
echo    start.bat
echo.
echo Or run the formal 37-test suite with:
echo    test.bat
echo.
pause
