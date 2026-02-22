# Copiar Roboroça usando xcopy (melhor com Unicode)
$ErrorActionPreference = "Continue"

$src = "C:\Users\ciroa\Roboro" + [char]0xe7 + "a"
$dst = "E:\migracao\projetos\Roboro" + [char]0xe7 + "a"

Write-Host "Origem: $src" -ForegroundColor Yellow
Write-Host "Destino: $dst" -ForegroundColor Yellow
Write-Host "Existe origem: $(Test-Path $src)" -ForegroundColor Yellow

if (!(Test-Path $dst)) {
    New-Item -ItemType Directory -Path $dst -Force | Out-Null
}

# Copiar com PowerShell nativo (evita problemas de encoding do robocopy)
$excludeDirs = @("node_modules", "venv", ".next", "__pycache__", "uploads", ".git")
$excludeExts = @(".pyc", ".pyo", ".pt")
$excludeFiles = @("nul", "roboroca.db", ".env")

$items = Get-ChildItem -Path $src -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
    $relPath = $_.FullName.Substring($src.Length + 1)
    $parts = $relPath.Split('\')

    # Verificar se alguma parte do caminho esta na lista de exclusao
    $excluded = $false
    foreach ($part in $parts) {
        if ($excludeDirs -contains $part) { $excluded = $true; break }
    }

    # Verificar extensao
    if (!$excluded -and $excludeExts -contains $_.Extension) { $excluded = $true }

    # Verificar nome exato
    if (!$excluded -and $excludeFiles -contains $_.Name) { $excluded = $true }

    -not $excluded
}

$total = ($items | Measure-Object).Count
Write-Host "Copiando $total arquivos..." -ForegroundColor Cyan

$copied = 0
$errors = 0
foreach ($item in $items) {
    $relPath = $item.FullName.Substring($src.Length + 1)
    $destFile = Join-Path $dst $relPath
    $destDir = Split-Path $destFile -Parent

    if (!(Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    try {
        Copy-Item -Path $item.FullName -Destination $destFile -Force
        $copied++
    }
    catch {
        $errors++
        Write-Host "  Erro: $relPath - $_" -ForegroundColor Red
    }

    if ($copied % 100 -eq 0) {
        Write-Host "  $copied / $total copiados..." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "[OK] Roboroça: $copied arquivos copiados, $errors erros" -ForegroundColor Green

# Mostrar tamanho
$size = (Get-ChildItem $dst -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host "Tamanho: $([math]::Round($size / 1MB, 1)) MB" -ForegroundColor Green
