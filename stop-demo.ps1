<#
.SYNOPSIS
  EM-AI Demo 停止脚本 (Windows)
  停止所有通过 start-demo.ps1 启动的服务
.EXAMPLE
  .\stop-demo.ps1
#>

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  正在停止 EM-AI Demo 服务..." -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigJson = Get-Content (Join-Path $ScriptDir "config.json") -ErrorAction SilentlyContinue | ConvertFrom-Json
$ApiPort = if ($ConfigJson) { $ConfigJson.API_PORT } else { $null }
$FrontendPort = if ($ConfigJson) { $ConfigJson.FRONTEND_PORT } else { $null }
if (-not $ApiPort) { $ApiPort = 5174 }
if (-not $FrontendPort) { $FrontendPort = 5173 }

$stopped = $false

# -- 通过端口查找并杀进程 --
$portTargets = @(
    @{ Port = $ApiPort; Name = "后端 (port $ApiPort)" }
    @{ Port = $FrontendPort; Name = "前端 (port $FrontendPort)" }
)

foreach ($target in $portTargets) {
    try {
        $connections = netstat -ano 2>$null | Select-String ":$($target.Port)\s+"
        foreach ($conn in $connections) {
            $parts = $conn -split '\s+'
            $pid = $parts[-1]
            if ($pid -and $pid -match '^\d+$') {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc) {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "  ✓ $($target.Name) 已停止 (PID: $pid)" -ForegroundColor Green
                    $stopped = $true
                }
            }
        }
    } catch {
        # 忽略 netstat 错误
    }
}

# -- 通过进程名查找并杀进程 (兜底) --
$processTargets = @(
    @{ Filter = { $_.CommandLine -like "*tsx*src/index.ts*" }; Name = "后端服务" }
    @{ Filter = { $_.CommandLine -like "*vite*" -and $_.CommandLine -like "*frontend*" }; Name = "前端服务" }
)

try {
    $processes = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue
    foreach ($proc in $processes) {
        foreach ($target in $processTargets) {
            if (& $target.Filter) {
                Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
                Write-Host "  ✓ $($target.Name) 已停止 (PID: $($proc.ProcessId))" -ForegroundColor Green
                $stopped = $true
            }
        }
    }
} catch {
    Write-Host "  [!] 进程名查找失败 (可能需要管理员权限): $_" -ForegroundColor Yellow
}

# -- 杀掉守护进程 (父 PowerShell) --
try {
    $parentProcs = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue
    $currentPid = $PID
    foreach ($proc in $parentProcs) {
        if ($proc.CommandLine -like "*start-demo.ps1*" -and $proc.ProcessId -ne $currentPid) {
            Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
            Write-Host "  ✓ 守护进程已停止 (PID: $($proc.ProcessId))" -ForegroundColor Green
            $stopped = $true
        }
    }
} catch {
    # ignore
}

if (-not $stopped) {
    Write-Host "  [!] 未找到运行中的 EM-AI Demo 服务" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "  ✅ 所有服务已停止" -ForegroundColor Green
}

Write-Host "================================================" -ForegroundColor Cyan
