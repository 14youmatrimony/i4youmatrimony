@echo off
title I 4 You - Matrimonial Admin Portal
echo ========================================================
echo    I 4 YOU - MATRIMONIAL ADMIN CONSOLE LAUNCHER
echo ========================================================
echo.

cd /d "%~dp0"

IF NOT EXIST ".venv\Scripts\python.exe" (
    echo [*] Creating Python virtual environment...
    python -m venv .venv
    IF ERRORLEVEL 1 (
        echo [!] Error creating virtual environment. Ensure Python 3 is installed.
        pause
        exit /b 1
    )
)

echo [*] Checking dependencies...
.\.venv\Scripts\pip install -q -r admin\requirements.txt

echo [*] Synchronizing database tables and seed records...
.\.venv\Scripts\python admin\seed_data.py

echo.
echo ========================================================
echo   [OK] Server is starting at: http://127.0.0.1:5000/
echo   Default Admin Email:    admin@i4you.com
echo   Default Admin Password: Admin@12345
echo ========================================================
echo.

.\.venv\Scripts\python admin\app.py
pause
