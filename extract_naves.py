# extract_naves.py — Extrae naves con stats desde StarBreaker + traducciones LetalDark ES
# USO: python extract_naves.py

import json, os, re, urllib.request

STARBREAKER_PATH = r"C:\Users\preda\Desktop\star_data\libs\foundry\records"
OUTPUT_PATH = r"C:\Users\preda\Desktop\star_citizen_web"
TRADUCCION_URL = "https://raw.githubusercontent.com/LetalDark/StarCitizen_ES_Plus/v1.33.6/versions/4.9.0-LIVE_12248363/output/global.ini"

FABRICANTES = ["AEGS","ANVL","ARGO","BANU","CNOU","CRUS","DRAK","ESPR","GAMA","GREY","KRIG","MISC","MRAI","ORIG","RSI","VNCL","XNAA"]

os.makedirs(OUTPUT_PATH, exist_ok=True)

# 1. Cargar traducciones
print("Cargando traducciones...")
trad = {}
try:
    with urllib.request.urlopen(TRADUCCION_URL) as f:
        for linea in f.read().decode('utf-8').split('\n'):
            linea = linea.strip()
            if '=' in linea and not linea.startswith('#') and not linea.startswith(';'):
                k, v = linea.split('=', 1)
                trad[k.strip()] = v.strip()
    print(f"OK {len(trad)} traducciones")
except Exception as e:
    print(f"Error descarga: {e}")
    exit(1)

# 2. Función para obtener valor anidado
def get_val(d, *keys, default=0):
    try:
        for k in keys:
            if isinstance(d, dict) and k in d:
                d = d[k]
            else:
                return default
        return d if d is not None else default
    except:
        return default

# 3. Procesar naves
print("Extrayendo naves...")
naves_dir = os.path.join(STARBREAKER_PATH, "entities", "spaceships")
archivos = [f for f in os.listdir(naves_dir) if f.endswith('.json')]
print(f"Archivos: {len(archivos)}")

naves = []
errores = 0

for archivo in archivos:
    entity_id = archivo.replace('.json', '').replace('EntityClassDefinition.', '', 1)
    ruta = os.path.join(naves_dir, archivo)
    
    try:
        with open(ruta, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except:
        errores += 1
        continue
    
    rv = data.get('_RecordValue_', data.get('_RecordValue', {}))
    comps = rv.get('Components', [])
    
    nave = {
        'entity_id': entity_id,
        'nombre_es': trad.get(f"{entity_id}_DisplayName", trad.get(f"@{entity_id}_Name", entity_id)),
        'fabricante': '',
        'hull_hp': 0,
        'shield_hp': 0,
        'velocidad_scm': 0,
        'velocidad_max': 0,
        'velocidad_retro': 0,
        'pitch': 0,
        'yaw': 0,
        'roll': 0,
        'cargo_scu': 0,
        'tripulacion_min': 0,
        'tripulacion_max': 0,
        'tamano': '',
        'precio_auec': 0,
    }
    
    # Fabricante
    for fab in FABRICANTES:
        if entity_id.startswith(fab + '_'):
            nave['fabricante'] = fab
            break
    
    # Analizar componentes
    for comp in comps:
        if not isinstance(comp, dict):
            continue
        ct = comp.get('_Type', '')
        
        if ct == 'SHealthComponentParams':
            health = comp.get('Health', {})
            nave['hull_hp'] = int(get_val(health, 'MaxHealth') or get_val(comp, 'MaxHealth'))
        
        elif ct == 'SVehicleMovementParams':
            nave['velocidad_scm'] = int(get_val(comp, 'SpeedSCM'))
            nave['velocidad_max'] = int(get_val(comp, 'SpeedMax'))
            nave['velocidad_retro'] = int(get_val(comp, 'SpeedReverse'))
            nave['pitch'] = int(get_val(comp, 'PitchSpeed'))
            nave['yaw'] = int(get_val(comp, 'YawSpeed'))
            nave['roll'] = int(get_val(comp, 'RollSpeed'))
        
        elif ct == 'SCargoGridParams':
            nave['cargo_scu'] = float(get_val(comp, 'MaxCargo'))
        
        elif ct == 'SShipCrewParams':
            nave['tripulacion_min'] = int(get_val(comp, 'MinCrew'))
            nave['tripulacion_max'] = int(get_val(comp, 'MaxCrew'))
        
        elif ct == 'SEntitlementParams':
            pass  # Precios podrían estar aquí
    
    naves.append(nave)

# 4. Guardar
ruta_out = os.path.join(OUTPUT_PATH, "naves_completo.json")
with open(ruta_out, 'w', encoding='utf-8') as f:
    json.dump(naves, f, ensure_ascii=False, indent=2)

tam = os.path.getsize(ruta_out) / 1024 / 1024
print(f"\nExtraidas: {len(naves)} naves | Errores: {errores}")
print(f"Archivo: {ruta_out} ({tam:.2f} MB)")

# 5. Resumen
con_stats = [n for n in naves if n['hull_hp'] > 0]
print(f"\nCon HP > 0: {len(con_stats)}")
for n in con_stats[:10]:
    print(f"  {n['nombre_es'][:30]:30s} | {n['fabricante']:5s} | HP:{n['hull_hp']:>6} | SCM:{n['velocidad_scm']:>4} | MAX:{n['velocidad_max']:>4} | SCU:{n['cargo_scu']:>4}")

print("\nCOMPLETADO")
