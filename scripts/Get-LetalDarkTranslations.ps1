# Get-LetalDarkTranslations.ps1 — Descarga y parsea traducción española de LetalDark
# PowerShell 5.1 compatible
# Uso: .\Get-LetalDarkTranslations.ps1 [-OutputFile "translations.json"] [-Force]

param(
    [string]$OutputFile = "C:\Users\preda\Desktop\star_citizen_web\translations_raw.json",
    [switch]$Force
)

$TranslationUrl = "https://raw.githubusercontent.com/LetalDark/StarCitizen_ES_Plus/v1.33.6/versions/4.9.0-LIVE_12248363/output/global.ini"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  LetalDark ES Translator Downloader v1.0" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si ya existe
if ((Test-Path $OutputFile) -and -not $Force) {
    $existing = Get-Item $OutputFile
    $existingCount = (Get-Content $OutputFile -TotalCount 1)
    Write-Host "Ya existe: $OutputFile ($([math]::Round($existing.Length/1MB,2)) MB)" -ForegroundColor Yellow
    Write-Host "Use -Force para sobrescribir" -ForegroundColor Yellow
    exit 0
}

# Crear directorio de salida
$outDir = Split-Path $OutputFile -Parent
if ($outDir) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }

Write-Host "Descargando traduccion desde:" -ForegroundColor Yellow
Write-Host "  $TranslationUrl" -ForegroundColor Gray
Write-Host ""

try {
    $startTime = Get-Date
    Write-Host "Descargando..." -ForegroundColor Yellow
    
    $webClient = New-Object System.Net.WebClient
    $webClient.Encoding = [System.Text.Encoding]::UTF8
    $content = $webClient.DownloadString($TranslationUrl)
    
    $downloadTime = (Get-Date) - $startTime
    Write-Host "  Descargado en $([math]::Round($downloadTime.TotalSeconds,1))s" -ForegroundColor Green
    Write-Host "  Tamano: $([math]::Round($content.Length/1KB,1)) KB" -ForegroundColor Gray
} catch {
    Write-Host "Error al descargar: $_" -ForegroundColor Red
    
    # Fallback: intentar con Invoke-WebRequest
    try {
        Write-Host "Reintentando con Invoke-WebRequest..." -ForegroundColor Yellow
        $response = Invoke-WebRequest -Uri $TranslationUrl -UseBasicParsing
        $content = $response.Content
    } catch {
        Write-Error "No se pudo descargar la traduccion."
        Write-Host "Verifique su conexion a Internet o la URL:" -ForegroundColor Yellow
        Write-Host "  $TranslationUrl" -ForegroundColor Cyan
        exit 1
    }
}

# Parsear INI
Write-Host "`nParseando traducciones..." -ForegroundColor Yellow
$translations = @{}
$lineCount = 0
$ignoredCount = 0
$sectionCount = 0

$lines = $content -split "`n"
$currentSection = ""

foreach ($line in $lines) {
    $line = $line.Trim()
    $lineCount++
    
    # Ignorar líneas vacías
    if ($line -eq "") { 
        $ignoredCount++
        continue 
    }
    
    # Ignorar secciones [Section]
    if ($line -match '^\[.+\]$') { 
        $currentSection = $line
        $sectionCount++
        $ignoredCount++
        continue 
    }
    
    # Ignorar comentarios
    if ($line.StartsWith("#") -or $line.StartsWith(";")) { 
        $ignoredCount++
        continue 
    }
    
    # Parsear key=value (manejar valores con = dentro)
    $eqIndex = $line.IndexOf("=")
    if ($eqIndex -gt 0) {
        $key = $line.Substring(0, $eqIndex).Trim()
        $value = $line.Substring($eqIndex + 1).Trim()
        
        if ($key -ne "") {
            $translations[$key] = $value
        } else {
            $ignoredCount++
        }
    } else {
        $ignoredCount++
    }
    
    if ($lineCount % 50000 -eq 0) {
        Write-Host "  Procesadas $lineCount lineas..." -ForegroundColor Gray
    }
}

Write-Host "`nResumen del parseo:" -ForegroundColor Cyan
Write-Host "  Lineas totales en el archivo: $lineCount" -ForegroundColor Gray
Write-Host "  Secciones [section] ignoradas: $sectionCount" -ForegroundColor Gray
Write-Host "  Comentarios/vacias ignoradas: $ignoredCount" -ForegroundColor Gray
Write-Host "  Traducciones extraidas: $($translations.Count)" -ForegroundColor Green

# Guardar a JSON
Write-Host "`nGuardando traducciones..." -ForegroundColor Yellow
$translations | ConvertTo-Json | Out-File -FilePath $OutputFile -Encoding UTF8

$fileSize = (Get-Item $OutputFile).Length
Write-Host "  Guardado: $OutputFile" -ForegroundColor Green
Write-Host "  Tamano: $([math]::Round($fileSize/1MB,2)) MB" -ForegroundColor Gray

# Mostrar estadísticas
Write-Host "`nEstadisticas de traduccion:" -ForegroundColor Cyan
$totalKeys = $translations.Count

# Contar por prefijo de clave
$prefixes = @{}
$translations.Keys | ForEach-Object {
    $prefix = "otros"
    if ($_ -match '^@') { $prefix = "item" }
    elseif ($_ -match '^EntityClassDefinition') { $prefix = "entity" }
    elseif ($_ -match '^Mission') { $prefix = "mision" }
    elseif ($_ -match '^Hauling') { $prefix = "hauling" }
    elseif ($_ -match '^Vehicle') { $prefix = "vehicle" }
    elseif ($_ -match '^Location') { $prefix = "location" }
    elseif ($_ -match '^Tag') { $prefix = "tag" }
    else { $prefix = "otros" }
    
    if (-not $prefixes.ContainsKey($prefix)) { $prefixes[$prefix] = 0 }
    $prefixes[$prefix]++
}

$prefixes.GetEnumerator() | Sort-Object -Property Value -Descending | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value) claves" -ForegroundColor Gray
}

Write-Host "`nMuestra de traducciones:" -ForegroundColor Yellow
$translations.Keys | Where-Object { $_ -match 'DisplayName' } | Select-Object -First 5 | ForEach-Object {
    Write-Host "  $_ = $($translations[$_])" -ForegroundColor Gray
}

Write-Host "`n✅ Listo. $($translations.Count) traducciones disponibles." -ForegroundColor Green
