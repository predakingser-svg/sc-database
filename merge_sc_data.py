#!/usr/bin/env python3
"""merge_sc_data.py — Fusiona scunpacked + traducciones LetalDark ES"""

import json, os, urllib.request

DATA_DIR = r"C:\Users\preda\Desktop\star_citizen_web"
TRAD_URL = "https://raw.githubusercontent.com/LetalDark/StarCitizen_ES_Plus/v1.33.6/versions/4.9.0-LIVE_12248363/output/global.ini"

# 1. Cargar traducciones
print("Cargando traducciones...")
trad = {}
with urllib.request.urlopen(TRAD_URL) as f:
    for line in f.read().decode('utf-8').split('\n'):
        line = line.strip()
        if '=' in line and not line.startswith('#') and not line.startswith(';'):
            k, v = line.split('=', 1)
            trad[k.strip()] = v.strip()
print(f"OK {len(trad)} traducciones")

def get_trad(name):
    """Busca traducción en múltiples formatos"""
    clean = name.replace('EntityClassDefinition.', '', 1)
    for k in [f"{clean}_DisplayName", f"@item/{clean}_Name", f"{clean}_Name",
              f"{name}_DisplayName", f"@item/{name}_Name"]:
        if k in trad:
            return trad[k]
    return None

def apply_translations(data, name_field="name", id_field="id"):
    """Aplica traducciones a una lista de items"""
    if not isinstance(data, list):
        return data
    translated = 0
    for item in data:
        name = item.get(name_field) or item.get(id_field) or ''
        es = get_trad(name)
        if es:
            item['nombre_es'] = es
            translated += 1
        else:
            # Usar nombre original como fallback
            item['nombre_es'] = name
    print(f"  Traducidos: {translated}/{len(data)}")
    return data

# 2. Procesar ships.json
print("\n=== NAVES ===")
ships_file = os.path.join(DATA_DIR, "ships.json")
if os.path.exists(ships_file):
    with open(ships_file, 'r', encoding='utf-8') as f:
        ships = json.load(f)
    print(f"Cargadas: {len(ships)} naves")
    ships = apply_translations(ships, "name", "className")
    
    # Resumen de stats disponibles en la primera nave
    if ships:
        print("\nStats disponibles en primera nave:")
        sample = ships[0]
        for k, v in sample.items():
            if not isinstance(v, (dict, list)):
                print(f"  {k}: {v}")
    
    with open(os.path.join(DATA_DIR, "ships_es.json"), 'w', encoding='utf-8') as f:
        json.dump(ships, f, ensure_ascii=False, indent=2)
    print("Guardado: ships_es.json")

# 3. Procesar ship-items.json (componentes)
print("\n=== COMPONENTES NAVE ===")
si_file = os.path.join(DATA_DIR, "ship-items.json")
if os.path.exists(si_file):
    with open(si_file, 'r', encoding='utf-8') as f:
        items = json.load(f)
    print(f"Cargados: {len(items)} items")
    items = apply_translations(items, "name", "className")
    with open(os.path.join(DATA_DIR, "componentes_es.json"), 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print("Guardado: componentes_es.json")

# 4. Procesar fps-items.json
print("\n=== ITEMS FPS ===")
fps_file = os.path.join(DATA_DIR, "fps-items.json")
if os.path.exists(fps_file):
    with open(fps_file, 'r', encoding='utf-8') as f:
        fps = json.load(f)
    print(f"Cargados: {len(fps)} items")
    fps = apply_translations(fps, "name", "className")
    with open(os.path.join(DATA_DIR, "fps_items_es.json"), 'w', encoding='utf-8') as f:
        json.dump(fps, f, ensure_ascii=False, indent=2)
    print("Guardado: fps_items_es.json")

# 5. Procesar manufacturers.json
print("\n=== FABRICANTES ===")
man_file = os.path.join(DATA_DIR, "manufacturers.json")
if os.path.exists(man_file):
    with open(man_file, 'r', encoding='utf-8') as f:
        mans = json.load(f)
    print(f"Cargados: {len(mans)} fabricantes")
    mans = apply_translations(mans, "name", "code")
    with open(os.path.join(DATA_DIR, "fabricantes_es.json"), 'w', encoding='utf-8') as f:
        json.dump(mans, f, ensure_ascii=False, indent=2)
    print("Guardado: fabricantes_es.json")

# 6. Resumen
print("\n" + "="*50)
print("ARCHIVOS GENERADOS (con traducciones):")
for f in sorted(os.listdir(DATA_DIR)):
    if f.endswith('_es.json'):
        size = os.path.getsize(os.path.join(DATA_DIR, f)) / 1024
        print(f"  {f}: {size:.1f} KB")
print(f"\nTodo en: {DATA_DIR}")
