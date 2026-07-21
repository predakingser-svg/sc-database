# StarBreaker-Parser.psm1 — Módulo PowerShell para parsear JSON DataCore de StarBreaker
# PowerShell 5.1 compatible (sin -Depth)
#
# Funciones:
#   Read-StarBreakerJson      - Carga un archivo JSON DataCore
#   Get-EntityValue           - Navega valores anidados sin -Depth
#   Get-StarBreakerFiles      - Indexa archivos por tipo
#   Get-AllShips              - Extrae catálogo de naves
#   Get-ShipStats             - Extrae stats de una nave específica

# ─── Read-StarBreakerJson ────────────────────────────────────────────────
function Read-StarBreakerJson {
    <#
    .SYNOPSIS
        Carga un archivo JSON en formato DataCore de StarBreaker.
    .PARAMETER Path
        Ruta al archivo JSON.
    .PARAMETER SkipRecordWrapper
        Si es true, devuelve solo _RecordValue en lugar del objeto completo.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,
        [switch]$SkipRecordWrapper
    )
    
    if (-not (Test-Path $Path)) {
        Write-Warning "Archivo no encontrado: $Path"
        return $null
    }
    
    try {
        $content = Get-Content -Path $Path -Raw -Encoding UTF8
        $json = $content | ConvertFrom-Json
        
        if ($SkipRecordWrapper -and $json._RecordValue) {
            return $json._RecordValue
        }
        
        return $json
    } catch {
        Write-Warning "Error parseando $Path : $_"
        return $null
    }
}

# ─── Get-EntityValue ─────────────────────────────────────────────────────
function Get-EntityValue {
    <#
    .SYNOPSIS
        Navega un objeto anidado por path de puntos sin usar -Depth.
        Soporta arrays con índice: Components[0].Health
    .PARAMETER Object
        Objeto PowerShell (PSCustomObject) a navegar.
    .PARAMETER PropertyPath
        Ruta de propiedades separadas por puntos. Ej: "Components[0].SAttachableComponentParams.AttachDef.Type"
    #>
    param(
        [Parameter(Mandatory=$true)]
        $Object,
        [Parameter(Mandatory=$true)]
        [string]$PropertyPath
    )
    
    if ($null -eq $Object) { return $null }
    
    $current = $Object
    $parts = $PropertyPath -split '\.'
    
    foreach ($part in $parts) {
        if ($null -eq $current) { return $null }
        
        # Check if part has array index, e.g., "Components[0]"
        if ($part -match '^(.+)\[(\d+)\]$') {
            $propName = $matches[1]
            $index = [int]$matches[2]
            
            # Navigate to the property
            if ($current.$propName -ne $null) {
                $current = $current.$propName
                # If it's an array, get the index
                if ($current -is [array] -and $current.Count -gt $index) {
                    $current = $current[$index]
                } elseif ($current -is [array]) {
                    return $null # Index out of bounds
                } else {
                    # Not an array, try to access directly
                    # This handles the case where it's a single object
                }
            } else {
                return $null
            }
        } else {
            # Simple property access
            if ($current.$part -ne $null) {
                $current = $current.$part
            } else {
                return $null
            }
        }
    }
    
    return $current
}

# ─── Get-ComponentByType ─────────────────────────────────────────────────
function Get-ComponentByType {
    <#
    .SYNOPSIS
        Busca un componente específico dentro del array Components[] de una entidad.
    .PARAMETER Components
        Array de componentes (del JSON DataCore).
    .PARAMETER ComponentType
        Tipo de componente a buscar (ej: SHealthComponentParams, SVehicleMovementParams).
    #>
    param(
        [Parameter(Mandatory=$true)]
        $Components,
        [Parameter(Mandatory=$true)]
        [string]$ComponentType
    )
    
    if ($null -eq $Components) { return $null }
    
    foreach ($comp in $Components) {
        if ($comp._Type -eq $ComponentType) {
            return $comp
        }
        # Some components don't have _Type but have the type as first property
    }
    
    return $null
}

# ─── Test-IsShipFile ─────────────────────────────────────────────────────
function Test-IsShipFile {
    <#
    .SYNOPSIS
        Verifica si un archivo es una definición de nave (EntityClassDefinition).
    .PARAMETER Path
        Ruta al archivo JSON.
    #>
    param([string]$Path)
    
    try {
        # Leer solo primeros 200 bytes para detectar tipo
        $reader = [System.IO.StreamReader]::new($Path, [System.Text.Encoding]::UTF8)
        $header = $reader.ReadToEnd()
        $reader.Close()
        
        if ($header -match '"EntityClassDefinition\.') {
            # Verificar que tenga componentes de vehículo
            if ($header -match 'SVehicleMovementParams') {
                return $true
            }
            if ($header -match 'SShipCrewParams') {
                return $true
            }
            if ($header -match 'SCargoGridParams') {
                return $true
            }
        }
        return $false
    } catch {
        return $false
    }
}

# ─── Get-StarBreakerFiles ────────────────────────────────────────────────
function Get-StarBreakerFiles {
    <#
    .SYNOPSIS
        Indexa todos los archivos JSON de StarBreaker agrupados por tipo.
    .PARAMETER BasePath
        Ruta raíz: C:\Users\...\star_data\libs\foundry\records
    .PARAMETER OutputFile
        Ruta para guardar el index (opcional, default: data-index.json en BasePath)
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$BasePath,
        [string]$OutputFile
    )
    
    if (-not (Test-Path $BasePath)) {
        Write-Error "Ruta no existe: $BasePath"
        return $null
    }
    
    if (-not $OutputFile) {
        $OutputFile = Join-Path $BasePath "data-index.json"
    }
    
    Write-Host "Indexando archivos en: $BasePath" -ForegroundColor Cyan
    $allFiles = Get-ChildItem -Path $BasePath -Filter "*.json" -File -Recurse
    $total = $allFiles.Count
    Write-Host "Total archivos encontrados: $total" -ForegroundColor Yellow
    
    $index = @{
        "_meta" = @{
            "fecha" = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            "total_archivos" = $total
            "ruta_base" = $BasePath
        }
        "por_tipo" = @{}
        "por_carpeta" = @{}
        "archivos" = @()
    }
    
    $count = 0
    $tipos = @{}
    $carpetas = @{}
    
    foreach ($file in $allFiles) {
        $count++
        if ($count % 1000 -eq 0) {
            Write-Host "  Progreso: $count de $total ($([math]::Round($count/$total*100,1))%)" -ForegroundColor Gray
        }
        
        $relativePath = $file.FullName.Substring($BasePath.Length + 1)
        $folder = $file.Directory.Name
        
        # Agrupar por carpeta
        if (-not $carpetas.ContainsKey($folder)) {
            $carpetas[$folder] = 0
        }
        $carpetas[$folder]++
        
        # Intentar detectar tipo por nombre de carpeta o nombre de archivo
        $tipo = "desconocido"
        if ($folder) { $tipo = $folder }
        
        if (-not $tipos.ContainsKey($tipo)) {
            $tipos[$tipo] = 0
        }
        $tipos[$tipo]++
        
        # Guardar entrada de archivo (solo nombre relativo para ahorrar espacio)
        $entry = @{
            "path" = $relativePath
            "folder" = $folder
            "type" = $tipo
            "size" = $file.Length
        }
        
        # Si es un EntityClassDefinition, detectar nombre de entidad
        if ($folder -eq "spaceships" -or $file.Name -match '^[a-z]{3,4}_') {
            $entry["entity_type"] = "EntityClassDefinition"
        }
        
        $index.archivos += $entry
    }
    
    # Ordenar tipos por cantidad
    $tiposSorted = [System.Collections.ArrayList]@()
    $tipos.GetEnumerator() | Sort-Object -Property Value -Descending | ForEach-Object {
        $null = $tiposSorted.Add(@{ "tipo" = $_.Key; "cantidad" = $_.Value })
    }
    $index.por_tipo = $tiposSorted
    
    # Ordenar carpetas por cantidad
    $carpetasSorted = [System.Collections.ArrayList]@()
    $carpetas.GetEnumerator() | Sort-Object -Property Value -Descending | ForEach-Object {
        $null = $carpetasSorted.Add(@{ "carpeta" = $_.Key; "cantidad" = $_.Value })
    }
    $index.por_carpeta = $carpetasSorted
    
    # Guardar index
    $index | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding UTF8
    
    Write-Host "`nIndex guardado en: $OutputFile" -ForegroundColor Green
    Write-Host "Categorias encontradas: $($tipos.Count)" -ForegroundColor Green
    
    # Mostrar top categorías
    Write-Host "`nTop 10 categorias por cantidad:" -ForegroundColor Yellow
    $tiposSorted | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.tipo): $($_.cantidad) archivos" -ForegroundColor Gray
    }
    
    return $index
}

# ─── Get-AllShips ────────────────────────────────────────────────────────
function Get-AllShips {
    <#
    .SYNOPSIS
        Extrae catálogo de naves desde entities/spaceships/.
    .PARAMETER BasePath
        Ruta raíz: C:\Users\...\star_data\libs\foundry\records
    .PARAMETER OutputFile
        Ruta para guardar el JSON resultante.
    .PARAMETER Translations
        Hashtable opcional con traducciones {clave: valor_es}.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$BasePath,
        [string]$OutputFile,
        $Translations
    )
    
    $shipsPath = Join-Path $BasePath "entities\spaceships"
    if (-not (Test-Path $shipsPath)) {
        Write-Error "No se encuentra entities/spaceships en: $shipsPath"
        return $null
    }
    
    $files = Get-ChildItem -Path $shipsPath -Filter "*.json" -File
    Write-Host "Procesando $($files.Count) archivos de naves..." -ForegroundColor Cyan
    
    $ships = @()
    $count = 0
    $shipDir = "C:\Users\preda\Desktop\star_data\libs\foundry\records"
    
    foreach ($file in $files) {
        $count++
        if ($count % 20 -eq 0) {
            Write-Host "  $count de $($files.Count)..." -ForegroundColor Gray
        }
        
        try {
            $json = Read-StarBreakerJson -Path $file.FullName
            if ($null -eq $json) { continue }
            
            $recordName = $json._RecordName
            $recordValue = $json._RecordValue
            
            if ($null -eq $recordValue) { continue }
            
            # Extraer identificador de nave (ej: AEGS_Avenger_Stalker)
            $entityId = ""
            if ($recordName -match 'EntityClassDefinition\.(.+)') {
                $entityId = $matches[1]
            } else {
                $entityId = $file.BaseName
            }
            
            # Extraer fabricante del prefijo del nombre
            $manufacturer = ""
            if ($entityId -match '^([A-Z]{3,4})_') {
                $manufacturer = $matches[1]
            }
            
            # Extraer nombre base (sin variantes)
            $baseName = $entityId
            if ($entityId -match '^[A-Z]{3,4}_(.+)$') {
                $baseName = $matches[1]
            }
            
            # Buscar traducción del nombre
            $nameES = $null
            if ($Translations) {
                $key1 = "${entityId}_DisplayName"
                $key2 = "EntityClassDefinition_${entityId}_DisplayName"
                $nameES = $Translations[$key1]
                if (-not $nameES) { $nameES = $Translations[$key2] }
            }
            
            # Componentes de la nave
            $components = $recordValue.Components
            
            # ---- SHealthComponentParams ----
            $healthComp = Get-ComponentByType -Components $components -ComponentType "SHealthComponentParams"
            $hullHP = 0
            if ($healthComp) {
                $hullHP = [double]($healthComp.Health)
            }
            
            # ---- SVehicleMovementParams ----
            $moveComp = Get-ComponentByType -Components $components -ComponentType "SVehicleMovementParams"
            $scmSpeed = 0
            $maxSpeed = 0
            $pitchRate = 0
            $yawRate = 0
            $rollRate = 0
            $maxAfterburner = 0
            
            if ($moveComp) {
                # SCM speed
                if ($moveComp.SpeedMax) { $scmSpeed = [double]($moveComp.SpeedMax) }
                # Max speed (afterburner)
                if ($moveComp.MaxSpeed) { $maxSpeed = [double]($moveComp.MaxSpeed) }
                if ($moveComp.MaxAfterburnerSpeed) { $maxAfterburner = [double]($moveComp.MaxAfterburnerSpeed) }
                
                # Angular velocity (pitch/yaw/roll)
                if ($moveComp.MaxAngularVelocity) {
                    $angVel = $moveComp.MaxAngularVelocity
                    if ($angVel.Pitch) { $pitchRate = [double]($angVel.Pitch) }
                    if ($angVel.Yaw) { $yawRate = [double]($angVel.Yaw) }
                    if ($angVel.Roll) { $rollRate = [double]($angVel.Roll) }
                }
            }
            
            # ---- SCargoGridParams ----
            $cargoComp = Get-ComponentByType -Components $components -ComponentType "SCargoGridParams"
            $scu = 0
            if ($cargoComp -and $cargoComp.cargoGrids) {
                # Sumar capacidad de todas las rejillas de carga
                $grids = $cargoComp.cargoGrids
                if ($grids -is [array]) {
                    foreach ($g in $grids) {
                        if ($g.GridWidth -and $g.GridHeight -and $g.GridDepth) {
                            $scu += [double]($g.GridWidth) * [double]($g.GridHeight) * [double]($g.GridDepth)
                        }
                    }
                } elseif ($grids) {
                    $scu = [double]($grids.GridWidth) * [double]($grids.GridHeight) * [double]($grids.GridDepth)
                }
            }
            
            # ---- SItemPortContainerComponentParams (slots) ----
            $slotComp = Get-ComponentByType -Components $components -ComponentType "SItemPortContainerComponentParams"
            $powerSlots = @()
            $shieldSlots = @()
            $coolerSlots = @()
            $qtSlots = @()
            
            if ($slotComp -and $slotComp.itemPorts) {
                $ports = $slotComp.itemPorts
                if ($ports -is [array]) {
                    foreach ($port in $ports) {
                        $portSize = ""
                        if ($port.PortName -match 'hardpoint_power_plant') { 
                            $size = ""
                            if ($port.Types -is [array] -and $port.Types[0] -match '_S(\d)_') { $size = $matches[1] }
                            elseif ($port.PortName -match '_S(\d)_') { $size = $matches[1] }
                            $powerSlots += @{"size" = $size; "name" = $port.PortName }
                        }
                        elseif ($port.PortName -match 'hardpoint_shield') {
                            $size = ""
                            if ($port.Types -is [array] -and $port.Types[0] -match '_S(\d)_') { $size = $matches[1] }
                            elseif ($port.PortName -match '_S(\d)_') { $size = $matches[1] }
                            $shieldSlots += @{"size" = $size; "name" = $port.PortName }
                        }
                        elseif ($port.PortName -match 'hardpoint_cooler') {
                            $size = ""
                            if ($port.Types -is [array] -and $port.Types[0] -match '_S(\d)_') { $size = $matches[1] }
                            elseif ($port.PortName -match '_S(\d)_') { $size = $matches[1] }
                            $coolerSlots += @{"size" = $size; "name" = $port.PortName }
                        }
                        elseif ($port.PortName -match 'hardpoint_quantum') {
                            $size = ""
                            if ($port.Types -is [array] -and $port.Types[0] -match '_S(\d)_') { $size = $matches[1] }
                            elseif ($port.PortName -match '_S(\d)_') { $size = $matches[1] }
                            $qtSlots += @{"size" = $size; "name" = $port.PortName }
                        }
                    }
                }
            }
            
            # ---- SShipCrewParams ----
            $crewComp = Get-ComponentByType -Components $components -ComponentType "SShipCrewParams"
            $crewMin = 0
            $crewMax = 0
            if ($crewComp) {
                if ($crewComp.MinCrew) { $crewMin = [int]($crewComp.MinCrew) }
                if ($crewComp.MaxCrew) { $crewMax = [int]($crewComp.MaxCrew) }
            }
            
            # ---- SQuantumDriveParams ----
            $qtComp = Get-ComponentByType -Components $components -ComponentType "SQuantumDriveParams"
            $qtSpeed = 0
            if ($qtComp) {
                if ($qtComp.QuantumTravelSpeed) { $qtSpeed = [double]($qtComp.QuantumTravelSpeed) }
            }
            
            # Construir objeto de nave
            $ship = [PSCustomObject]@{
                id = $entityId
                nombre_es = if ($nameES) { $nameES } else { $baseName }
                fabricante = $manufacturer
                archivo = $file.Name
                stats = @{
                    hull_hp = $hullHP
                    velocidad_scm = $scmSpeed
                    velocidad_max = $maxSpeed
                    velocidad_afterburner = $maxAfterburner
                    pitch = $pitchRate
                    yaw = $yawRate
                    roll = $rollRate
                    qt_speed = $qtSpeed
                    scu = $scu
                    tripulacion_min = $crewMin
                    tripulacion_max = $crewMax
                }
                slots = @{
                    power_plant = $powerSlots
                    shield = $shieldSlots
                    cooler = $coolerSlots
                    quantum_drive = $qtSlots
                }
            }
            
            $ships += $ship
            
        } catch {
            Write-Warning "Error en $($file.Name): $_"
        }
    }
    
    Write-Host "`nTotal naves extraidas: $($ships.Count)" -ForegroundColor Green
    
    if ($OutputFile) {
        $ships | ConvertTo-Json -Depth 5 | Out-File -FilePath $OutputFile -Encoding UTF8
        $tam = [math]::Round((Get-Item $OutputFile).Length / 1MB, 2)
        Write-Host "Guardado en: $OutputFile (${tam} MB)" -ForegroundColor Green
    }
    
    return $ships
}

# ─── Exportar funciones ──────────────────────────────────────────────────
Export-ModuleMember -Function Read-StarBreakerJson
Export-ModuleMember -Function Get-EntityValue
Export-ModuleMember -Function Get-ComponentByType
Export-ModuleMember -Function Test-IsShipFile
Export-ModuleMember -Function Get-StarBreakerFiles
Export-ModuleMember -Function Get-AllShips
