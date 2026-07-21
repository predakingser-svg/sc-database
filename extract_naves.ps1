# extract_naves.ps1 — Extrae naves con stats desde StarBreaker + traducciones LetalDark ES
# USO: powershell -ExecutionPolicy Bypass -File extract_naves.ps1

$starBreakerPath = "C:\Users\preda\Desktop\star_data\libs\foundry\records"
$outputPath = "C:\Users\preda\Desktop\star_citizen_web"
$traduccionURL = "https://raw.githubusercontent.com/LetalDark/StarCitizen_ES_Plus/v1.33.6/versions/4.9.0-LIVE_12248363/output/global.ini"

New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

Write-Host "=== EXTRACTOR DE NAVES ===" -ForegroundColor Cyan
Write-Host ""

# ─── 1. Cargar traducciones ─────────────────────────────────────────────
Write-Host "Descargando traducciones..." -ForegroundColor Yellow
$trad = @{}
try {
    $ini = (Invoke-WebRequest $traduccionURL -UseBasicParsing).Content
    foreach ($l in ($ini -split "`n")) {
        $l = $l.Trim()
        if ($l -match '^([^#;=]+)=(.+)') {
            $trad[$matches[1].Trim()] = $matches[2].Trim()
        }
    }
    Write-Host "OK $($trad.Count) traducciones" -ForegroundColor Green
} catch { Write-Host "Error descarga: $_" -ForegroundColor Red; exit 1 }
Write-Host ""

# ─── 2. Función para leer JSON sin -Depth ───────────────────────────────
function Read-JsonFile($path) {
    if (!(Test-Path $path)) { return $null }
    try {
        $content = Get-Content $path -Raw -Encoding UTF8
        # PowerShell 5.1 no soporta -Depth, usamos parser manual
        $obj = [System.Web.Script.Serialization.JavaScriptSerializer]::new()
        $obj.MaxJsonLength = 100 * 1024 * 1024  # 100MB max
        return $obj.DeserializeObject($content)
    } catch {
        # Fallback a ConvertFrom-Json
        try { return (Get-Content $path -Raw -Encoding UTF8) | ConvertFrom-Json } catch { return $null }
    }
}

function Get-Value($obj, $key) {
    if ($null -eq $obj) { return $null }
    if ($obj.PSObject.Properties.Name -contains $key) { return $obj.$key }
    return $null
}

# ─── 3. Función para extraer fabricante del nombre ──────────────────────
$fabricantes_map = @{
    "AEGS" = "Aegis Dynamics"; "ANVL" = "Anvil Aerospace"; "ARGO" = "Argo Astronautics"
    "BANU" = "Banu"; "CNOU" = "Consolidated Outland"; "CRUS" = "Crusader Industries"
    "DRAK" = "Drake Interplanetary"; "ESPR" = "Esperia"; "GAMA" = "Gama"
    "GREY" = "Greycat Industrial"; "KRIG" = "Kruger Intergalactic"; "MISC" = "Musashi Industrial & Starflight Concern"
    "MRAI" = "Mirai"; "ORIG" = "Origin Jumpworks"; "RSI" = "Roberts Space Industries"
    "VNCL" = "Vanduul"; "XNAA" = "Xi'an"
}

function Get-Manufacturer($name) {
    foreach ($code in $fabricantes_map.Keys) {
        if ($name -match "^${code}_") { return @{code=$code; name=$fabricantes_map[$code]} }
    }
    return @{code="UNKN"; name="Desconocido"}
}

# ─── 4. Función para traducir nombre ────────────────────────────────────
function Get-Traduccion($entityId) {
    $nom = $trad["${entityId}_DisplayName"]
    if (!$nom) { $nom = $trad["@item/${entityId}_Name"] }
    if (!$nom) { $nom = $trad["${entityId}_Name"] }
    return $nom
}

# ─── 5. Extraer naves ──────────────────────────────────────────────────
Write-Host "Extrayendo naves..." -ForegroundColor Yellow

$spaceshipsDir = Join-Path $starBreakerPath "entities\spaceships"
if (!(Test-Path $spaceshipsDir)) {
    Write-Host "ERROR: No se encuentra $spaceshipsDir" -ForegroundColor Red; exit 1
}

$archivos = @(Get-ChildItem $spaceshipsDir -Filter *.json -File)
Write-Host "Archivos encontrados: $($archivos.Count)" -ForegroundColor Gray

$naves = @()
$errores = 0

foreach ($archivo in $archivos) {
    $entityId = $archivo.BaseName -replace "^EntityClassDefinition\.", ""
    
    try {
        $data = $null
        try {
            $content = Get-Content $archivo.FullName -Raw -Encoding UTF8
            $data = $content | ConvertFrom-Json
        } catch {
            $errores++; continue
        }
        
        if ($null -eq $data) { $errores++; continue }
        
        $rv = $null
        try { $rv = $data._RecordValue } catch { $errores++; continue }
        
        # Extraer componentes iterando sin -Depth
        $stats = @{
            entity_id = $entityId
            nombre_es = Get-Traduccion $entityId
            fabricante = (Get-Manufacturer $entityId).code
            fabricante_nombre = (Get-Manufacturer $entityId).name
            hull_hp = 0
            shield_hp = 0
            velocidad_scm = 0
            velocidad_max = 0
            velocidad_retro = 0
            pitch = 0; yaw = 0; roll = 0
            scm_accel = 0
            max_accel = 0
            cargo_scu = 0
            tripulacion_min = 0
            tripulacion_max = 0
            tamano = ""
            qt_drive = ""
        }
        
        # Buscar en las propiedades del _RecordValue mediante recorrido manual
        # PowerShell 5.1 sin -Depth: necesitamos acceder propiedad por propiedad
        $rvProps = @($rv.PSObject.Properties)
        
        foreach ($prop in $rvProps) {
            $pName = $prop.Name
            $pVal = $prop.Value
            
            if ($pName -eq "Components" -and $pVal -is [array]) {
                foreach ($comp in $pVal) {
                    $compType = ""
                    try { $compType = $comp._Type } catch {}
                    
                    # SHealthComponentParams -> HP de la nave
                    if ($compType -eq "SHealthComponentParams") {
                        try { $stats.hull_hp = [int]$comp.Health.MaxHealth } catch {}
                        try { if ($stats.hull_hp -eq 0) { $stats.hull_hp = [int]$comp.MaxHealth } } catch {}
                    }
                    
                    # SVehicleMovementParams -> Velocidades
                    if ($compType -eq "SVehicleMovementParams") {
                        try { $stats.velocidad_scm = [int]$comp.SpeedSCM } catch {}
                        try { $stats.velocidad_max = [int]$comp.SpeedMax } catch {}
                        try { $stats.velocidad_retro = [int]$comp.SpeedReverse } catch {}
                        try { $stats.pitch = [int]$comp.PitchSpeed } catch {}
                        try { $stats.yaw = [int]$comp.YawSpeed } catch {}
                        try { $stats.roll = [int]$comp.RollSpeed } catch {}
                        try { $stats.scm_accel = [int]$comp.AccelerationSCM } catch {}
                        try { $stats.max_accel = [int]$comp.AccelerationMax } catch {}
                    }
                    
                    # SItemPortContainerComponentParams -> Ranuras de componentes
                    if ($compType -eq "SItemPortContainerComponentParams") {
                        # Aquí irían las ranuras
                    }
                    
                    # SCargoGridParams -> Carga
                    if ($compType -eq "SCargoGridParams") {
                        try { $stats.cargo_scu = [double]$comp.MaxCargo } catch {}
                    }
                    
                    # SShipCrewParams -> Tripulación
                    if ($compType -eq "SShipCrewParams") {
                        try { $stats.tripulacion_min = [int]$comp.MinCrew } catch {}
                        try { $stats.tripulacion_max = [int]$comp.MaxCrew } catch {}
                    }
                    
                    # SQuantumDriveComponentParams -> QT
                    if ($compType -eq "SQuantumDriveComponentParams") {
                        try { $stats.qt_drive = [string]$comp.DisplayName } catch {}
                    }
                }
            }
            
            # Buscar tamaño
            if ($pName -eq "Size" -or $pName -eq "VehicleSize") {
                try { $stats.tamano = [string]$pVal } catch {}
            }
        }
        
        $naves += $stats
        
    } catch {
        $errores++
    }
}

# ─── 6. Guardar ─────────────────────────────────────────────────────────
$rutaJson = Join-Path $outputPath "naves_completo.json"
$naves | ConvertTo-Json | Out-File $rutaJson -Encoding UTF8
$tam = [math]::Round((Get-Item $rutaJson).Length/1MB, 2)

Write-Host ""
Write-Host "=== RESULTADOS ===" -ForegroundColor Cyan
Write-Host "Total archivos: $($archivos.Count)"
Write-Host "Naves extraídas: $($naves.Count)"
Write-Host "Errores: $errores"
Write-Host "Archivo: $rutaJson (${tam} MB)"
Write-Host ""

# Mostrar primeras 3 naves como ejemplo
Write-Host "=== MUESTRA (3 primeras naves) ===" -ForegroundColor Yellow
$naves | Select-Object -First 3 | Format-Table entity_id, nombre_es, fabricante, hull_hp, velocidad_scm, velocidad_max, cargo_scu -AutoSize

Write-Host ""
Write-Host "COMPLETADO - Datos en $rutaJson" -ForegroundColor Green
