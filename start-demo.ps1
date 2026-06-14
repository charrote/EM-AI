<#
.SYNOPSIS
  EM-AI Demo 一键启动脚本 (Windows)
  支持 SSH 远程执行 + 进程守护 (自动重启崩溃的服务)
.PARAMETER Daemon
  以守护进程模式启动 (后台运行，断开 SSH 后服务不停止)
  使用 .\stop-demo.ps1 停止服务
.EXAMPLE
  .\start-demo.ps1              # 前台运行 (带进程守护)
  .\start-demo.ps1 -Daemon      # 后台守护模式 (适合 SSH)
#>

param([switch]$Daemon)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"
$LogDir = Join-Path $ScriptDir "logs"

# ============================================================
# DAEMON 模式：在隐藏窗口中启动 Supervisor 进程
# ============================================================
if ($Daemon) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    $null = Start-Process powershell.exe -ArgumentList @(
        "-NoProfile", "-ExecutionPolicy", "Bypass",
        "-File", "`"$PSCommandPath`""
    ) -WindowStyle Hidden -WorkingDirectory $ScriptDir
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  EM-AI Demo 后台守护进程已启动" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  后端日志: $LogDir\backend.log"
    Write-Host "  前端日志: $LogDir\frontend.log"
    Write-Host "  守护日志: $LogDir\supervisor.log"
    Write-Host ""
    Write-Host "  使用 .\stop-demo.ps1 停止服务" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Cyan
    exit
}

# ============================================================
# 确保日志目录
# ============================================================
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$BackendLog = Join-Path $LogDir "backend.log"
$FrontendLog = Join-Path $LogDir "frontend.log"
$SupervisorLog = Join-Path $LogDir "supervisor.log"

function Log {
    param($Msg)
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$time $Msg" | Out-File -Append $SupervisorLog -Encoding UTF8
}

function PrintAndLog {
    param($Msg, $Color)
    Log $Msg
    if ($Color) { Write-Host $Msg -ForegroundColor $Color }
    else { Write-Host $Msg }
}

# ============================================================
# 0. 环境检查 & 设置
# ============================================================
PrintAndLog "================================================" Cyan
PrintAndLog "  EM-AI 演示系统启动脚本 (Windows 进程守护版)" Cyan
PrintAndLog "================================================" Cyan

# 检查 Node.js
try {
    $nodeVersion = node --version
    PrintAndLog "[1/5] 检查环境...  $nodeVersion" Green
} catch {
    PrintAndLog "[错误] 需要安装 Node.js (>= 18)" Red
    exit 1
}

# 设置 DATABASE_URL
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = "file:./dev.db"
    Log "DATABASE_URL = $($env:DATABASE_URL)"
}

# 确保 .env 文件存在
$envFile = Join-Path $BackendDir ".env"
if (-not (Test-Path $envFile)) {
    "DATABASE_URL=`"file:./dev.db`"" | Out-File $envFile -Encoding ASCII
    PrintAndLog "[信息] 已创建 .env 文件" Yellow
}

# ============================================================
# 1. 安装后端依赖
# ============================================================
PrintAndLog "[2/5] 安装后端依赖 & 初始化数据库..." Yellow
Push-Location $BackendDir

$installLog = Join-Path $LogDir "npm-install.log"
npm install --silent 2>&1 | Out-File $installLog -Encoding UTF8
if ($LASTEXITCODE -ne 0) {
    PrintAndLog "[错误] npm install 失败，请查看 $installLog" Red
    Pop-Location
    exit 1
}
PrintAndLog "  ✓ 依赖安装完成" Green

# ============================================================
# 2. 初始化数据库
# ============================================================
$genLog = Join-Path $LogDir "prisma-generate.log"
npx prisma generate 2>&1 | Out-File $genLog -Encoding UTF8
if ($LASTEXITCODE -ne 0) {
    PrintAndLog "[错误] prisma generate 失败，请查看 $genLog" Red
    Pop-Location
    exit 1
}
PrintAndLog "  ✓ Prisma Client 生成完成" Green

$pushLog = Join-Path $LogDir "prisma-push.log"
npx prisma db push --accept-data-loss 2>&1 | Out-File $pushLog -Encoding UTF8
if ($LASTEXITCODE -ne 0) {
    PrintAndLog "[错误] prisma db push 失败，请查看 $pushLog" Red
    Pop-Location
    exit 1
}
PrintAndLog "  ✓ 数据库 Schema 推送完成" Green
Pop-Location

# ============================================================
# 3. 注入演示数据
# ============================================================
PrintAndLog "[3/5] 注入演示数据..." Yellow
Push-Location $BackendDir

$seedLog = Join-Path $LogDir "seed.log"
npx tsx src/utils/seed.ts 2>&1 | Out-File $seedLog -Encoding UTF8
if ($LASTEXITCODE -ne 0) {
    PrintAndLog "[错误] 演示数据注入失败，请查看 $seedLog" Red
    Pop-Location
    exit 1
}
PrintAndLog "  ✓ 演示数据就绪" Green
Pop-Location

# ============================================================
# 4. 启动服务 & 进程守护
# ============================================================
PrintAndLog "[4/5] 启动服务..." Yellow

function Start-GuardedService {
    param($Name, $WorkDir, $File, $Args, $LogFile)
    $quotedArgs = $Args | ForEach-Object {
        if ($_ -match '\s') { "`"$_`"" } else { $_ }
    }
    $cmdLine = "`"$File`" $quotedArgs >> `"$LogFile`" 2>&1"
    $p = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmdLine `
        -WorkingDirectory $WorkDir -WindowStyle Hidden -PassThru
    Log "服务 [$Name] 已启动 (PID: $($p.Id))"
    return $p
}

# 读取端口配置
$ConfigJson = Get-Content (Join-Path $ScriptDir "config.json") | ConvertFrom-Json
$ApiPort = $ConfigJson.API_PORT
$FrontendPort = $ConfigJson.FRONTEND_PORT
if (-not $ApiPort) { $ApiPort = 5174 }
if (-not $FrontendPort) { $FrontendPort = 5173 }

# 清理旧进程
$portTargets = @($ApiPort, $FrontendPort)
foreach ($port in $portTargets) {
    try {
        $connections = netstat -ano 2>$null | Select-String ":$port\s+"
        foreach ($conn in $connections) {
            $pid = ($conn -split '\s+')[-1]
            if ($pid -match '^\d+$') {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Log "已清理端口 $port (PID: $pid)"
            }
        }
    } catch { }
}
Start-Sleep -Seconds 1

$backendProc = Start-GuardedService "Backend" $BackendDir "npx" @("tsx", "src/index.ts") $BackendLog
$frontendProc = Start-GuardedService "Frontend" $FrontendDir "npm" @("run", "dev") $FrontendLog

# ============================================================
# 5. 输出访问信息
# ============================================================
PrintAndLog "[5/5] 启动完成!" Green
PrintAndLog "================================================" Cyan
PrintAndLog "  EM-AI 演示系统运行中" Green
PrintAndLog ""

PrintAndLog "  前端:       http://localhost:$FrontendPort"
PrintAndLog "  后端:       http://localhost:${ApiPort}/api/health"
PrintAndLog "  后端日志:   $BackendLog"
PrintAndLog "  前端日志:   $FrontendLog"
PrintAndLog "  守护日志:   $SupervisorLog"
PrintAndLog ""
PrintAndLog "  按 Ctrl+C 停止所有服务 (前台模式)"
PrintAndLog "  使用 .\stop-demo.ps1 停止服务 (后台模式)"
PrintAndLog "================================================" Cyan

# ============================================================
# 进程守护循环 (自动重启崩溃的服务)
# ============================================================
$restartWindow = @{ Backend = @(); Frontend = @() }
$MAX_RESTARTS = 5
$RESTART_WINDOW_SEC = 60

function Should-Backoff {
    param($Name)
    $now = Get-Date
    $restartWindow[$Name] = $restartWindow[$Name] | Where-Object { ($now - $_).TotalSeconds -le $RESTART_WINDOW_SEC }
    if ($restartWindow[$Name].Count -ge $MAX_RESTARTS) {
        return $true
    }
    return $false
}

try {
    while ($true) {
        # 检查后端
        if ($backendProc.HasExited) {
            $exitCode = $backendProc.ExitCode
            Log "[警告] 后端崩溃 (exit code: $exitCode)"
            if (Should-Backoff "Backend") {
                $wait = 30
                Log "[守护] 后端 $RESTART_WINDOW_SEC 秒内重启超过 $MAX_RESTARTS 次，等待 ${wait}s..."
                Start-Sleep -Seconds $wait
            }
            Start-Sleep -Seconds 2
            $restartWindow.Backend += (Get-Date)
            $backendProc = Start-GuardedService "Backend" $BackendDir "npx" @("tsx", "src/index.ts") $BackendLog
            PrintAndLog "[守护] 后端已自动重启" Yellow
        }

        # 检查前端
        if ($frontendProc.HasExited) {
            $exitCode = $frontendProc.ExitCode
            Log "[警告] 前端崩溃 (exit code: $exitCode)"
            if (Should-Backoff "Frontend") {
                $wait = 30
                Log "[守护] 前端 $RESTART_WINDOW_SEC 秒内重启超过 $MAX_RESTARTS 次，等待 ${wait}s..."
                Start-Sleep -Seconds $wait
            }
            Start-Sleep -Seconds 2
            $restartWindow.Frontend += (Get-Date)
            $frontendProc = Start-GuardedService "Frontend" $FrontendDir "npm" @("run", "dev") $FrontendLog
            PrintAndLog "[守护] 前端已自动重启" Yellow
        }

        Start-Sleep -Seconds 5
    }
}
catch {
    Log "[FATAL] 守护进程异常: $_"
    PrintAndLog "[FATAL] 守护进程异常: $_" Red
}
finally {
    # 清理子进程
    if ($backendProc -and -not $backendProc.HasExited) { $backendProc.Kill() }
    if ($frontendProc -and -not $frontendProc.HasExited) { $frontendProc.Kill() }
    Log "=== EM-AI Demo 已停止 ==="
}
