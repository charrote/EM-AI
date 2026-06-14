@echo off
title UantekEM-AI
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -Command "$Host.UI.RawUI.WindowTitle = 'UantekEM-AI'" >nul 2>&1
cd /d "%~dp0"
call "%~dp0config.bat"

:: Ensure Node.js is in PATH
where node >nul 2>&1 || set "PATH=D:\Program Files\nodejs;C:\Program Files\nodejs;%PATH%"

echo ================================================
echo   UantekEM-AI Development Mode
echo ================================================
echo.

:: Check node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found
    pause
    exit /b 1
)

:: Install deps if needed
if not exist "backend\node_modules" (
    echo [1/3] Installing backend dependencies...
    cd backend
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed in backend
        pause
        exit /b 1
    )
    cd ..
)
if not exist "frontend\node_modules" (
    echo [2/3] Installing frontend dependencies...
    cd frontend
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed in frontend
        pause
        exit /b 1
    )
    cd ..
)

:: Init DB + seed
echo [3/3] Initializing database...
cd backend
call npx prisma db push --accept-data-loss >nul 2>&1
if errorlevel 1 (
    echo [WARN] DB push failed, retrying...
    timeout /t 2 /nobreak >nul
    call npx prisma db push --accept-data-loss >nul 2>&1
)
call npx prisma generate >nul 2>&1
call npx tsx src/utils/seed.ts >nul 2>&1
cd ..

:: Kill any leftovers on our ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%API_PORT% "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT% "') do taskkill /F /PID %%a >nul 2>&1

echo.
echo Starting services...
echo.

:: Launch backend (hidden)
powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c cd /d \"%CD%\backend\" && title UantekEM-AI Backend && npm run dev' -WindowStyle Hidden"

:: Launch frontend (hidden)
powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c cd /d \"%CD%\frontend\" && title UantekEM-AI Frontend && npm run dev' -WindowStyle Hidden"

echo ================================================
echo   Backend:  http://localhost:%API_PORT%/api
echo   Frontend: http://localhost:%FRONTEND_PORT%
echo.
echo   Close the two new windows to stop.
echo ================================================
echo.
pause
