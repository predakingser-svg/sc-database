# run_fase0.ps1 — Ejecuta FASE 0 completa: indexar datos + descargar traducciones
# PowerShell 5.1 compatible
# Uso: powershell -ExecutionPolicy Bypass -File "C:\Users\preda\Desktop\run_fase0.ps1"

param(
    [switch]$Force
)

$StarBreakerPath = "C:\Users\preda\Desktop\star_data\libs\foundry\records"
$OutputPath = "C:\Users\preda\Desktop\star_citizen_web"
$ScriptsPath = "C:\Users\preda\Desktop\sc_scripts"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Star Citizen DB — FASE 0: Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Crear carpetas
New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null
New-Item -ItemType Directory -Force -Path $ScriptsPath | Out-Null

# ─── Paso 1: Indexar archivos ───────────────────────────────────────────
Write-Host "`n📂 Paso 1/2: Indexando archivos de StarBreaker..." -ForegroundColor Yellow
Write-Host "  Ruta: $StarBreakerPath" -ForegroundColor Gray
Write-Host "  Esto puede tomar varios minutos (61,635 archivos)..." -ForegroundColor Gray
Write-Host ""

$startIndex = Get-Date

$allFiles = Get-ChildItem -Path $StarBreakerPath -Filter "*.json" -File -Recurse
$total = $allFiles.Count
Write-Host "  Archivos encontrados: $total" -ForegroundColor Cyan

# Agrupar por carpeta
$carpetas = @{}
$typeCount = @{}
$entityTypes = @{}

foreach ($file in $allFiles) {
    $folder = $file.Directory.Name
    if (-not $carpetas.ContainsKey($folder)) { $carpetas[$folder] = 0 }
    $carpetas[$folder]++
}

$indexTime = (Get-Date) - $startIndex
Write-Host "  Indexado en $([math]::Round($indexTime.TotalSeconds,1))s" -ForegroundColor Green
Write-Host "  Carpetas encontradas: $($carpetas.Count)" -ForegroundColor Green

# Mostrar top carpetas
Write-Host "`n  Top carpetas por cantidad:" -ForegroundColor Yellow
$carpetas.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 15 | ForEach-Object {
    Write-Host "    $($_.Key): $($_.Value) archivos" -ForegroundColor Gray
}

# Guardar resumen del index
$indexResumen = @{
    fecha = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    total_archivos = $total
    ruta = $StarBreakerPath
    carpetas = @{}
}
$carpetas.GetEnumerator() | Sort-Object -Property Value -Descending | ForEach-Object {
    $indexResumen.carpetas[$_.Key] = $_.Value
}
$indexResumen | ConvertTo-Json -Depth 3 | Out-File (Join-Path $OutputPath "data-index.json") -Encoding UTF8

# ─── Paso 2: Descargar traducciones ─────────────────────────────────────
Write-Host "`n📖 Paso 2/2: Descargando traduccion LetalDark ES..." -ForegroundColor Yellow

$translationsFile = Join-Path $OutputPath "translations_raw.json"

if ((Test-Path $translationsFile) -and -not $Force) {
    Write-Host "  Ya existe traduccion previa. Use -Force para descargar de nuevo." -ForegroundColor Yellow
} else {
    $url = "https://raw.githubusercontent.com/LetalDark/StarCitizen_ES_Plus/v1.33.6/versions/4.9.0-LIVE_12248363/output/global.ini"
    
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Encoding = [System.Text.Encoding]::UTF8
        $content = $wc.DownloadString($url)
    } catch {
        Write-Host "  Error descarga. Reintentando..." -ForegroundColor Red
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing
        $content = $response.Content
    }
    
    # Parsear INI
    $trad = @{}
    $lines = $content -split "`n"
    foreach ($line in $lines) {
        $line = $line.Trim()
        if ($line -eq "" -or $line.StartsWith("#") -or $line.StartsWith(";") -or $line.StartsWith("[")) { continue }
        $eq = $line.IndexOf("=")
        if ($eq -gt 0) {
            $clave = $line.Substring(0, $eq).Trim()
            $valor = $line.Substring($eq + 1).Trim()
            if ($clave) { $trad[$clave] = $valor }
        }
    }
    
    $trad | ConvertTo-Json | Out-File $translationsFile -Encoding UTF8
    Write-Host "  OK: $($trad.Count) traducciones descargadas y guardadas" -ForegroundColor Green
}

# ─── Resumen final ───────────────────────────────────────────────────────
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  FASE 0 COMPLETADA" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📂 $total archivos indexados" -ForegroundColor White
Write-Host "  📖 $((Get-Content $translationsFile | ConvertFrom-Json).PSObject.Properties.Name.Count) traducciones (aproximado)" -ForegroundColor White
Write-Host ""

Write-Host "  Proximo paso: FASE 1 — Extraer naves" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
