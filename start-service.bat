@echo off
title UantekEM-AI Service
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -Command "$Host.UI.RawUI.WindowTitle = 'UantekEM-AI Service'" >nul 2>&1
setlocal enabledelayedexpansion

:: Ensure Node.js is in PATH
where node >nul 2>&1 || set "PATH=D:\Program Files\nodejs;C:\Program Files\nodejs;%PATH%"

set SCRIPT_DIR=%~dp0
call "%SCRIPT_DIR%config.bat"

set BACKEND_DIR=%SCRIPT_DIR%backend
set FRONTEND_DIR=%SCRIPT_DIR%frontend
set LOG_DIR=%SCRIPT_DIR%logs
set PID_BACKEND=%SCRIPT_DIR%.pid_backend
set PID_FRONTEND=%SCRIPT_DIR%.pid_frontend

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
cd /d "%SCRIPT_DIR%"

echo ================================================
echo   EM-AI Production Startup Script (Windows)
echo ================================================
echo.

:: 1. Check environment
echo [1/5] Checking environment...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found, please install Node.js ^>= 18
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo   Node.js !NODE_VER!

:: Ensure .env
if not exist "%BACKEND_DIR%\.env" (
    echo DATABASE_URL="file:./dev.db" > "%BACKEND_DIR%\.env"
    echo   [INFO] Created .env file
)

:: 2. Check build output exists
echo [2/5] Checking build output...
if not exist "%BACKEND_DIR%\dist\index.js" (
    echo [ERROR] Backend build not found. Please run start-build.bat first.
    pause
    exit /b 1
)
echo   [OK] Backend build found
if not exist "%FRONTEND_DIR%\dist\index.html" (
    echo [ERROR] Frontend build not found. Please run start-build.bat first.
    pause
    exit /b 1
)
echo   [OK] Frontend build found

:: 3. Initialize database
cd /d "%BACKEND_DIR%"
echo [3/5] Initializing database...

if not exist "node_modules" (
    echo [INFO] Installing backend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)

:: Push schema
call npx prisma db push --accept-data-loss
if errorlevel 1 (
    echo [WARN] prisma db push failed, retrying...
    timeout /t 2 /nobreak >nul
    call npx prisma db push --accept-data-loss
    if errorlevel 1 (
        echo [ERROR] prisma db push failed
        pause
        exit /b 1
    )
)
echo   [OK] Database schema pushed

:: Kill any lingering node processes and clean stale prisma artifacts
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
if exist "node_modules\.prisma" rmdir /s /q "node_modules\.prisma" 2>nul

:: Generate Prisma client
call npx prisma generate
if errorlevel 1 (
    echo [WARN] prisma generate failed, retrying...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
    if exist "node_modules\.prisma" rmdir /s /q "node_modules\.prisma" 2>nul
    call npx prisma generate
    if errorlevel 1 (
        echo [ERROR] prisma generate failed after retry
        pause
        exit /b 1
    )
)
echo   [OK] Prisma Client ready

:: 4. Seed demo data
echo [4/5] Seeding demo data...
call npx tsx src/utils/seed.ts
if errorlevel 1 (
    echo [ERROR] Demo data seed failed
    pause
    exit /b 1
)
echo   [OK] Demo data seeded

cd /d "%SCRIPT_DIR%"

:: 5. Start services
echo [5/5] Starting services...

:: Stop any leftovers on our ports first
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%API_PORT% "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT% "') do taskkill /F /PID %%a >nul 2>&1

set BACKEND_LOG=%LOG_DIR%\backend.log
set FRONTEND_LOG=%LOG_DIR%\frontend.log

:: Launch backend (hidden)
powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c cd /d \"!BACKEND_DIR!\" && set PORT=!API_PORT! && node dist/index.js >> \"!BACKEND_LOG!\" 2>&1' -WindowStyle Hidden"

:: Launch frontend (hidden)
powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c cd /d \"!FRONTEND_DIR!\" && node serve.cjs >> \"!FRONTEND_LOG!\" 2>&1' -WindowStyle Hidden"

echo   [OK] Backend started - http://localhost:!API_PORT!/api
echo   [OK] Frontend started - http://localhost:!FRONTEND_PORT!

echo ================================================
echo   EM-AI Demo is running (production mode)
echo.
echo   Frontend:    http://localhost:%FRONTEND_PORT%
echo   Backend API: http://localhost:%API_PORT%/api/health
echo   Backend log: %BACKEND_LOG%
echo   Frontend log:%FRONTEND_LOG%
echo.
echo   Close this window or press Ctrl+C to stop
echo ================================================
echo.

:: Guardian loop (check every 30s via port)
:guard
timeout /t 30 /nobreak >nul

netstat -ano | findstr ":%API_PORT% " >nul
if errorlevel 1 (
    echo [!date! !time!] Backend port !API_PORT! not responding, restarting...
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c cd /d \"!BACKEND_DIR!\" && set PORT=!API_PORT! && node dist/index.js >> \"!BACKEND_LOG!\" 2>&1' -WindowStyle Hidden"
)

netstat -ano | findstr ":%FRONTEND_PORT% " >nul
if errorlevel 1 (
    echo [!date! !time!] Frontend port !FRONTEND_PORT! not responding, restarting...
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c cd /d \"!FRONTEND_DIR!\" && node serve.cjs >> \"!FRONTEND_LOG!\" 2>&1' -WindowStyle Hidden"
)

goto guard
endlocal
