@echo off
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0

set BACKEND_DIR=%SCRIPT_DIR%backend
set FRONTEND_DIR=%SCRIPT_DIR%frontend
set LOG_DIR=%SCRIPT_DIR%logs
set PID_BACKEND=%SCRIPT_DIR%.pid_backend
set PID_FRONTEND=%SCRIPT_DIR%.pid_frontend

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
cd /d "%SCRIPT_DIR%"

echo ================================================
echo   EM-AI Demo Startup Script (Windows)
echo ================================================
echo.

:: 1. Check Node.js
echo [1/5] Checking environment...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found, please install Node.js ^>= 18
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo   Node.js !NODE_VER!
echo   DATABASE_URL = file:./dev.db

:: Ensure .env
if not exist "%BACKEND_DIR%\.env" (
    echo DATABASE_URL="file:./dev.db" > "%BACKEND_DIR%\.env"
    echo   [INFO] Created .env file
)

:: 2. Install dependencies
echo [2/5] Installing dependencies...

cd /d "%BACKEND_DIR%"
call npm install 2>&1
if errorlevel 1 (
    echo [ERROR] Backend npm install failed
    pause
    exit /b 1
)
echo   [OK] Backend dependencies installed

cd /d "%FRONTEND_DIR%"
call npm install 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend npm install failed
    pause
    exit /b 1
)
echo   [OK] Frontend dependencies installed

:: 3. Initialize database
cd /d "%BACKEND_DIR%"
echo [3/5] Initializing database...

:: Clean stale locks (robust, handles EPERM file locks)
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma" 2>nul
    if exist "node_modules\.prisma" (
        powershell -NoProfile -Command "Remove-Item -Path 'node_modules\.prisma' -Recurse -Force -ErrorAction SilentlyContinue" >nul 2>&1
    )
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
echo   [WARN] prisma generate failed, killing stale Node processes and retrying (!PRISMA_RETRY!/3)...
call "%SCRIPT_DIR%stop-service.bat"
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma" 2>nul
    if exist "node_modules\.prisma" (
        powershell -NoProfile -Command "Remove-Item -Path 'node_modules\.prisma' -Recurse -Force -ErrorAction SilentlyContinue" >nul 2>&1
    )
)
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

:: 5. Start services with hidden windows
echo [4/5] Starting services...

set BACKEND_LOG=%LOG_DIR%\backend.log
set FRONTEND_LOG=%LOG_DIR%\frontend.log

:: Launch backend via PowerShell (hidden window, get PID)
powershell -NoProfile -Command "$p = Start-Process -FilePath cmd.exe -ArgumentList '/c','npx tsx src/index.ts >> \"%BACKEND_LOG%\" 2>&1' -WorkingDirectory '%BACKEND_DIR%' -WindowStyle Hidden -PassThru; $p.Id | Out-File '%PID_BACKEND%' -Encoding ASCII"
set /p BACKEND_PID=<%PID_BACKEND%

:: Launch frontend via PowerShell (hidden window, get PID)
powershell -NoProfile -Command "$p = Start-Process -FilePath cmd.exe -ArgumentList '/c','npm run dev >> \"%FRONTEND_LOG%\" 2>&1' -WorkingDirectory '%FRONTEND_DIR%' -WindowStyle Hidden -PassThru; $p.Id | Out-File '%PID_FRONTEND%' -Encoding ASCII"
set /p FRONTEND_PID=<%PID_FRONTEND%

echo   [OK] Backend started (PID: !BACKEND_PID!)
echo   [OK] Frontend started (PID: !FRONTEND_PID!)

echo [5/5] Done!
echo ================================================
echo   EM-AI Demo is running
echo.
echo   Frontend:    http://localhost:5173
echo   Backend:     http://localhost:8080/api/health
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
    powershell -NoProfile -Command "$p = Start-Process -FilePath cmd.exe -ArgumentList '/c','npx tsx src/index.ts >> \"%BACKEND_LOG%\" 2>&1' -WorkingDirectory '%BACKEND_DIR%' -WindowStyle Hidden -PassThru; $p.Id | Out-File '%PID_BACKEND%' -Encoding ASCII"
    set /p BACKEND_PID=<%PID_BACKEND%
    echo [%date% %time%] [Guardian] Backend restarted (PID: !BACKEND_PID!)
)

:: Check frontend
tasklist /FI "PID eq !FRONTEND_PID!" 2>nul | findstr "!FRONTEND_PID!" >nul
if errorlevel 1 (
    echo [%date% %time%] [Guardian] Frontend crashed, restarting...
    powershell -NoProfile -Command "$p = Start-Process -FilePath cmd.exe -ArgumentList '/c','npm run dev >> \"%FRONTEND_LOG%\" 2>&1' -WorkingDirectory '%FRONTEND_DIR%' -WindowStyle Hidden -PassThru; $p.Id | Out-File '%PID_FRONTEND%' -Encoding ASCII"
    set /p FRONTEND_PID=<%PID_FRONTEND%
    echo [%date% %time%] [Guardian] Frontend restarted (PID: !FRONTEND_PID!)
)

goto guard

endlocal
