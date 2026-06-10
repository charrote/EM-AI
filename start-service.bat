@echo off
setlocal enabledelayedexpansion

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

:: Ensure node_modules and prisma client exist
if not exist "node_modules" (
    echo [INFO] Installing backend dependencies...
    call npm install
)
if not exist "node_modules\.prisma" (
    call npx prisma generate
)

set PRISMA_RETRY=0
:prisma_retry
call npx prisma generate
if not errorlevel 1 goto prisma_ok
set /a PRISMA_RETRY+=1
if !PRISMA_RETRY! geq 3 (
    echo [ERROR] prisma generate failed after !PRISMA_RETRY! retries
    pause
    exit /b 1
)
echo   [WARN] prisma generate failed, retrying (!PRISMA_RETRY!/3)...
call "%SCRIPT_DIR%stop-service.bat"
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
goto prisma_retry
:prisma_ok
echo   [OK] Prisma Client generated

call npx prisma db push --accept-data-loss
if errorlevel 1 (
    echo [ERROR] prisma db push failed
    pause
    exit /b 1
)
echo   [OK] Database schema pushed

:: 4. Seed demo data
echo [4/5] Seeding demo data...
set SEED_LOG=%LOG_DIR%\seed.log
call npx tsx src/utils/seed.ts > "%SEED_LOG%" 2>&1
if errorlevel 1 (
    type "%SEED_LOG%"
    echo [ERROR] Demo data seed failed
    pause
    exit /b 1
)
echo   [OK] Demo data seeded

cd /d "%SCRIPT_DIR%"

:: 5. Start services
echo [5/5] Starting services...

set BACKEND_LOG=%LOG_DIR%\backend.log
set FRONTEND_LOG=%LOG_DIR%\frontend.log

:: Launch backend
powershell -NoProfile -Command "$p = Start-Process -FilePath cmd.exe -ArgumentList '/c','set PORT=%API_PORT% && node dist/index.js >> \"%BACKEND_LOG%\" 2>&1' -WorkingDirectory '%BACKEND_DIR%' -WindowStyle Hidden -PassThru; $p.Id | Out-File '%PID_BACKEND%' -Encoding ASCII"
set /p BACKEND_PID=<%PID_BACKEND%

:: Launch frontend (static server + /api proxy)
powershell -NoProfile -Command "$p = Start-Process -FilePath cmd.exe -ArgumentList '/c','node serve.cjs >> \"%FRONTEND_LOG%\" 2>&1' -WorkingDirectory '%FRONTEND_DIR%' -WindowStyle Hidden -PassThru; $p.Id | Out-File '%PID_FRONTEND%' -Encoding ASCII"
set /p FRONTEND_PID=<%PID_FRONTEND%

echo   [OK] Backend started (PID: !BACKEND_PID!) - http://localhost:!API_PORT!/api
echo   [OK] Frontend started (PID: !FRONTEND_PID!) - http://localhost:!FRONTEND_PORT!

echo ================================================
echo   EM-AI Demo is running (production mode)
echo.
echo   Frontend:    http://localhost:!FRONTEND_PORT!
echo   Backend API: http://localhost:!API_PORT!/api/health
echo   Backend log: %BACKEND_LOG%
echo   Frontend log:%FRONTEND_LOG%
echo.
echo   Press Ctrl+C to stop all services
echo ================================================
echo.
echo [Guardian] Monitoring processes (check every 10s)...

:guard
timeout /t 10 /nobreak >nul

:: Check backend
tasklist /FI "PID eq !BACKEND_PID!" 2>nul | findstr "!BACKEND_PID!" >nul
if errorlevel 1 (
    echo [%date% %time%] [Guardian] Backend crashed, restarting...
    powershell -NoProfile -Command "$p = Start-Process -FilePath cmd.exe -ArgumentList '/c','set PORT=%API_PORT% && node dist/index.js >> \"%BACKEND_LOG%\" 2>&1' -WorkingDirectory '%BACKEND_DIR%' -WindowStyle Hidden -PassThru; $p.Id | Out-File '%PID_BACKEND%' -Encoding ASCII"
    set /p BACKEND_PID=<%PID_BACKEND%
    echo [%date% %time%] [Guardian] Backend restarted (PID: !BACKEND_PID!)
)

:: Check frontend
tasklist /FI "PID eq !FRONTEND_PID!" 2>nul | findstr "!FRONTEND_PID!" >nul
if errorlevel 1 (
    echo [%date% %time%] [Guardian] Frontend crashed, restarting...
    powershell -NoProfile -Command "$p = Start-Process -FilePath cmd.exe -ArgumentList '/c','node serve.cjs >> \"%FRONTEND_LOG%\" 2>&1' -WorkingDirectory '%FRONTEND_DIR%' -WindowStyle Hidden -PassThru; $p.Id | Out-File '%PID_FRONTEND%' -Encoding ASCII"
    set /p FRONTEND_PID=<%PID_FRONTEND%
    echo [%date% %time%] [Guardian] Frontend restarted (PID: !FRONTEND_PID!)
)

goto guard

endlocal