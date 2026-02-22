#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Configura o Acer Nitro novo com todo o ambiente de desenvolvimento.
    RODAR NO NOTEBOOK NOVO após instalar Windows.

.DESCRIPTION
    1. Instala ferramentas via winget (Git, Python, Node.js, PostgreSQL, etc.)
    2. Copia projetos e configs do pendrive para a pasta do usuário
    3. Instala drivers NVIDIA e CUDA Toolkit
    4. Cria venv e instala dependências Python (com PyTorch CUDA)
    5. Instala dependências Node.js
    6. Configura Git e PostgreSQL

.NOTES
    Uso: powershell -ExecutionPolicy Bypass -File E:\migracao\setup-novo-pc.ps1
    Requer conexão com a internet para downloads.
#>

$ErrorActionPreference = "Continue"

# ============================================================
# CONFIGURAÇÃO
# ============================================================
$UserHome = $env:USERPROFILE
$UserName = $env:USERNAME

# Detectar pendrive (procura a pasta migracao)
$PendriveRoot = $null
foreach ($letter in @("E", "D", "F", "G", "H")) {
    $testPath = "${letter}:\migracao"
    if (Test-Path $testPath) {
        $PendriveRoot = $testPath
        break
    }
}

if (!$PendriveRoot) {
    Write-Host "ERRO: Pasta 'migracao' nao encontrada em nenhum drive (D-H)." -ForegroundColor Red
    Write-Host "Conecte o pendrive e tente novamente." -ForegroundColor Red
    exit 1
}

Write-Host "Pendrive encontrado: $PendriveRoot" -ForegroundColor Green

# ============================================================
# FUNÇÕES
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

function Write-Aviso {
    param([string]$Texto)
    Write-Host "  [!] $Texto" -ForegroundColor Yellow
}

function Write-Erro {
    param([string]$Texto)
    Write-Host "  [ERRO] $Texto" -ForegroundColor Red
}

function Install-Winget {
    param(
        [string]$PackageId,
        [string]$DisplayName,
        [string]$AdditionalArgs = ""
    )

    Write-Step "Instalando $DisplayName ($PackageId)..."

    $cmd = "winget install --id $PackageId --accept-package-agreements --accept-source-agreements"
    if ($AdditionalArgs) {
        $cmd += " $AdditionalArgs"
    }

    try {
        Invoke-Expression $cmd 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq -1978335189) {
            # -1978335189 = "já instalado"
            Write-OK "$DisplayName instalado"
            return $true
        }
        else {
            Write-Aviso "$DisplayName: winget retornou codigo $LASTEXITCODE (pode ja estar instalado)"
            return $true
        }
    }
    catch {
        Write-Erro "Falha ao instalar $DisplayName`: $_"
        return $false
    }
}

function Refresh-Path {
    # Recarrega PATH do sistema sem reiniciar o terminal
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

# ============================================================
# INÍCIO
# ============================================================

Write-Header "SETUP ACER NITRO - Ambiente de Desenvolvimento"
Write-Host "  Usuario: $UserName" -ForegroundColor White
Write-Host "  Home: $UserHome" -ForegroundColor White
Write-Host "  Pendrive: $PendriveRoot" -ForegroundColor White

# ============================================================
# ETAPA 1: Instalar ferramentas via winget
# ============================================================
Write-Header "ETAPA 1: Instalando ferramentas de desenvolvimento"

# Verificar se winget existe
if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Erro "winget nao encontrado!"
    Write-Host "  Instale a 'App Installer' pela Microsoft Store e tente novamente." -ForegroundColor Yellow
    Write-Host "  Ou abra a Microsoft Store e busque por 'App Installer'." -ForegroundColor Yellow
    pause
    exit 1
}

# Lista de pacotes a instalar
$pacotes = @(
    @{ Id = "Git.Git";                    Nome = "Git" },
    @{ Id = "Python.Python.3.14";         Nome = "Python 3.14" },
    @{ Id = "OpenJS.NodeJS";              Nome = "Node.js" },
    @{ Id = "PostgreSQL.PostgreSQL.18";   Nome = "PostgreSQL 18" },
    @{ Id = "GitHub.cli";                 Nome = "GitHub CLI" },
    @{ Id = "Anthropic.Claude";           Nome = "Claude Desktop" },
    @{ Id = "Microsoft.VisualStudioCode"; Nome = "VS Code" },
    @{ Id = "Google.Chrome";              Nome = "Google Chrome" },
    @{ Id = "EclipseAdoptium.Temurin.17.JDK"; Nome = "Eclipse Temurin JDK 17" }
)

$instalados = 0
foreach ($pkg in $pacotes) {
    $result = Install-Winget -PackageId $pkg.Id -DisplayName $pkg.Nome
    if ($result) { $instalados++ }
}

Write-OK "$instalados/$($pacotes.Count) pacotes processados"

# Atualizar PATH
Write-Step "Atualizando PATH..."
Refresh-Path

# Verificar instalações
Write-Header "Verificando instalacoes"

$verificacoes = @(
    @{ Cmd = "git --version";     Nome = "Git" },
    @{ Cmd = "python --version";  Nome = "Python" },
    @{ Cmd = "node --version";    Nome = "Node.js" },
    @{ Cmd = "npm --version";     Nome = "npm" },
    @{ Cmd = "gh --version";      Nome = "GitHub CLI" }
)

foreach ($v in $verificacoes) {
    try {
        $output = Invoke-Expression $v.Cmd 2>&1 | Select-Object -First 1
        Write-OK "$($v.Nome): $output"
    }
    catch {
        Write-Aviso "$($v.Nome): nao encontrado no PATH (pode precisar reiniciar o terminal)"
    }
}

# ============================================================
# ETAPA 2: Instalar drivers NVIDIA + CUDA
# ============================================================
Write-Header "ETAPA 2: Drivers NVIDIA e CUDA"

Write-Host ""
Write-Host "  IMPORTANTE: Para usar a GPU RTX 4050/4060 com PyTorch," -ForegroundColor Yellow
Write-Host "  voce precisa instalar os drivers NVIDIA e CUDA Toolkit." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Opcao A (Recomendada): Instalar via winget agora" -ForegroundColor White
Write-Host "  Opcao B: Baixar manualmente do site da NVIDIA depois" -ForegroundColor White
Write-Host ""

$resp = Read-Host "  Instalar drivers NVIDIA via winget? (S/N)"
if ($resp -eq "S" -or $resp -eq "s") {
    # Instalar NVIDIA driver
    Install-Winget -PackageId "Nvidia.GeForceExperience" -DisplayName "NVIDIA GeForce Experience"

    # CUDA Toolkit 12.4 (compatível com PyTorch cu124)
    Write-Step "Instalando CUDA Toolkit 12.4..."
    Write-Host "  (Download grande, ~3 GB — pode demorar)" -ForegroundColor Gray
    Install-Winget -PackageId "Nvidia.CUDA" -DisplayName "NVIDIA CUDA Toolkit" -AdditionalArgs "--version 12.4"

    Write-OK "Drivers NVIDIA configurados"
    Write-Aviso "Reinicie o PC apos o setup para que os drivers NVIDIA carreguem"
}
else {
    Write-Aviso "Pule para instalar drivers manualmente depois"
    Write-Host "  Download: https://www.nvidia.com/drivers" -ForegroundColor Gray
    Write-Host "  CUDA 12.4: https://developer.nvidia.com/cuda-12-4-0-download-archive" -ForegroundColor Gray
}

# ============================================================
# ETAPA 3: Copiar projetos
# ============================================================
Write-Header "ETAPA 3: Copiando projetos para $UserHome"

$projetosPendrive = "$PendriveRoot\projetos"

if (Test-Path $projetosPendrive) {
    # Copiar Roboroça
    $roborocaOrigem = "$projetosPendrive\Roboroça"
    $roborocaDestino = "$UserHome\Roboroça"
    if (Test-Path $roborocaOrigem) {
        Write-Step "Copiando Roboroca..."
        if (Test-Path $roborocaDestino) {
            Write-Aviso "Pasta $roborocaDestino ja existe! Sobrescrevendo..."
        }
        robocopy "$roborocaOrigem" "$roborocaDestino" /E /NP /NFL /NDL /NJH /NJS | Out-Null
        Write-OK "Roboroca copiado para $roborocaDestino"
    }

    # Copiar Renovacampo
    $renovaOrigem = "$projetosPendrive\Renovacampo"
    $renovaDestino = "$UserHome\Renovacampo"
    if (Test-Path $renovaOrigem) {
        Write-Step "Copiando Renovacampo..."
        robocopy "$renovaOrigem" "$renovaDestino" /E /NP /NFL /NDL /NJH /NJS | Out-Null
        Write-OK "Renovacampo copiado para $renovaDestino"
    }
}
else {
    Write-Erro "Pasta projetos nao encontrada no pendrive"
}

# ============================================================
# ETAPA 4: Copiar .claude e .ssh
# ============================================================
Write-Header "ETAPA 4: Copiando configuracoes (.claude, .ssh)"

$configPendrive = "$PendriveRoot\config"

# .claude
$claudeOrigem = "$configPendrive\.claude"
$claudeDestino = "$UserHome\.claude"
if (Test-Path $claudeOrigem) {
    Write-Step "Copiando .claude..."
    robocopy "$claudeOrigem" "$claudeDestino" /E /NP /NFL /NDL /NJH /NJS | Out-Null
    Write-OK ".claude copiado (memoria, plugins, configs)"
}

# .ssh
$sshOrigem = "$configPendrive\.ssh"
$sshDestino = "$UserHome\.ssh"
if (Test-Path $sshOrigem) {
    Write-Step "Copiando .ssh..."
    if (!(Test-Path $sshDestino)) {
        New-Item -ItemType Directory -Path $sshDestino -Force | Out-Null
    }
    Copy-Item -Path "$sshOrigem\*" -Destination $sshDestino -Recurse -Force
    Write-OK ".ssh copiado"
}

# ============================================================
# ETAPA 5: Configurar Git
# ============================================================
Write-Header "ETAPA 5: Configurando Git"

try {
    git config --global user.name "ciroschultz"
    Write-OK "git user.name = ciroschultz"
}
catch {
    Write-Aviso "Nao foi possivel configurar git (talvez nao esteja no PATH ainda)"
}

Write-Host ""
Write-Host "  NOTA: user.email nao foi configurado globalmente." -ForegroundColor Yellow
Write-Host "  Configure depois com:" -ForegroundColor Yellow
Write-Host "    git config --global user.email 'seu@email.com'" -ForegroundColor Cyan

# ============================================================
# ETAPA 6: Setup Python (venv + dependências Roboroça)
# ============================================================
Write-Header "ETAPA 6: Configurando ambiente Python (Roboroca)"

$roborocaPath = "$UserHome\Roboroça"

if (Test-Path $roborocaPath) {
    # Criar venv
    Write-Step "Criando venv..."
    Push-Location $roborocaPath
    try {
        python -m venv venv
        Write-OK "venv criado em $roborocaPath\venv"
    }
    catch {
        Write-Erro "Falha ao criar venv: $_"
        Write-Host "  Verifique se Python esta no PATH e tente:" -ForegroundColor Yellow
        Write-Host "    cd $roborocaPath && python -m venv venv" -ForegroundColor Cyan
    }

    # Instalar dependências
    $pipExe = "$roborocaPath\venv\Scripts\pip.exe"
    $requirementsFile = "$roborocaPath\backend\requirements.txt"

    if (Test-Path $pipExe) {
        # Upgrade pip primeiro
        Write-Step "Atualizando pip..."
        & $pipExe install --upgrade pip 2>&1 | Out-Null
        Write-OK "pip atualizado"

        # Instalar requirements.txt
        if (Test-Path $requirementsFile) {
            Write-Step "Instalando dependencias Python (requirements.txt)..."
            & $pipExe install -r $requirementsFile
            Write-OK "Dependencias Python instaladas"
        }

        # Instalar PyTorch com CUDA 12.4 (para RTX 4050/4060)
        Write-Step "Instalando PyTorch com CUDA 12.4 (para GPU NVIDIA)..."
        Write-Host "  (Download grande ~2.5 GB — pode demorar)" -ForegroundColor Gray
        & $pipExe install torch torchvision --index-url https://download.pytorch.org/whl/cu124
        Write-OK "PyTorch com CUDA instalado"

        # Instalar ultralytics (YOLO) e scipy
        Write-Step "Instalando ultralytics (YOLO) e scipy..."
        & $pipExe install ultralytics scipy
        Write-OK "ultralytics e scipy instalados"

        # Instalar ferramentas de teste
        Write-Step "Instalando pytest e ferramentas de teste..."
        & $pipExe install pytest pytest-asyncio httpx aiosqlite
        Write-OK "Ferramentas de teste instaladas"
    }
    else {
        Write-Aviso "pip nao encontrado em $pipExe — instale manualmente depois"
    }

    Pop-Location
}
else {
    Write-Aviso "Roboroca nao encontrado em $roborocaPath"
}

# ============================================================
# ETAPA 7: Setup Node.js (frontend Roboroça)
# ============================================================
Write-Header "ETAPA 7: Instalando dependencias Node.js (frontend)"

$frontendPath = "$UserHome\Roboroça\frontend"

if (Test-Path "$frontendPath\package.json") {
    Write-Step "Rodando npm install no frontend..."
    Push-Location $frontendPath
    try {
        npm install
        Write-OK "Dependencias Node.js instaladas"
    }
    catch {
        Write-Erro "npm install falhou: $_"
    }
    Pop-Location
}
else {
    Write-Aviso "frontend/package.json nao encontrado"
}

# Renovacampo root (puppeteer deps)
$renovaPath = "$UserHome\Renovacampo"
if (Test-Path "$renovaPath\package.json") {
    Write-Step "Rodando npm install no Renovacampo..."
    Push-Location $renovaPath
    try {
        npm install
        Write-OK "Dependencias Renovacampo instaladas"
    }
    catch {
        Write-Aviso "npm install Renovacampo falhou (nao-critico)"
    }
    Pop-Location
}

# ============================================================
# ETAPA 8: Configurar PostgreSQL
# ============================================================
Write-Header "ETAPA 8: Configurando PostgreSQL"

Write-Host ""
Write-Host "  O PostgreSQL foi instalado via winget." -ForegroundColor White
Write-Host "  Voce precisa criar o banco de dados 'roboroca'." -ForegroundColor White
Write-Host ""
Write-Host "  Apos o setup, execute estes comandos no terminal:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    # Conectar ao PostgreSQL (use a senha definida na instalacao)" -ForegroundColor Cyan
Write-Host '    psql -U postgres' -ForegroundColor Cyan
Write-Host ""
Write-Host "    # Dentro do psql:" -ForegroundColor Cyan
Write-Host "    CREATE DATABASE roboroca;" -ForegroundColor Cyan
Write-Host "    CREATE USER roboroca WITH PASSWORD 'roboroca';" -ForegroundColor Cyan
Write-Host "    GRANT ALL PRIVILEGES ON DATABASE roboroca TO roboroca;" -ForegroundColor Cyan
Write-Host "    \q" -ForegroundColor Cyan
Write-Host ""

# Tentar criar automaticamente
$pgPath = "C:\Program Files\PostgreSQL\18\bin"
if (Test-Path "$pgPath\psql.exe") {
    Write-Host "  PostgreSQL encontrado em $pgPath" -ForegroundColor Green
    $resp = Read-Host "  Tentar criar banco automaticamente? Qual a senha do postgres? (ou Enter para pular)"
    if ($resp) {
        $env:PGPASSWORD = $resp
        try {
            & "$pgPath\psql.exe" -U postgres -c "CREATE DATABASE roboroca;" 2>&1
            & "$pgPath\psql.exe" -U postgres -c "CREATE USER roboroca WITH PASSWORD 'roboroca';" 2>&1
            & "$pgPath\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE roboroca TO roboroca;" 2>&1
            Write-OK "Banco 'roboroca' criado!"
        }
        catch {
            Write-Aviso "Nao consegui criar automaticamente. Configure manualmente."
        }
        $env:PGPASSWORD = ""
    }
}

# ============================================================
# ETAPA 9: Autenticar GitHub CLI
# ============================================================
Write-Header "ETAPA 9: GitHub CLI"

Write-Host ""
Write-Host "  Para autenticar o GitHub CLI, execute depois:" -ForegroundColor Yellow
Write-Host "    gh auth login" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Escolha: GitHub.com -> HTTPS -> Login with browser" -ForegroundColor Gray

# ============================================================
# ETAPA 10: Verificação final
# ============================================================
Write-Header "VERIFICACAO FINAL"

$checks = @()

# Git
try {
    $gitVer = git --version 2>&1
    $checks += @{ Nome = "Git"; Status = "OK"; Info = $gitVer }
} catch { $checks += @{ Nome = "Git"; Status = "FALTA"; Info = "Reinstalar ou reiniciar terminal" } }

# Python
try {
    $pyVer = python --version 2>&1
    $checks += @{ Nome = "Python"; Status = "OK"; Info = $pyVer }
} catch { $checks += @{ Nome = "Python"; Status = "FALTA"; Info = "Reinstalar ou reiniciar terminal" } }

# Node
try {
    $nodeVer = node --version 2>&1
    $checks += @{ Nome = "Node.js"; Status = "OK"; Info = $nodeVer }
} catch { $checks += @{ Nome = "Node.js"; Status = "FALTA"; Info = "Reinstalar ou reiniciar terminal" } }

# Roboroça
if (Test-Path "$UserHome\Roboroça\backend\requirements.txt") {
    $checks += @{ Nome = "Roboroca"; Status = "OK"; Info = "Projeto copiado" }
} else { $checks += @{ Nome = "Roboroca"; Status = "FALTA"; Info = "Copiar manualmente" } }

# venv
if (Test-Path "$UserHome\Roboroça\venv\Scripts\python.exe") {
    $checks += @{ Nome = "venv"; Status = "OK"; Info = "Criado" }
} else { $checks += @{ Nome = "venv"; Status = "FALTA"; Info = "python -m venv venv" } }

# PyTorch
$pyExe = "$UserHome\Roboroça\venv\Scripts\python.exe"
if (Test-Path $pyExe) {
    try {
        $torchCheck = & $pyExe -c "import torch; print(f'torch {torch.__version__}, CUDA: {torch.cuda.is_available()}')" 2>&1
        $checks += @{ Nome = "PyTorch"; Status = "OK"; Info = $torchCheck }
    }
    catch {
        $checks += @{ Nome = "PyTorch"; Status = "FALTA"; Info = "pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124" }
    }
}

# node_modules
if (Test-Path "$UserHome\Roboroça\frontend\node_modules") {
    $checks += @{ Nome = "node_modules"; Status = "OK"; Info = "Frontend deps instaladas" }
} else { $checks += @{ Nome = "node_modules"; Status = "FALTA"; Info = "cd frontend && npm install" } }

# .claude
if (Test-Path "$UserHome\.claude\projects") {
    $checks += @{ Nome = ".claude"; Status = "OK"; Info = "Memoria e configs copiados" }
} else { $checks += @{ Nome = ".claude"; Status = "FALTA"; Info = "Copiar do pendrive" } }

# .ssh
if (Test-Path "$UserHome\.ssh\known_hosts") {
    $checks += @{ Nome = ".ssh"; Status = "OK"; Info = "known_hosts copiado" }
} else { $checks += @{ Nome = ".ssh"; Status = "FALTA"; Info = "Copiar do pendrive" } }

Write-Host ""
foreach ($check in $checks) {
    if ($check.Status -eq "OK") {
        Write-Host "  [OK]    $($check.Nome): $($check.Info)" -ForegroundColor Green
    }
    else {
        Write-Host "  [FALTA] $($check.Nome): $($check.Info)" -ForegroundColor Red
    }
}

# ============================================================
# PRÓXIMOS PASSOS
# ============================================================
Write-Header "PROXIMOS PASSOS MANUAIS"

Write-Host ""
Write-Host "  1. Reiniciar o PC (para drivers NVIDIA carregarem)" -ForegroundColor White
Write-Host ""
Write-Host "  2. Verificar GPU NVIDIA:" -ForegroundColor White
Write-Host "     python -c `"import torch; print(torch.cuda.is_available())`"" -ForegroundColor Cyan
Write-Host "     # Deve retornar True" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Configurar PostgreSQL (se nao fez acima):" -ForegroundColor White
Write-Host "     psql -U postgres" -ForegroundColor Cyan
Write-Host "     CREATE DATABASE roboroca;" -ForegroundColor Cyan
Write-Host ""
Write-Host "  4. Autenticar GitHub:" -ForegroundColor White
Write-Host "     gh auth login" -ForegroundColor Cyan
Write-Host ""
Write-Host "  5. Testar Roboroca:" -ForegroundColor White
Write-Host "     cd $UserHome\Roboroca" -ForegroundColor Cyan
Write-Host "     venv\Scripts\python.exe -m pytest backend\tests\ -v  # 94 testes" -ForegroundColor Cyan
Write-Host "     cd frontend && npm run build                          # Build frontend" -ForegroundColor Cyan
Write-Host ""
Write-Host "  6. Rodar o projeto:" -ForegroundColor White
Write-Host "     # Terminal 1 (backend):" -ForegroundColor Gray
Write-Host "     venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000" -ForegroundColor Cyan
Write-Host "     # Terminal 2 (frontend):" -ForegroundColor Gray
Write-Host "     cd frontend && npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  7. Instalar Claude Code:" -ForegroundColor White
Write-Host "     npm install -g @anthropic-ai/claude-code" -ForegroundColor Cyan
Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Green
Write-Host "  Setup concluido! Bem-vindo ao Acer Nitro!" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Green
Write-Host ""
