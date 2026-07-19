#!/usr/bin/env python3
"""
Build SC Database v3.0.0 — Bilingual schema with embedded {en, es} fields
Output: sc_database_v3_es.json + sc_database_v3_en.json

Schema highlights:
  - title/description: {en: "...", es: "..."} bilingual embedded
  - factions: populated from mission_givers + contractor_translations
  - items: with type, description, price (if exist)
  - wikelo: categorized and translated
  - translations: full dictionary (89k entries)
  - NO contractor_translations (already in translations)
  - _meta: schema_version, built_at, total_counts
"""
import json, os, sys, re
from datetime import datetime, timezone

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, 'api', 'data')
WORKSPACE = os.path.dirname(os.path.dirname(BASE))
SCRAPERS = os.path.join(WORKSPACE, 'scrapers', 'sc_data')

SCHEMA_VERSION = "3.0.0"


def load(path, default=None):
    if default is None:
        default = {} if path.endswith('.json') else []
    if not os.path.exists(path):
        print(f"  ⚠️  No encontrado: {path}")
        return default
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def safe_compact(text, maxlen=120):
    """Shorten text for display in progress messages."""
    if not text:
        return ""
    s = text.replace('\n', ' ').replace('\r', '')
    return s[:maxlen] + "…" if len(s) > maxlen else s


# =====================================================================
# 1. LOAD ALL SOURCE DATA
# =====================================================================
print("=" * 60)
print("  SC Database v3.0.0 — Bilingual Schema Builder")
print("=" * 60)
print()

print("📥 Cargando datos fuente...")

# Translations (global.ini, full dictionary)
translations_raw = load(os.path.join(DATA, 'translations_full.json'))
print(f"  ✅ translations_full.json: {len(translations_raw)} entradas")

# Contractor translations (mission titles, descriptions, faction names)
contractors = load(os.path.join(DATA, 'contractor_translations.json'))
print(f"  ✅ contractor_translations.json: {len(contractors)} contratistas")

# Global INI extract (factions, places, wikelo, mining, etc.)
global_ini = load(os.path.join(SCRAPERS, 'global_ini_extract.json'))
print(f"  ✅ global_ini_extract.json: {len(global_ini)} secciones")

# Missions
missions_raw = load(os.path.join(SCRAPERS, 'missions_all.json'))
missions = missions_raw.get('missions', []) if isinstance(missions_raw, dict) else (missions_raw if isinstance(missions_raw, list) else [])
print(f"  ✅ missions_all.json: {len(missions)} misiones")

# Blueprints
bps_raw = load(os.path.join(SCRAPERS, 'blueprints_all.json'))
blueprints = bps_raw.get('blueprints', []) if isinstance(bps_raw, dict) else (bps_raw if isinstance(bps_raw, list) else [])
print(f"  ✅ blueprints_all.json: {len(blueprints)} planos")

# Weapons
weapons_raw = load(os.path.join(SCRAPERS, 'ship_weapons.json'))
weapons_list = list(weapons_raw.values()) if isinstance(weapons_raw, dict) else (weapons_raw if isinstance(weapons_raw, list) else [])
print(f"  ✅ ship_weapons.json: {len(weapons_list)} armas")

# Components
comps = load(os.path.join(DATA, 'components.json'))
components = comps.get('data', []) if isinstance(comps, dict) else comps
print(f"  ✅ components.json: {len(components)} componentes")

# Minerals
mins = load(os.path.join(DATA, 'minerals.json'))
minerals = mins.get('data', []) if isinstance(mins, dict) else mins
print(f"  ✅ minerals.json: {len(minerals)} minerales")

# Wikelo catalog
wikelo = load(os.path.join(SCRAPERS, 'wikelo_catalog.json'))
print(f"  ✅ wikelo_catalog.json: {len(wikelo)} entradas raíz")

# Store items (all items from in-game shops)
items_raw = load(os.path.join(SCRAPERS, '_all_items.json'))
items_list_all = items_raw if isinstance(items_raw, list) else (list(items_raw.values()) if isinstance(items_raw, dict) else [])
print(f"  ✅ _all_items.json: {len(items_list_all)} items de tienda")

# Missions factions blueprints (enriched data with faction names/categories)
mfb = load(os.path.join(SCRAPERS, 'missions_factions_blueprints.json'))
factions_enriched = mfb.get('factions', {}) if isinstance(mfb, dict) else {}
mission_categories = mfb.get('mission_categories', []) if isinstance(mfb, dict) else []
print(f"  ✅ missions_factions_blueprints.json: {sum(len(v) if isinstance(v, list) else 0 for v in factions_enriched.values()) if isinstance(factions_enriched, dict) else 0} facciones enriquecidas")


# =====================================================================
# 2. BUILD COMPREHENSIVE TRANSLATION MAP
# =====================================================================
print()
print("🔤 Construyendo mapa de traducciones...")

# Base: translations_full.json covers ~89k keys (EN → ES)
# We also build an inverted map if needed for ES → EN lookups
translations_es = dict(translations_raw)  # key → Spanish text
# Build inverted: ES text → EN key (for reverse lookup if needed)
translations_en_reverse = {}
for en_key, es_val in translations_raw.items():
    trimmed = es_val.strip()
    if trimmed and trimmed not in translations_en_reverse:
        translations_en_reverse[trimmed] = en_key

# Contractor translations: build a flat {contractor_key → dict of ES values}
# Keys like "BlacJac_BasicBounty_Title_01" → "Buscado por ArcCorp..."
contractor_lookup = {}  # contractor_lowercase → {es_title_key, es_title_val, es_desc_key, es_desc_val, ...}
for c_name, c_data in contractors.items():
    c_lower = c_name.lower()
    lookup = {'titles': [], 'descriptions': [], 'names': [], 'other': []}
    for title_entry in c_data.get('titles', []):
        lookup['titles'].append({
            'key': title_entry.get('key', ''),
            'value_es': title_entry.get('value', title_entry.get('value_es', '')),
            'value_en': title_entry.get('value_en', title_entry.get('key', '')),
        })
    for desc_entry in c_data.get('descriptions', []):
        lookup['descriptions'].append({
            'key': desc_entry.get('key', ''),
            'value_es': desc_entry.get('value', desc_entry.get('value_es', '')),
            'value_en': desc_entry.get('value_en', desc_entry.get('key', '')),
        })
    for name_entry in c_data.get('names', []):
        lookup['names'].append({
            'key': name_entry.get('key', ''),
            'value_es': name_entry.get('value', name_entry.get('value_es', '')),
            'value_en': name_entry.get('value_en', name_entry.get('key', '')),
        })
    for other_entry in c_data.get('other', []):
        lookup['other'].append({
            'key': other_entry.get('key', ''),
            'value_es': other_entry.get('value', other_entry.get('value_es', '')),
            'value_en': other_entry.get('value_en', other_entry.get('key', '')),
        })
    contractor_lookup[c_lower] = lookup

# Also build a flat key→ES dictionary merging all contractor data
contractor_flat_es = {}  # key → Spanish value
contractor_flat_en = {}  # key → English key (approximation)
for c_name, c_data in contractors.items():
    for field in ['titles', 'descriptions', 'names', 'other']:
        for entry in c_data.get(field, []):
            k = entry.get('key', '')
            v = entry.get('value', '')
            if k:
                contractor_flat_es[k] = v
                contractor_flat_en[k] = k

print(f"  ✅ Mapa contractor_lookup: {len(contractor_lookup)} contratistas indexados")
print(f"  ✅ contractor_flat_es: {len(contractor_flat_es)} entradas planas")


# =====================================================================
# 3. HELPER: Bilingual lookups
# =====================================================================

def get_bilingual_text(en_text, key_hint=None):
    """
    Return {'en': en_text, 'es': translated_or_none}.
    Searches translations_full first, then contractor data.
    """
    if not en_text or not isinstance(en_text, str):
        return {'en': en_text or '', 'es': None}

    # 1. Try exact key match
    es_val = translations_raw.get(en_text)
    if es_val:
        return {'en': en_text, 'es': es_val}

    # 2. Try case-insensitive lookup in translations
    en_lower = en_text.lower().strip()
    for k, v in translations_raw.items():
        if k.lower().strip() == en_lower:
            return {'en': en_text, 'es': v}

    # 3. If key_hint provided, try contractor_lookup
    if key_hint:
        c_lower = key_hint.lower()
        if c_lower in contractor_lookup:
            ct = contractor_lookup[c_lower]
            for entry in ct.get('titles', []):
                if entry.get('value_es') and entry['value_es'] != entry.get('key', ''):
                    return {'en': en_text, 'es': entry['value_es']}
            for entry in ct.get('descriptions', []):
                if entry.get('value_es') and entry['value_es'] != entry.get('key', ''):
                    return {'en': en_text, 'es': entry['value_es']}

    return {'en': en_text, 'es': None}


def get_contractor_translation(contractor_name):
    """Get bilingual name for a contractor/faction from contractor_translations."""
    c_lower = contractor_name.lower().strip()
    if c_lower in contractor_lookup:
        ct = contractor_lookup[c_lower]
        # Try names first, then first title
        for entry in ct.get('names', []):
            es = entry.get('value_es', '')
            if es:
                return {'en': contractor_name, 'es': es}
        for entry in ct.get('titles', []):
            es = entry.get('value_es', '')
            if es:
                return {'en': contractor_name, 'es': es}
    return {'en': contractor_name, 'es': None}


def translate_mission_by_debug(debug_name):
    """
    Given a mission debug_name like 'blacjac_bounty_fps_title_001',
    find the ES title from contractor_translations.
    Returns (es_title, es_description) tuple.
    """
    if not debug_name:
        return (None, None)

    parts = debug_name.split('_')
    contractor = parts[0] if parts else ''
    # Handle PU/PU- prefix
    if contractor in ('PU', 'PU-', 'Sandbox', 'Sandman') and len(parts) > 1:
        contractor = parts[1]

    c_lower = contractor.lower()
    es_title = None
    es_desc = None

    if c_lower in contractor_lookup:
        ct = contractor_lookup[c_lower]
        dn_lower = debug_name.lower()

        # Match specific title key
        for t in ct.get('titles', []):
            t_key = t.get('key', '').lower()
            # Try to match end of debug_name with key
            if t.get('value_es') and (dn_lower in t_key or t_key in dn_lower or t_key == dn_lower):
                es_title = t['value_es']
                break
            # Match by mission type keywords
            if t.get('value_es'):
                if 'bounty' in dn_lower and 'bounty' in t_key:
                    es_title = t['value_es']
                    break
                if 'delivery' in dn_lower and 'delivery' in t_key:
                    es_title = t['value_es']
                    break
                if 'assassin' in dn_lower and ('assassin' in t_key or 'kill' in t_key):
                    es_title = t['value_es']
                    break
                if 'repair' in dn_lower and 'repair' in t_key:
                    es_title = t['value_es']
                    break
                if 'salvage' in dn_lower and 'salvage' in t_key:
                    es_title = t['value_es']
                    break
                if 'collect' in dn_lower and ('collect' in t_key or 'bounty' in t_key):
                    es_title = t['value_es']
                    break
                if 'hauling' in dn_lower and ('hauling' in t_key or 'transport' in t_key):
                    es_title = t['value_es']
                    break

        # If no match found, use first available title
        if not es_title and ct.get('titles'):
            es_title = ct['titles'][0].get('value_es', None)

        # Get description (first matching or first available)
        for d in ct.get('descriptions', []):
            d_key = d.get('key', '').lower()
            if d.get('value_es') and (dn_lower in d_key or d_key in dn_lower):
                es_desc = d['value_es']
                break
        if not es_desc and ct.get('descriptions'):
            es_desc = ct['descriptions'][0].get('value_es', None)

    return (es_title, es_desc)


# =====================================================================
# 4. ITEM CLASSIFICATION — explicit category per item
# =====================================================================

def classify_item(name):
    """
    Clasifica un item por nombre en categoría estándar.
    Returns: dict con keys:
      - category:      'ship_weapon' | 'fps_weapon' | 'item'
      - is_ship_weapon: bool (True = debe ir a sección weapons)
      - weapon_subtype: str | None
    """
    result = {'category': 'item', 'is_ship_weapon': False, 'weapon_subtype': None}
    if not name:
        return result

    non_weapon_exceptions = [
        r'(?i)bomber\s*jacket',
        r'(?i)bombora\s*livery',
        r'(?i)torpedo\s*burrito',
        r'(?i)laser\s*pointer',
        r'(?i)laser\s*activation',
        r'(?i)laser\s*sniper',
        r'(?i)laser\s*pistol',
        r'(?i)laser\s*shotgun',
        r'(?i)laser\s*rifle',
        r'(?i)mining\s*laser',
        r'(?i)mining\s*repeater',
        r'(?i)\bfire\s*extinguisher\b',
        r'(?i)plushie',
        r'(?i)schematic',
    ]
    for exc in non_weapon_exceptions:
        if re.search(exc, name):
            return result

    # ─── SHIP WEAPONS ───
    if re.search(r'(?i)\b(cannon|repeater|gatling|mass\s*driver|suckerpunch)\b', name):
        return {'category': 'ship_weapon', 'is_ship_weapon': True, 'weapon_subtype': 'ship_weapon'}
    if re.search(r'(?i)\bmissile\b', name):
        return {'category': 'ship_weapon', 'is_ship_weapon': True, 'weapon_subtype': 'missile'}
    if re.search(r'(?i)\btorpedo\b', name):
        return {'category': 'ship_weapon', 'is_ship_weapon': True, 'weapon_subtype': 'torpedo'}
    if re.search(r'(?i)\bbomb\b', name):
        return {'category': 'ship_weapon', 'is_ship_weapon': True, 'weapon_subtype': 'bomb'}
    if re.search(r'(?i)\b(missile|torpedo|bomb)\s*rack\b', name):
        return {'category': 'ship_weapon', 'is_ship_weapon': True, 'weapon_subtype': 'weapon_mount'}
    if re.search(r'(?i)\b(rocket\s*launcher)\b', name):
        return {'category': 'ship_weapon', 'is_ship_weapon': True, 'weapon_subtype': 'rocket_launcher'}
    if re.search(r'(?i)\bturret\b', name):
        return {'category': 'ship_weapon', 'is_ship_weapon': True, 'weapon_subtype': 'turret'}

    # ─── FPS WEAPONS ───
    fps_suffix_re = re.compile(
        r'(?i)\b(Pistol|Sniper\s*Rifle|Shotgun|SMG|LMG|Launcher|'
        r'Combat\s*Knife|Submachine\s*Gun|Assault\s*Rifle|'
        r'Machine\s*Gun|Rifle)\s*$'
    )
    if fps_suffix_re.search(name) and not re.search(r'(?i)\b(mining|salvage)\b', name):
        return {'category': 'fps_weapon', 'is_ship_weapon': False, 'weapon_subtype': 'fps_weapon'}

    fps_base_names = [
        'A03', 'Animus', 'Arclight', 'Arrowhead', 'Atzkav',
        'BR-2', 'C54', 'Coda', 'Custodian', 'Deadrig',
        'Demeco', 'Desperado', 'Devastator', 'Enforcer', 'F55',
        'Finnigan', 'FS-9', 'Gallant', 'Gemini',
        'GP-33', 'Karna', 'Kubeyev', 'LH-86',
        'P4-AR', 'P6-LR', 'P8-SC',
        'PF-9', 'Ravager', 'RPL-20', 'Salvation',
        'Scourge', 'Sangar', 'TASCAN', 'Tsunagi',
        'Yubarev', 'Zampec', 'Zanaru', 'Zweihander',
    ]
    name_lower = name.lower()
    for base in fps_base_names:
        if base.lower() in name_lower:
            if re.search(r'(?i)\b(paint|livery|skin|schematic|plushie|poster|trophy|model|decal)\b', name):
                continue
            return {'category': 'fps_weapon', 'is_ship_weapon': False, 'weapon_subtype': 'fps_weapon'}

    return result


# Separate weapon items from regular shop items
items_list = []
weapon_items_from_store = []
fps_weapon_items_from_store = []

# Filtrar weapons_list: descartar liveries, plantas decorativas, etc.
wpn_name_set = set()
filtered_weapons = []
for w in weapons_list:
    n = w.get('name', '')
    cls = classify_item(n)
    if cls['is_ship_weapon']:
        filtered_weapons.append(w)
        if n:
            wpn_name_set.add(n.lower().strip())
weapons_list = filtered_weapons

for item in items_list_all:
    name = item.get('name', '')
    cls = classify_item(name)
    entry = {
        'id': item.get('id', ''),
        'name': name,
        'Sold': item.get('Sold', 0),
        'category': cls['category'],
        '_weapon_type': cls['weapon_subtype'],
        '_source': 'shop_data',
    }
    if cls['is_ship_weapon']:
        weapon_items_from_store.append(entry)
    elif cls['category'] == 'fps_weapon':
        fps_weapon_items_from_store.append(entry)
    else:
        items_list.append(entry)

print()
print(f"🔫 Items armamentísticos de nave: {len(weapon_items_from_store)}")
print(f"🎯 Items FPS: {len(fps_weapon_items_from_store)}")
print(f"📦 Items regulares de tienda: {len(items_list)}")


# =====================================================================
# 5. BUILD FACTIONS
# =====================================================================
print()
print("🏛️  Construyendo facciones...")

# Merge enriched factions + contractor_translations names
factions_merged = []

# Process enriched factions from missions_factions_blueprints.json
if isinstance(factions_enriched, dict):
    for category_key, faction_group in factions_enriched.items():
        if isinstance(faction_group, list):
            for f in faction_group:
                fname = f.get('name', '')
                if not fname:
                    continue
                # Get bilingual name from contractor_translations
                bilingual_name = get_contractor_translation(fname)
                factions_merged.append({
                    'name': {'en': fname, 'es': bilingual_name['es'] or fname},
                    'scope': f.get('scope', ''),
                    'system': f.get('system', ''),
                    'location': f.get('location', ''),
                    'category': category_key,
                })

# Also add contractors that are factions but not in enriched list
contractor_faction_names = set(f['name']['en'] for f in factions_merged)
added_contractors = 0
for c_name, c_data in contractors.items():
    # Check if this contractor has a "name" entry (indicates it's a faction)
    name_entries = c_data.get('names', [])
    if not name_entries:
        continue
    for ne in name_entries:
        n_es = ne.get('value', '')
        # The EN name might be encoded in the key: "Advocacy_RepUI_Name" → use c_name
        # Skip if already in merged factions
        c_display = c_name.replace('_', ' ').title()
        if c_display not in contractor_faction_names:
            bilingual_name = get_contractor_translation(c_name)
            en_name = bilingual_name['en']
            # Try to get a better EN name from name entry key
            en_name = ne.get('key', '').replace('_RepUI_Name', '').replace('_Name', '').replace('_', ' ').title()
            factions_merged.append({
                'name': {'en': en_name, 'es': n_es},
                'scope': '',
                'system': '',
                'location': '',
                'category': 'contractor',
            })
            contractor_faction_names.add(c_display)
            added_contractors += 1

print(f"  ✅ {len(factions_merged)} facciones ({added_contractors} de contractors)")


# =====================================================================
# 6. BUILD MISSIONS with bilingual title/description
# =====================================================================
print()
print("🎯 Procesando misiones...")

missions_bilingual = []
missions_with_es_title = 0
missions_with_es_desc = 0

for m in missions:
    en_title = m.get('title', '')
    en_desc = m.get('description', '')
    debug_name = m.get('debug_name', '')
    mission_giver = m.get('mission_giver', '')

    # Try direct key-based translation (title might be a translation key)
    title_bilingual = get_bilingual_text(en_title)
    desc_bilingual = get_bilingual_text(en_desc)

    # If no ES title found, try contractor-based lookup
    es_title = title_bilingual['es']
    es_desc = desc_bilingual['es']
    if not es_title:
        es_title_from_debug, es_desc_from_debug = translate_mission_by_debug(debug_name)
        if es_title_from_debug:
            es_title = es_title_from_debug
            title_bilingual = {'en': en_title, 'es': es_title}
    if not es_desc:
        _, es_desc_from_debug = translate_mission_by_debug(debug_name)
        if es_desc_from_debug:
            es_desc = es_desc_from_debug
            desc_bilingual = {'en': en_desc, 'es': es_desc}

    if es_title:
        missions_with_es_title += 1
    if es_desc:
        missions_with_es_desc += 1

    # Build the mission entry — keep all original fields, transform title/description
    mission_entry = {
        'uuid': m.get('uuid', ''),
        'title': title_bilingual,
        'description': desc_bilingual,
        'debug_name': debug_name,
        'mission_giver': mission_giver,
        'faction': m.get('faction', ''),
        'illegal': m.get('illegal', False),
        'legality_label': m.get('legality_label', ''),
        'reward_min': m.get('reward_min', 0),
        'reward_max': m.get('reward_max', 0),
        'reward_currency': m.get('reward_currency', ''),
        'time_to_complete_minutes': m.get('time_to_complete_minutes', 0),
        'star_systems': m.get('star_systems', []),
        'has_combat': m.get('has_combat', False),
        'has_blueprints': m.get('has_blueprints', False),
        'enemy_count_min': m.get('enemy_count_min', 0),
        'enemy_count_max': m.get('enemy_count_max', 0),
        'variant_count': m.get('variant_count', 0),
        'variants': m.get('variants', []),
        'rank_index': m.get('rank_index', 0),
        'min_standing': m.get('min_standing', 0),
        'max_standing': m.get('max_standing', 0),
        'has_chain': m.get('has_chain', False),
        'has_prerequisites': m.get('has_prerequisites', False),
        'has_hauling': m.get('has_hauling', False),
        'cost': m.get('cost', 0),
        'cooldown': m.get('cooldown', False),
        'cooldown_seconds': m.get('cooldown_seconds', 0),
        'reputation_gained': m.get('reputation_gained', 0),
        'max_players_per_instance': m.get('max_players_per_instance', 0),
        'shareable': m.get('shareable', False),
        'once_only': m.get('once_only', False),
        'released': m.get('released', False),
        'game_version': m.get('game_version', ''),
        'link': m.get('link', ''),
        'web_url': m.get('web_url', ''),
    }
    # Only include blueprints field if present
    if m.get('blueprints'):
        mission_entry['blueprints'] = m['blueprints']
    if m.get('hauling_summary'):
        mission_entry['hauling_summary'] = m['hauling_summary']
    if m.get('min_standing_name'):
        mission_entry['min_standing_name'] = m['min_standing_name']
    if m.get('max_standing_name'):
        mission_entry['max_standing_name'] = m['max_standing_name']

    missions_bilingual.append(mission_entry)

print(f"  ✅ {len(missions_bilingual)} misiones procesadas")
print(f"     {missions_with_es_title} con título ES, {missions_with_es_desc} con descripción ES")


# =====================================================================
# 7. BUILD BLUEPRINTS with bilingual fields
# =====================================================================
print()
print("📐 Procesando blueprints...")

blueprints_bilingual = []
for b in blueprints:
    output_name = b.get('output_name', '')
    bp_bilingual = get_bilingual_text(output_name)

    ingredients = []
    for ing in b.get('ingredients', []):
        if isinstance(ing, dict):
            ing_name = ing.get('name', '')
            ing_bilingual = get_bilingual_text(ing_name)
            ingredients.append({
                'name': ing_bilingual,
                'kind': ing.get('kind', ''),
                'quantity': ing.get('quantity', 0),
                'unit': ing.get('unit', ''),
                'resource_type_uuid': ing.get('resource_type_uuid', ''),
            })
        else:
            ingredients.append(ing)

    blueprint_entry = {
        'uuid': b.get('uuid', ''),
        'key': b.get('key', ''),
        'category_uuid': b.get('category_uuid', ''),
        'output_item_uuid': b.get('output_item_uuid', ''),
        'output_name': bp_bilingual,
        'output_class': b.get('output_class', ''),
        'craft_time_seconds': b.get('craft_time_seconds', 0),
        'craft_time_label': b.get('craft_time_label', ''),
        'is_available_by_default': b.get('is_available_by_default', False),
        'game_version': b.get('game_version', ''),
        'ingredient_count': b.get('ingredient_count', 0),
        'unlocking_missions_count': b.get('unlocking_missions_count', 0),
        'ingredients': ingredients,
    }
    if b.get('unlocking_missions'):
        blueprint_entry['unlocking_missions'] = b['unlocking_missions']
    if b.get('craft_time_minutes'):
        blueprint_entry['craft_time_minutes'] = b['craft_time_minutes']

    blueprints_bilingual.append(blueprint_entry)

print(f"  ✅ {len(blueprints_bilingual)} blueprints")


# =====================================================================
# 8. BUILD WEAPONS with bilingual names + explicit category
# =====================================================================
print()
print("🔫 Procesando armas...")

weapons_bilingual = []
for w in weapons_list:
    wname = w.get('name', '')
    w_bilingual = get_bilingual_text(wname)
    wep_entry = {
        'id': w.get('id', ''),
        'name': w_bilingual,
        'category': 'ship_weapon',
        'locations': w.get('locations', []),
        'stats': w.get('stats', {}),
    }
    weapons_bilingual.append(wep_entry)

# Add store weapon items (missiles, torpedoes, etc.) with bilingual names
for wi in weapon_items_from_store:
    n = wi.get('name', '')
    if n.lower().strip() not in wpn_name_set:
        w_bilingual = get_bilingual_text(n)
        weapons_bilingual.append({
            'id': wi.get('id', ''),
            'name': w_bilingual,
            'Sold': wi.get('Sold', 0),
            'category': 'ship_weapon',
            'weapon_type': wi.get('_weapon_type', 'unknown'),
            '_source': 'shop_data',
        })

print(f"  ✅ {len(weapons_bilingual)} armas (incluye {len(weapon_items_from_store)} de tienda)")


# =====================================================================
# 9. BUILD COMPONENTS & MINERALS (bilingual names)
# =====================================================================
print()
print("⚙️  Procesando componentes y minerales...")

components_bilingual = []
for c in components:
    cname = c.get('name', '')
    c_bilingual = get_bilingual_text(cname)
    components_bilingual.append({
        'name': c_bilingual,
        'type': c.get('type', ''),
        'size': c.get('size', ''),
        'grade': c.get('grade', ''),
        'category': 'ship_component',
    })
print(f"  ✅ {len(components_bilingual)} componentes")

minerals_bilingual = []
for m in minerals:
    mname = m.get('name', '')
    m_bilingual = get_bilingual_text(mname)
    minerals_bilingual.append({
        'name': m_bilingual,
        'type': m.get('type', ''),
        'rarity': m.get('rarity', ''),
        'signatures': m.get('signatures', {}),
        'signature_min': m.get('signature_min', 0),
        'signature_max': m.get('signature_max', 0),
        'locations': m.get('locations', []),
    })
print(f"  ✅ {len(minerals_bilingual)} minerales")


# =====================================================================
# 10. BUILD ITEMS with type, description, price
# =====================================================================
print()
print("📦 Procesando items de tienda...")

items_bilingual = []
# Regular items
for item in items_list:
    iname = item.get('name', '')
    i_bilingual = get_bilingual_text(iname)
    entry = {
        'id': item.get('id', ''),
        'name': i_bilingual,
        'Sold': item.get('Sold', 0),
        'category': 'item',
    }
    if item.get('type'):
        entry['type'] = item['type']
    if item.get('description'):
        desc_bilingual = get_bilingual_text(item['description'])
        entry['description'] = desc_bilingual
    if item.get('price') is not None:
        entry['price'] = item['price']
    items_bilingual.append(entry)

# FPS weapons (from store items that are FPS guns or ammo)
for fw in fps_weapon_items_from_store:
    iname = fw.get('name', '')
    i_bilingual = get_bilingual_text(iname)
    entry = {
        'id': fw.get('id', ''),
        'name': i_bilingual,
        'Sold': fw.get('Sold', 0),
        'category': 'fps_weapon',
    }
    items_bilingual.append(entry)

print(f"  ✅ {len(items_bilingual)} items ({len(fps_weapon_items_from_store)} FPS)")


# =====================================================================
# 11. BUILD WIKELO — categorized and translated
# =====================================================================
print()
print("🔄 Procesando Wikelo...")

# Define the categories to extract
WIKELO_CATEGORIES = ['favor_trades', 'polaris_bit_recipes', 'weapon_contracts',
                     'armor_contracts', 'vehicle_contracts', 'ship_contracts']

wikelo_bilingual = []
category_labels = {
    'favor_trades': 'Favor Trades',
    'polaris_bit_recipes': 'Polaris Bit Recipes',
    'weapon_contracts': 'Weapon Contracts',
    'armor_contracts': 'Armor Contracts',
    'vehicle_contracts': 'Vehicle Contracts',
    'ship_contracts': 'Ship Contracts',
}

wikelo_meta = {
    'source': wikelo.get('source', ''),
    'date': wikelo.get('date', ''),
    'version': wikelo.get('version', ''),
    'locations': wikelo.get('locations', []),
    'reputation_ranks': wikelo.get('reputation_ranks', []),
}

for cat in WIKELO_CATEGORIES:
    for witem in wikelo.get(cat, []):
        wname = witem.get('name', '')
        w_bilingual = get_bilingual_text(wname)

        # Translate inputs
        inputs_bilingual = []
        for inp in witem.get('inputs', []):
            inp_name = inp.get('item', '')
            inp_bilingual = get_bilingual_text(inp_name)
            inputs_bilingual.append({
                'item': inp_bilingual,
                'quantity': inp.get('quantity', 0),
                'unit': inp.get('unit', ''),
            })

        # Translate rewards
        rewards_bilingual = []
        for r in witem.get('rewards', []):
            r_name = r.get('item', '')
            r_bilingual = get_bilingual_text(r_name)
            rewards_bilingual.append({
                'item': r_bilingual,
                'quantity': r.get('quantity', 1),
            })

        entry = {
            'name': w_bilingual,
            'category': witem.get('category', cat),
            '_category_key': cat,
            'reputation_min': witem.get('reputation_min', None),
            'inputs': inputs_bilingual,
            'rewards': rewards_bilingual,
        }
        if witem.get('type'):
            entry['type'] = witem['type']

        wikelo_bilingual.append(entry)

print(f"  ✅ {len(wikelo_bilingual)} items Wikelo (categorizados)")
for cat in WIKELO_CATEGORIES:
    count = sum(1 for w in wikelo_bilingual if w['_category_key'] == cat)
    print(f"     {cat}: {count}")


# =====================================================================
# 12. BUILD COMBINED TRANSLATIONS DICTIONARY
# =====================================================================
print()
print("📖 Construyendo diccionario de traducciones combinado...")

# Merge: translations_full.json + contractor_translations into one big dict
# Each entry: {'en': key_or_text, 'es': spanish_text}
# For translations_full: key is the EN key, value is the ES text
# For contractor_translations: key is the translation key, value is the ES text

combined_translations = {}

# From translations_full.json: key → ES
# We don't have exact EN text, just the key. Use key as both identifier and EN text.
en_keys_seen = set()
for en_key, es_text in translations_raw.items():
    if es_text and isinstance(es_text, str) and isinstance(en_key, str):
        # Clean up HTML entities
        clean_es = es_text.replace('&#x27;', "'").replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        combined_translations[en_key] = {
            'en': en_key,
            'es': clean_es,
        }
        en_keys_seen.add(en_key)

# From contractor_translations.json
contractor_entry_count = 0
for c_name, c_data in contractors.items():
    for field in ['titles', 'descriptions', 'names', 'other']:
        for entry in c_data.get(field, []):
            key = entry.get('key', '')
            val = entry.get('value', '')
            if key and key not in combined_translations and val:
                clean_val = val.replace('&#x27;', "'").replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
                combined_translations[key] = {
                    'en': key,
                    'es': clean_val,
                }
                contractor_entry_count += 1

print(f"  ✅ {len(combined_translations)} entradas totales ({len(translations_raw)} de global.ini + {contractor_entry_count} de contractors)")
print(f"  ℹ️  Las contractor_translations ya están incluidas en translations — no hay duplicado exterior")


# =====================================================================
# 13. BUILD FINAL DATABASE (bilingual — same for ES and EN variants)
# =====================================================================
now_iso = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.') + datetime.now(timezone.utc).strftime('%f')[:3] + 'Z'

database = {
    "name": "Star Citizen Database",
    "version": "4.9.0-live",
    "_meta": {
        "schema_version": SCHEMA_VERSION,
        "built_at": now_iso,
        "bilingual": True,
        "total_counts": {
            "missions": len(missions_bilingual),
            "blueprints": len(blueprints_bilingual),
            "weapons": len(weapons_bilingual),
            "components": len(components_bilingual),
            "minerals": len(minerals_bilingual),
            "items": len(items_bilingual),
            "wikelo": len(wikelo_bilingual),
            "factions": len(factions_merged),
            "translations": len(combined_translations),
        }
    },
    "missions": missions_bilingual,
    "blueprints": blueprints_bilingual,
    "weapons": weapons_bilingual,
    "components": components_bilingual,
    "minerals": minerals_bilingual,
    "items": items_bilingual,
    "wikelo": wikelo_bilingual,
    "wikelo_meta": wikelo_meta,
    "factions": factions_merged,
    "translations": combined_translations,
    # NO contractor_translations top-level key — already merged into translations
}


# =====================================================================
# 14. SAVE — both EN and ES variants (identical bilingual content)
# =====================================================================
print()
print("💾 Guardando...")

os.makedirs(DATA, exist_ok=True)

es_path = os.path.join(DATA, 'sc_database_v3_es.json')
en_path = os.path.join(DATA, 'sc_database_v3_en.json')

# Write both files (same bilingual content)
with open(es_path, 'w', encoding='utf-8') as f:
    json.dump(database, f, ensure_ascii=False, indent=None, separators=(',', ':'))
print(f"  ✅ {es_path}")

with open(en_path, 'w', encoding='utf-8') as f:
    json.dump(database, f, ensure_ascii=False, indent=None, separators=(',', ':'))
print(f"  ✅ {en_path}")


# =====================================================================
# 15. FINAL STATISTICS
# =====================================================================
print()
print("=" * 60)
print("  📊 ESTADÍSTICAS FINALES")
print("=" * 60)
meta = database['_meta']
counts = meta['total_counts']
for key, val in counts.items():
    print(f"  {key}: {val}")
print(f"  translations: {counts['translations']} (89k global.ini + contractor keys)")
print()
es_size = os.path.getsize(es_path)
en_size = os.path.getsize(en_path)
print(f"  Tamaño ES: {es_size / 1024 / 1024:.1f} MB")
print(f"  Tamaño EN: {en_size / 1024 / 1024:.1f} MB")
print(f"  Schema version: {meta['schema_version']}")
print(f"  Built at: {meta['built_at']}")
print()
print("✅ Base de datos v3.0.0 construida exitosamente.")
