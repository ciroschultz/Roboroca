$ErrorActionPreference = "Continue"

function Write-OK { param([string]$T) Write-Host "[OK] $T" -ForegroundColor Green }
function Write-Step { param([string]$T) Write-Host ">> $T" -ForegroundColor Yellow }

$UserHome = $env:USERPROFILE

# 1. Copiar Roboroça
Write-Step "Copiando Roboroça (excluindo node_modules, venv, .next, uploads, .git, *.pt, roboroca.db)..."
$src = Join-Path $UserHome "Roboroça"
$dst = "E:\migracao\projetos\Roboroça"
robocopy $src $dst /E /NP /NFL /NDL /XD node_modules venv .next __pycache__ uploads .git /XF *.pyc *.pyo *.pt nul roboroca.db .env
Write-OK "Roboroça copiado"

# 2. Copiar Renovacampo
Write-Step "Copiando Renovacampo (excluindo node_modules, target, .git)..."
$src2 = Join-Path $UserHome "Renovacampo"
$dst2 = "E:\migracao\projetos\Renovacampo"
robocopy $src2 $dst2 /E /NP /NFL /NDL /XD node_modules target __pycache__ .git /XF *.pyc *.class nul .env
Write-OK "Renovacampo copiado"

# 3. Copiar .claude (seletivo)
Write-Step "Copiando .claude (excluindo cache, transient)..."
$src3 = Join-Path $UserHome ".claude"
$dst3 = "E:\migracao\config\.claude"
robocopy $src3 $dst3 /E /NP /NFL /NDL /XD cache debug file-history paste-cache shell-snapshots statsig telemetry todos tasks
Write-OK ".claude copiado"

# 4. Copiar .ssh
Write-Step "Copiando .ssh..."
$src4 = Join-Path $UserHome ".ssh"
$dst4 = "E:\migracao\config\.ssh"
if (Test-Path $src4) {
    Copy-Item -Path $src4 -Destination $dst4 -Recurse -Force
    Write-OK ".ssh copiado"
}

# 5. Copiar setup-novo-pc.ps1
Write-Step "Copiando setup-novo-pc.ps1..."
$setupSrc = Join-Path $UserHome "Roboroça\setup-novo-pc.ps1"
if (Test-Path $setupSrc) {
    Copy-Item $setupSrc "E:\migracao\setup-novo-pc.ps1" -Force
    Write-OK "setup-novo-pc.ps1 copiado"
}

# 6. Salvar chave Windows
Write-Step "Salvando chave Windows..."
"VVV4V-N6XMJ-2TVT9-JBXJR-PPKVQ" | Out-File "E:\migracao\chave-windows.txt" -Encoding UTF8
Write-OK "Chave salva"

# 7. Resumo
Write-Host ""
Write-Host "=== RESUMO ===" -ForegroundColor Cyan
Get-ChildItem "E:\migracao" -Recurse -Directory -Depth 1 | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($size / 1MB, 1)
    Write-Host "  $($_.Name): $sizeMB MB" -ForegroundColor White
}
$total = (Get-ChildItem "E:\migracao" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host "  TOTAL: $([math]::Round($total / 1MB, 1)) MB" -ForegroundColor Green
