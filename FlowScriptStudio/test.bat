@echo off
echo =========================================================
echo    FlowScript Studio - Pytest Formal Verification Suite
echo =========================================================
echo.

if not exist "%~dp0.venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found! Run setup.bat first.
    pause
    exit /b 1
)

"%~dp0.venv\Scripts\python.exe" -m pytest "%~dp0backend\tests" -v
echo.
pause
