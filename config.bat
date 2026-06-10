@echo off
REM Read ports from config.json using PowerShell
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "try { (Get-Content '%~dp0config.json' | ConvertFrom-Json).API_PORT } catch { '' }"') do set "API_PORT=%%a"
for /f "tokens=*" %%b in ('powershell -NoProfile -Command "try { (Get-Content '%~dp0config.json' | ConvertFrom-Json).FRONTEND_PORT } catch { '' }"') do set "FRONTEND_PORT=%%b"
if not defined API_PORT set API_PORT=5273
if not defined FRONTEND_PORT set FRONTEND_PORT=5173
