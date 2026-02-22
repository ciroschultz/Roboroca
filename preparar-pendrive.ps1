#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Prepara o pendrive com os dados para migração para o Acer Nitro.
    RODAR NESTE PC (Windows 10 atual).

.DESCRIPTION
    1. Formata o pendrive como NTFS (necessário para arquivos > 4GB)
    2. Copia projetos (Roboroça, Renovacampo) excluindo node_modules, venv, etc.
    3. Copia .claude (memória, configs, plugins — exclui cache/transient)
    4. Copia .ssh
    5. Gera o script setup-novo-pc.ps1 dentro do pendrive

.NOTES
    Executar como Administrador (necessário para formatar pendrive).
    Uso: powershell -ExecutionPolicy Bypass -File preparar-pendrive.ps1
#>

$ErrorActionPreference = "Stop"

# ============================================================
# CONFIGURAÇÃO
# ============================================================
$UserHome = $env:USERPROFILE  # C:\Users\ciroa
$PendriveLetter = "E"

# Projetos a copiar
$Projetos = @(
    @{
        Nome   = "Roboroça"
        Origem = "$UserHome\Roboroça"
        Excluir = @(
            "node_modules", "venv", ".next", "__pycache__",
            "*.pyc", "*.pyo", ".env", "roboroca.db",
            "uploads", "*.pt", "nul"
        )
    },
    @{
        Nome   = "Renovacampo"
        Origem = "$UserHome\Renovacampo"
        Excluir = @(
            "node_modules", "target", "__pycache__",
            "*.pyc", "*.class", "nul", ".env"
        )
    }
)

# Pastas de config a copiar
$ConfigPastas = @(
    @{
        Nome   = ".ssh"
        Origem = "$UserHome\.ssh"
    }
)

# .claude — copiar seletivamente (excluir cache/transient pesados)
$ClaudeOrigem = "$UserHome\.claude"
$ClaudeExcluir = @(
    "cache", "debug", "file-history", "paste-cache",
    "shell-snapshots", "statsig", "telemetry", "todos", "tasks"
)

# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

function Write-Header {
    param([string]$Texto)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "  $Texto" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Texto)
    Write-Host "  >> $Texto" -ForegroundColor Yellow
}

function Write-OK {
    param([string]$Texto)
    Write-Host "  [OK] $Texto" -ForegroundColor Green
}

function Write-Erro {
    param([string]$Texto)
    Write-Host "  [ERRO] $Texto" -ForegroundColor Red
}

function Get-FolderSizeMB {
    param([string]$Path)
    $size = (Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue |
             Measure-Object -Property Length -Sum).Sum
    return [math]::Round($size / 1MB, 1)
}

function Copy-WithExclusions {
    param(
        [string]$Source,
        [string]$Destination,
        [string[]]$ExcludeNames
    )

    if (!(Test-Path $Source)) {
        Write-Erro "Origem nao encontrada: $Source"
        return
    }

    # Criar destino
    if (!(Test-Path $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }

    # Usar robocopy para cópia eficiente com exclusões
    $excludeDirs = @()
    $excludeFiles = @()

    foreach ($exc in $ExcludeNames) {
        if ($exc -match '^\*\.') {
            # É padrão de arquivo (*.pyc, *.pt, etc.)
            $excludeFiles += $exc
        }
        else {
            # É nome de pasta
            $excludeDirs += $exc
        }
    }

    $robocopyArgs = @(
        "`"$Source`"",
        "`"$Destination`"",
        "/E",           # Copia subpastas (incluindo vazias)
        "/NP",          # Sem progresso por arquivo (menos spam)
        "/NFL",         # Sem lista de arquivos
        "/NDL",         # Sem lista de diretórios
        "/NJH",         # Sem cabeçalho de job
        "/NJS"          # Sem resumo de job
    )

    if ($excludeDirs.Count -gt 0) {
        $robocopyArgs += "/XD"
        $robocopyArgs += $excludeDirs
    }

    if ($excludeFiles.Count -gt 0) {
        $robocopyArgs += "/XF"
        $robocopyArgs += $excludeFiles
    }

    $robocopyCmd = "robocopy $($robocopyArgs -join ' ')"
    Invoke-Expression $robocopyCmd | Out-Null

    # robocopy retorna exit codes especiais (0-7 = sucesso)
    if ($LASTEXITCODE -le 7) {
        return $true
    }
    else {
        Write-Erro "robocopy falhou com codigo $LASTEXITCODE"
        return $false
    }
}

# ============================================================
# INÍCIO
# ============================================================

Write-Header "PREPARAR PENDRIVE PARA MIGRACAO - Acer Nitro"

# 1. Verificar pendrive
Write-Header "1. Verificando pendrive $PendriveLetter`:"

$drive = Get-Volume -DriveLetter $PendriveLetter -ErrorAction SilentlyContinue
if (!$drive) {
    Write-Erro "Pendrive $PendriveLetter`: nao encontrado!"
    Write-Host "  Conecte o pendrive e tente novamente." -ForegroundColor Gray
    Write-Host "  Se o pendrive tem outra letra, edite `$PendriveLetter no inicio do script." -ForegroundColor Gray
    exit 1
}

$driveType = (Get-Partition -DriveLetter $PendriveLetter | Get-Disk).BusType
Write-Host "  Drive: $PendriveLetter`:" -ForegroundColor White
Write-Host "  Tipo: $driveType" -ForegroundColor White
Write-Host "  Sistema de arquivos: $($drive.FileSystemType)" -ForegroundColor White
Write-Host "  Tamanho: $([math]::Round($drive.Size / 1GB, 1)) GB" -ForegroundColor White
Write-Host "  Livre: $([math]::Round($drive.SizeRemaining / 1GB, 1)) GB" -ForegroundColor White

# 2. Formatar como NTFS
Write-Header "2. Formatando pendrive como NTFS"

if ($drive.FileSystemType -eq "NTFS") {
    Write-Host "  Pendrive ja esta em NTFS. Pular formatacao?" -ForegroundColor Yellow
    $resp = Read-Host "  [S]im para pular / [N]ao para reformatar (S/N)"
    if ($resp -eq "S" -or $resp -eq "s") {
        Write-OK "Pulando formatacao"
    }
    else {
        Write-Step "Formatando..."
        Format-Volume -DriveLetter $PendriveLetter -FileSystem NTFS -NewFileSystemLabel "MIGRACAO" -Confirm:$false
        Write-OK "Formatado como NTFS"
    }
}
else {
    Write-Host ""
    Write-Host "  ATENCAO: Isto vai APAGAR TUDO no pendrive $PendriveLetter`:" -ForegroundColor Red
    Write-Host "  Sistema atual: $($drive.FileSystemType) -> Sera formatado como NTFS" -ForegroundColor Red
    Write-Host ""
    $resp = Read-Host "  Continuar? (S/N)"
    if ($resp -ne "S" -and $resp -ne "s") {
        Write-Host "  Cancelado pelo usuario." -ForegroundColor Gray
        exit 0
    }
    Write-Step "Formatando como NTFS..."
    Format-Volume -DriveLetter $PendriveLetter -FileSystem NTFS -NewFileSystemLabel "MIGRACAO" -Confirm:$false
    Write-OK "Formatado como NTFS"
}

$PendriveRoot = "${PendriveLetter}:\migracao"
New-Item -ItemType Directory -Path $PendriveRoot -Force | Out-Null

# 3. Copiar projetos
Write-Header "3. Copiando projetos"

foreach ($proj in $Projetos) {
    $nome = $proj.Nome
    $origem = $proj.Origem
    $destino = "$PendriveRoot\projetos\$nome"
    $excluir = $proj.Excluir

    if (!(Test-Path $origem)) {
        Write-Erro "$nome nao encontrado em $origem"
        continue
    }

    $tamanhoOrigem = Get-FolderSizeMB $origem
    Write-Step "Copiando $nome ($tamanhoOrigem MB no total, sem exclusoes)..."

    $result = Copy-WithExclusions -Source $origem -Destination $destino -ExcludeNames $excluir

    if ($result) {
        $tamanhoDestino = Get-FolderSizeMB $destino
        Write-OK "$nome copiado: $tamanhoDestino MB (excluindo node_modules, venv, etc.)"
    }
}

# 4. Copiar .claude (seletivo)
Write-Header "4. Copiando .claude (configs, memoria, plugins)"

$claudeDestino = "$PendriveRoot\config\.claude"

if (Test-Path $ClaudeOrigem) {
    $result = Copy-WithExclusions -Source $ClaudeOrigem -Destination $claudeDestino -ExcludeNames $ClaudeExcluir
    if ($result) {
        $tamanho = Get-FolderSizeMB $claudeDestino
        Write-OK ".claude copiado: $tamanho MB"
    }
}
else {
    Write-Erro ".claude nao encontrado em $ClaudeOrigem"
}

# 5. Copiar .ssh
Write-Header "5. Copiando .ssh"

foreach ($cfg in $ConfigPastas) {
    $origem = $cfg.Origem
    $nome = $cfg.Nome
    $destino = "$PendriveRoot\config\$nome"

    if (Test-Path $origem) {
        Copy-Item -Path $origem -Destination $destino -Recurse -Force
        Write-OK "$nome copiado"
    }
    else {
        Write-Erro "$nome nao encontrado em $origem"
    }
}

# 6. Exportar chave Windows
Write-Header "6. Exportando chave do Windows"

try {
    $chave = (Get-WmiObject -Query 'select * from SoftwareLicensingService').OA3xOriginalProductKey
    if ($chave) {
        $chave | Out-File -FilePath "$PendriveRoot\chave-windows.txt" -Encoding UTF8
        Write-OK "Chave exportada para chave-windows.txt"
        Write-Host "  NOTA: Esta e uma licenca OEM deste PC." -ForegroundColor Yellow
        Write-Host "  Pode NAO funcionar no notebook novo." -ForegroundColor Yellow
        Write-Host "  Se nao ativar, instale sem chave (funciona, so tem marca d'agua)." -ForegroundColor Yellow
    }
    else {
        Write-Host "  Nenhuma chave OEM encontrada (pode ser licenca digital)." -ForegroundColor Yellow
        "Nenhuma chave OEM encontrada" | Out-File -FilePath "$PendriveRoot\chave-windows.txt" -Encoding UTF8
    }
}
catch {
    Write-Host "  Nao foi possivel exportar chave: $_" -ForegroundColor Yellow
}

# 7. Gerar inventário do sistema
Write-Header "7. Gerando inventario do sistema"

$inventario = @"
# Inventario do PC Atual - $(Get-Date -Format 'yyyy-MM-dd HH:mm')

## Sistema
- SO: $(Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty Caption) $(Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty Version)
- CPU: $((Get-CimInstance Win32_Processor).Name)
- RAM: $([math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)) GB

## Versoes de Ferramentas
- Python: $(python --version 2>&1)
- Node.js: $(node --version 2>&1)
- npm: $(npm --version 2>&1)
- Git: $(git --version 2>&1)
- GitHub CLI: $(gh --version 2>&1 | Select-Object -First 1)

## Git Config (repo Roboroca)
$(git -C "$UserHome\Roboroça" config user.name 2>&1)
$(git -C "$UserHome\Roboroça" config user.email 2>&1)

## Pacotes Python (Roboroca venv)
$("$UserHome\Roboroça\venv\Scripts\pip.exe" freeze 2>&1)
"@

$inventario | Out-File -FilePath "$PendriveRoot\inventario-sistema.txt" -Encoding UTF8
Write-OK "Inventario salvo"

# 8. Copiar este script e o setup-novo-pc.ps1
Write-Header "8. Copiando scripts de migracao"

# Copiar o próprio script (para referência)
$thisScript = $PSCommandPath
if ($thisScript -and (Test-Path $thisScript)) {
    Copy-Item $thisScript "$PendriveRoot\preparar-pendrive.ps1" -Force
    Write-OK "preparar-pendrive.ps1 copiado"
}

# Copiar setup-novo-pc.ps1 (deve estar no mesmo diretório)
$setupScript = Join-Path (Split-Path $thisScript -Parent) "setup-novo-pc.ps1"
if (Test-Path $setupScript) {
    Copy-Item $setupScript "$PendriveRoot\setup-novo-pc.ps1" -Force
    Write-OK "setup-novo-pc.ps1 copiado"
}
else {
    Write-Erro "setup-novo-pc.ps1 nao encontrado em $(Split-Path $thisScript -Parent)"
    Write-Host "  Copie manualmente para o pendrive antes de usar no notebook novo." -ForegroundColor Yellow
}

# 9. Resumo final
Write-Header "RESUMO DA MIGRACAO"

$tamanhoTotal = Get-FolderSizeMB $PendriveRoot
$driveAtualizado = Get-Volume -DriveLetter $PendriveLetter

Write-Host ""
Write-Host "  Dados copiados: $tamanhoTotal MB" -ForegroundColor Green
Write-Host "  Espaco livre no pendrive: $([math]::Round($driveAtualizado.SizeRemaining / 1GB, 1)) GB" -ForegroundColor Green
Write-Host ""
Write-Host "  Estrutura no pendrive:" -ForegroundColor White
Write-Host "    ${PendriveLetter}:\migracao\" -ForegroundColor Gray
Write-Host "      projetos\Roboroça\          <- Projeto principal" -ForegroundColor Gray
Write-Host "      projetos\Renovacampo\       <- Projeto Java" -ForegroundColor Gray
Write-Host "      config\.claude\             <- Claude Code configs e memoria" -ForegroundColor Gray
Write-Host "      config\.ssh\                <- Chaves SSH" -ForegroundColor Gray
Write-Host "      chave-windows.txt           <- Chave Windows (OEM)" -ForegroundColor Gray
Write-Host "      inventario-sistema.txt      <- Inventario de ferramentas" -ForegroundColor Gray
Write-Host "      setup-novo-pc.ps1           <- Script p/ configurar o Nitro" -ForegroundColor Gray
Write-Host ""

Write-Header "PROXIMO PASSO"
Write-Host ""
Write-Host "  1. Instale Windows no Acer Nitro (usando outro USB ou este mesmo apos backup)" -ForegroundColor White
Write-Host "  2. No Nitro, espete este pendrive" -ForegroundColor White
Write-Host "  3. Abra PowerShell como Admin e execute:" -ForegroundColor White
Write-Host "     powershell -ExecutionPolicy Bypass -File ${PendriveLetter}:\migracao\setup-novo-pc.ps1" -ForegroundColor Cyan
Write-Host ""
