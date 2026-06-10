@echo off
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
call "%SCRIPT_DIR%config.bat"

set PID_BACKEND=%SCRIPT_DIR%.pid_backend
set PID_FRONTEND=%SCRIPT_DIR%.pid_frontend

echo ================================================
echo   Stopping EM-AI Demo services...
echo ================================================

set STOPPED=0

:: Kill by saved PIDs
if exist "%PID_BACKEND%" (
    set /p PID=<%PID_BACKEND%
    taskkill /F /PID !PID! >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK] Backend stopped (PID: !PID!)
        set STOPPED=1
    )
    del "%PID_BACKEND%" 2>nul
)

if exist "%PID_FRONTEND%" (
    set /p PID=<%PID_FRONTEND%
    taskkill /F /PID !PID! >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK] Frontend stopped (PID: !PID!)
        set STOPPED=1
    )
    del "%PID_FRONTEND%" 2>nul
)

:: Fallback: kill by port
for %%p in (%API_PORT% %FRONTEND_PORT%) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p "') do (
        taskkill /F /PID %%a >nul 2>&1
        if !errorlevel! equ 0 (
            echo   [OK] Port %%p stopped (PID: %%a)
            set STOPPED=1
        )
    )
)

if !STOPPED! equ 0 (
    echo   [!] No running EM-AI Demo services found
) else (
    echo.
    echo   All services stopped
)

echo ================================================
endlocal
