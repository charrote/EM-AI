@echo off
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%backend
set FRONTEND_DIR=%SCRIPT_DIR%frontend

echo ================================================
echo   EM-AI Production Build
echo ================================================
echo.

:: 1. Install dependencies
echo [1/4] Installing backend dependencies...
cd /d "%BACKEND_DIR%"
call npm install
if errorlevel 1 (
    echo [ERROR] Backend npm install failed
    exit /b 1
)
echo   [OK]

echo [2/4] Installing frontend dependencies...
cd /d "%FRONTEND_DIR%"
call npm install
if errorlevel 1 (
    echo [ERROR] Frontend npm install failed
    exit /b 1
)
echo   [OK]

:: 2. Generate Prisma client
echo [2/4] Generating Prisma client...
cd /d "%BACKEND_DIR%"
set PRISMA_RETRY=0
:prisma_gen_retry
call npx prisma generate
if not errorlevel 1 goto prisma_gen_ok
set /a PRISMA_RETRY+=1
if !PRISMA_RETRY! geq 3 (
    echo [ERROR] prisma generate failed after !PRISMA_RETRY! retries
    exit /b 1
)
echo   [WARN] prisma generate failed, retrying (!PRISMA_RETRY!/3)...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
if exist "node_modules\.prisma" rmdir /s /q "node_modules\.prisma" 2>nul
goto prisma_gen_retry
:prisma_gen_ok
echo   [OK]

:: 3. Build backend
echo [3/4] Building backend...
cd /d "%BACKEND_DIR%"
call npx tsc
if errorlevel 1 (
    echo [ERROR] Backend build failed
    exit /b 1
)
echo   [OK]

:: 4. Build frontend
echo [4/4] Building frontend...
cd /d "%FRONTEND_DIR%"
call npx vite build
if errorlevel 1 (
    echo [ERROR] Frontend build failed
    exit /b 1
)
echo   [OK]

echo ================================================
echo   Build complete!
echo   Backend: %BACKEND_DIR%\dist\
echo   Frontend: %FRONTEND_DIR%\dist\
echo ================================================
endlocal
