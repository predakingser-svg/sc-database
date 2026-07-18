#!/usr/bin/env python3
"""
Build Integrated Database — English + Spanish versions
Reads ALL scraped data + translations, creates complete bilingual databases
"""
import json, os, sys, re
from datetime import datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, 'api', 'data')
WORKSPACE = os.path.dirname(os.path.dirname(BASE))
SCRAPERS = os.path.join(WORKSPACE, 'scrapers', 'sc_data')

def load(path):
    if not os.path.exists(path):
        print(f"⚠️  No encontrado: {path}")
        return {}
    with open(path) as f:
        return json.load(f)

print("📡 Construyendo base de datos integrada...")
print()

# ─── Cargar todos los datos ───

# Traducciones global.ini
translations = load(os.path.join(DATA, 'translations_full.json'))
print(f"  ✅ {len(translations)} traducciones del global.ini")

# Contractor translations
contractors = load(os.path.join(DATA, 'contractor_translations.json'))
print(f"  ✅ {len(contractors)} contractors")

# Missions
missions_raw = load(os.path.join(SCRAPERS, 'missions_all.json'))
missions = missions_raw.get('missions', []) if missions_raw else []
print(f"  ✅ {len(missions)} misiones (raw)")

# Blueprints
bps_raw = load(os.path.join(SCRAPERS, 'blueprints_all.json'))
blueprints = bps_raw.get('blueprints', []) if bps_raw else []
print(f"  ✅ {len(blueprints)} blueprints (raw)")

# Weapons
weapons = load(os.path.join(SCRAPERS, 'ship_weapons.json'))
weapons_list = list(weapons.values()) if isinstance(weapons, dict) else (weapons if isinstance(weapons, list) else [])
print(f"  ✅ {len(weapons_list)} armas (raw)")

# Components
comps = load(os.path.join(DATA, 'components.json'))
components = comps.get('data', []) if isinstance(comps, dict) else comps
print(f"  ✅ {len(components)} componentes")

# Minerals
mins = load(os.path.join(DATA, 'minerals.json'))
minerals = mins.get('data', []) if isinstance(mins, dict) else mins
print(f"  ✅ {len(minerals)} minerales")

# Wikelo
wikelo = load(os.path.join(SCRAPERS, 'wikelo_catalog.json'))
wikelo_items = []
if isinstance(wikelo, dict):
    for cat in ['favor_trades', 'polaris_bit_recipes', 'weapon_contracts', 'armor_contracts', 'vehicle_contracts', 'ship_contracts']:
        for item in wikelo.get(cat, []):
            wikelo_items.append(item)
print(f"  ✅ {len(wikelo_items)} items Wikelo (raw)")

# Items
items_raw = load(os.path.join(SCRAPERS, '_all_items.json'))
items_list = items_raw if isinstance(items_raw, list) else (list(items_raw.values()) if isinstance(items_raw, dict) else [])
print(f"  ✅ {len(items_list)} items de tienda (raw)")


# ─── Función de traducción ───

def translate_text(text):
    """Traduce un texto usando el diccionario global.ini."""
    if not text or not isinstance(text, str):
        return text
    # Try exact key match
    if text in translations:
        return translations[text]
    # Try case-insensitive
    tl = text.lower()
    for k, v in translations.items():
        if k.lower() == tl:
            return v
    return text

def translate_mission_title(debug_name, title_en):
    """Busca traducción para título de misión por contractor."""
    if not debug_name:
        return None
    parts = debug_name.split('_')
    contractor = parts[0] if parts else ''
    if contractor in ('PU', 'PU-', 'Sandbox') and len(parts) > 1:
        contractor = parts[1]
    ct = contractors.get(contractor.lower())
    if ct and ct.get('titles'):
        dn = debug_name.lower()
        for t in ct['titles']:
            val = t.get('value', '')
            # Try to match by mission type keywords
            if 'bounty' in dn and 'bounty' in t.get('key','').lower():
                return val
            if 'delivery' in dn and 'delivery' in t.get('key','').lower():
                return val
            if 'assassin' in dn and ('assassin' in t.get('key','').lower() or 'kill' in t.get('key','').lower()):
                return val
            if 'repair' in dn and 'repair' in t.get('key','').lower():
                return val
            if 'salvage' in dn and 'salvage' in t.get('key','').lower():
                return val
            if 'collect' in dn and ('collect' in t.get('key','').lower() or 'bounty' in t.get('key','').lower()):
                return val
        # Return first available title
        return ct['titles'][0].get('value', '')
    return None


# ─── Construir versión en español ───

print("\n🏗️  Construyendo versión en español...")
db_es = {
    "name": "Star Citizen Database",
    "language": "es",
    "version": "4.9.0-live",
    "built": datetime.utcnow().isoformat() + "Z",
    "total_translations": len(translations),
}

# Missions with Spanish translations
missions_es = []
for m in missions:
    me = dict(m)
    es_title = translate_mission_title(m.get('debug_name', ''), m.get('title', ''))
    if es_title:
        me['title_es'] = es_title
    # Try description translation
    desc_match = None
    dn = m.get('debug_name', '')
    if dn:
        parts = dn.split('_')
        contractor = parts[0] if parts else ''
        if contractor in ('PU', 'PU-', 'Sandbox') and len(parts) > 1:
            contractor = parts[1]
        ct = contractors.get(contractor.lower())
        if ct and ct.get('descriptions'):
            desc_match = ct['descriptions'][0].get('value')
            me['description_es'] = desc_match
    missions_es.append(me)
db_es['missions'] = missions_es
print(f"  ✅ {len(missions_es)} misiones traducidas")

# Blueprints (translate output names)
bps_es = []
for b in blueprints:
    be = dict(b)
    name = b.get('output_name', '')
    es_name = translate_text(name)
    if es_name and es_name != name:
        be['output_name_es'] = es_name
    if 'ingredients' in be and be['ingredients']:
        ings = []
        for ing in be['ingredients']:
            if isinstance(ing, dict):
                i_es = dict(ing)
                iname = ing.get('name', '')
                es_iname = translate_text(iname)
                if es_iname and es_iname != iname:
                    i_es['name_es'] = es_iname
                ings.append(i_es)
            else:
                ings.append(ing)
        be['ingredients'] = ings
    bps_es.append(be)
db_es['blueprints'] = bps_es
print(f"  ✅ {len(bps_es)} blueprints traducidos")

# Weapons (translate names)
wpns_es = []
for w in weapons_list:
    we = dict(w)
    name = w.get('name', '')
    es_name = translate_text(name)
    if es_name and es_name != name:
        we['name_es'] = es_name
    wpns_es.append(we)
db_es['weapons'] = wpns_es
print(f"  ✅ {len(wpns_es)} armas traducidas")

# Components (already translated via __())
db_es['components'] = components
db_es['minerals'] = minerals
db_es['items'] = items_list

# Wikelo (translate item names)
wikelo_es = []
for w in wikelo_items:
    we = dict(w)
    name = w.get('name', '')
    es_name = translate_text(name)
    if es_name and es_name != name:
        we['name_es'] = es_name
    # Translate rewards
    rewards = w.get('rewards', [])
    if rewards:
        rewards_es = []
        for r in rewards:
            re_name = translate_text(r.get('name', ''))
            if re_name and re_name != r.get('name', ''):
                r_es = dict(r)
                r_es['name_es'] = re_name
                rewards_es.append(r_es)
            else:
                rewards_es.append(r)
        we['rewards'] = rewards_es
    wikelo_es.append(we)
db_es['wikelo'] = wikelo_es
print(f"  ✅ {len(wikelo_es)} items Wikelo traducidos")

# Factions (already translated)
ft = load(os.path.join(DATA, 'faction_translations.json'))
db_es['factions'] = ft if ft else {}
db_es['contractor_translations'] = contractors

print()
print(f"📊 Español: {len(db_es['missions'])} misiones, {len(db_es['blueprints'])} planos, {len(db_es['weapons'])} armas")


# ─── Construir versión en inglés ───

print("\n🏗️  Construyendo versión en inglés...")
db_en = {
    "name": "Star Citizen Database",
    "language": "en",
    "version": "4.9.0-live",
    "built": datetime.utcnow().isoformat() + "Z",
    "missions": missions,
    "blueprints": blueprints,
    "weapons": weapons_list,
    "components": components,
    "minerals": minerals,
    "items": items_list,
    "wikelo": wikelo_items,
    "factions": load(os.path.join(DATA, 'faction_translations.json')),
    "contractor_translations": contractors,
}
print(f"  ✅ {len(missions)} misiones (EN)")
print(f"  ✅ {len(blueprints)} blueprints (EN)")
print(f"  ✅ {len(weapons_list)} armas (EN)")
print(f"  ✅ {len(components)} componentes (EN)")
print(f"  ✅ {len(minerals)} minerales (EN)")
print(f"  ✅ {len(items_list)} items (EN)")
print(f"  ✅ {len(wikelo_items)} wikelo (EN)")


# ─── Guardar ───

os.makedirs(DATA, exist_ok=True)

es_path = os.path.join(DATA, 'sc_database_es.json')
with open(es_path, 'w') as f:
    json.dump(db_es, f, ensure_ascii=False)
print(f"\n✅ Guardado: {es_path}")

en_path = os.path.join(DATA, 'sc_database_en.json')
with open(en_path, 'w') as f:
    json.dump(db_en, f, ensure_ascii=False)
print(f"✅ Guardado: {en_path}")

# Stats
print(f"\n📊 Estadísticas finales:")
print(f"   ES: {os.path.getsize(es_path)/1024/1024:.1f} MB")
print(f"   EN: {os.path.getsize(en_path)/1024/1024:.1f} MB")
