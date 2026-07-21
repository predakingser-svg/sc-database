#!/usr/bin/env python3
"""sc_extractor.py — Extrae datos de Star Citizen usando StarBreaker CLI + traducciones LetalDark"""

import subprocess, json, os, re, urllib.request, sys

STARBREAKER_CLI = r"G:\Descargas\starbreaker-cli-v0.3.2-windows-x86_64\starbreaker.exe"
OUTPUT_DIR = r"C:\Users\preda\Desktop\star_citizen_web"
TRAD_URL = "https://raw.githubusercontent.com/LetalDark/StarCitizen_ES_Plus/v1.33.6/versions/4.9.0-LIVE_12248363/output/global.ini"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Traducciones
print("Cargando traducciones...")
trad = {}
with urllib.request.urlopen(TRAD_URL) as f:
    for linea in f.read().decode('utf-8').split('\n'):
        linea = linea.strip()
        if '=' in linea and not linea.startswith('#') and not linea.startswith(';'):
            k, v = linea.split('=', 1)
            trad[k.strip()] = v.strip()
print(f"OK {len(trad)} traducciones")

def query_starbreaker(query_type, filter_str="*"):
    """Ejecuta starbreaker dcb query y devuelve texto"""
    cmd = [STARBREAKER_CLI, "dcb", "query", query_type, "--filter", filter_str]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return r.stdout
    except Exception as e:
        print(f"  Error query {query_type}: {e}")
        return ""

def parse_query_output(text):
    """Parsea la salida de 'starbreaker dcb query'"""
    lines = text.strip().split('\n')
    records = []
    seen = set()
    for line in lines:
        line = line.strip()
        if line.startswith('---'):
            continue
        if line and not line.startswith('#') and line not in seen:
            # Formato: RecordType.Name    value
            parts = line.split(None, 1)
            if len(parts) >= 1:
                records.append(line)
                seen.add(line)
    return records

def get_traduccion(entity_id):
    """Busca traducción para un entity_id en múltiples formatos"""
    for key in [f"{entity_id}_DisplayName", f"@{entity_id}_Name", f"{entity_id}_Name",
                f"{entity_id.replace('EntityClassDefinition.', '')}_DisplayName"]:
        if key in trad:
            return trad[key]
    return None

# 2. Extraer naves
print("\n=== NAVES ===")
# Obtener lista de naves (EntityClassDefinition de tipo Vehicle)
output = query_starbreaker("EntityClassDefinition", "*")
records = parse_query_output(output)

# Filtrar solo vehículos/naves (los que tienen AEGS_, ANVL_, etc.)
ship_prefixes = ["AEGS_","ANVL_","ARGO_","BANU_","CNOU_","CRUS_","DRAK_","ESPR_",
                 "GAMA_","GREY_","KRIG_","MISC_","MRAI_","ORIG_","RSI_","VNCL_","XNAA_"]
ships = []
for rec in records:
    # Extraer el nombre después de EntityClassDefinition.
    for prefix in ship_prefixes:
        if prefix in rec:
            name = rec.split()[0].replace('EntityClassDefinition.', '', 1)
            nombre_es = get_traduccion(name) or get_traduccion(f"EntityClassDefinition.{name}")
            ships.append({"entity_id": name, "nombre_es": nombre_es or name})
            break

print(f"Registros encontrados: {len(records)}")
print(f"Naves identificadas: {len(ships)}")
if ships:
    print("Ejemplos:")
    for s in ships[:5]:
        print(f"  {s['entity_id']} -> {s['nombre_es']}")

# Guardar lista de naves (sin stats aún - las stats requieren queries adicionales)
with open(os.path.join(OUTPUT_DIR, "naves_list.json"), 'w', encoding='utf-8') as f:
    json.dump(ships, f, ensure_ascii=False, indent=2)

# 3. Extraer componentes (shields, power, coolers, etc.)
print("\n=== COMPONENTES ===")
component_types = {
    "shields": "SHLD",
    "power_plants": "POWR",
    "coolers": "COOL",
    "quantum_drives": "QDRV",
}

all_components = {}
for comp_name, prefix in component_types.items():
    output = query_starbreaker("EntityClassDefinition", f"*{prefix}*")
    records = parse_query_output(output)
    items = []
    for rec in records:
        name = rec.split()[0].replace('EntityClassDefinition.', '', 1)
        nombre_es = get_traduccion(name) or name
        items.append({"entity_id": name, "nombre_es": nombre_es})
    all_components[comp_name] = items
    print(f"{comp_name}: {len(items)} encontrados")

with open(os.path.join(OUTPUT_DIR, "componentes_list.json"), 'w', encoding='utf-8') as f:
    json.dump(all_components, f, ensure_ascii=False, indent=2)

# 4. Extraer fabricantes
print("\n=== FABRICANTES ===")
output = query_starbreaker("scitemmanufacturer")
records = parse_query_output(output)
manufacturers = []
for rec in records:
    name = rec.split()[0]
    nombre_es = get_traduccion(name) or name
    manufacturers.append({"entity_id": name, "nombre_es": nombre_es})
print(f"Fabricantes: {len(manufacturers)}")
with open(os.path.join(OUTPUT_DIR, "fabricantes.json"), 'w', encoding='utf-8') as f:
    json.dump(manufacturers, f, ensure_ascii=False, indent=2)

# 5. Extraer misiones
print("\n=== MISIONES ===")
output = query_starbreaker("MissionData", "*")
records = parse_query_output(output)
missions = []
for rec in records[:50]:  # Limitado a 50 para prueba
    name = rec.split()[0]
    nombre_es = get_traduccion(name) or name
    missions.append({"entity_id": name, "nombre_es": nombre_es})
print(f"Misiones: {len(missions)} (mostrando 50)")
with open(os.path.join(OUTPUT_DIR, "misiones_list.json"), 'w', encoding='utf-8') as f:
    json.dump(missions, f, ensure_ascii=False, indent=2)

# Resumen
print("\n" + "="*50)
print("RESUMEN FINAL")
print("="*50)
for f in os.listdir(OUTPUT_DIR):
    if f.endswith('.json'):
        size = os.path.getsize(os.path.join(OUTPUT_DIR, f)) / 1024
        print(f"  {f}: {size:.1f} KB")

print(f"\nTodos los archivos en: {OUTPUT_DIR}")
