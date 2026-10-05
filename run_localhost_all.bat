@echo off
title I 4 You - Localhost Launcher (App & Admin)
echo ===================================================================
echo     I 4 YOU - MATRIMONIAL LOCALHOST LAUNCHER (APP + ADMIN)
echo ===================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Python Virtual Environment & Admin Backend...
IF NOT EXIST ".venv\Scripts\python.exe" (
    echo [*] Creating Python virtual environment...
    python -m venv .venv
    IF ERRORLEVEL 1 (
        echo [!] Error creating virtual environment. Ensure Python 3 is installed.
        pause
        exit /b 1
    )
)

echo [*] Checking Python dependencies...
.\.venv\Scripts\pip install -q -r admin\requirements.txt

echo [*] Initializing database tables and admin seed data...
.\.venv\Scripts\python admin\seed_data.py

echo.
echo [2/3] Checking Active Ports...
netstat -ano | findstr :5000 >nul
if %errorlevel% equ 0 (
    echo [OK] Admin Backend is already running on port 5000.
) else (
    echo [*] Starting Python Admin Backend in background on port 5000...
    start "I 4 You - Admin Backend (Port 5000)" /min .\.venv\Scripts\python admin\app.py
)

netstat -ano | findstr :5173 >nul
if %errorlevel% equ 0 (
    echo [OK] Vite React App is already running on port 5173.
) else (
    echo [*] Starting Vite React App on port 5173...
    start "I 4 You - Frontend App (Port 5173)" cmd /k "npm run dev"
)

echo.
echo [3/3] Opening Browsers...
timeout /t 2 /nobreak >nul
start http://localhost:5173
start http://localhost:5000/login

echo.
echo ===================================================================
echo   LOCAL SERVERS STATUS:
echo   ---------------------------------------------------------------
echo   [1] MATRIMONY APP:       http://localhost:5173/
echo   [2] ADMIN CONSOLE:       http://localhost:5000/
echo.
echo   ADMIN LOGIN CREDENTIALS:
echo   - Email:     admin@i4you.com
echo   - Password:  Admin@12345
echo ===================================================================
echo.
echo Press any key to exit this launcher window (servers stay running).
pause >nul
