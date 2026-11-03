@echo off
title VIB Esports Website Launcher
color 0B
echo ========================================================
echo       STARTING VIB ESPORTS WEBSITE (OFFLINE READY)      
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Node.js detected! Starting fullstack server and client...
    echo.
    echo Opening website at: http://localhost:3000
    echo Backend API running at: http://localhost:5000
    echo (Press Ctrl+C to stop)
    echo.
    start http://localhost:3000
    call npm run dev:all
    goto :end
)

where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Python detected! Serving pre-built website from dist...
    echo Opening website at: http://localhost:3000
    start http://localhost:3000
    python -m http.server 3000 --directory dist
    goto :end
)

echo [OK] Starting local preview server...
start http://localhost:3000
npx -y serve dist -l 3000

:end
pause
