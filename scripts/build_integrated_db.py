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


def merge_short_name_components(components):
    """
    Merge size/grade from full-name entries (e.g. 'QuikCool Cooler')
    into their short-name counterparts (e.g. 'QuikCool').
    Prevents incomplete duplicates in the build output.
    Mutates the list in-place.
    """
    type_suffixes = [
        'shield generator', 'power plant', 'quantum drive',
        ' shield', ' cooler', ' radar',
    ]
    lookup = {}
    for c in components:
        name = c.get('name', '')
        ctype = c.get('type', '')
        size = c.get('size', '?')
        grade = c.get('grade', '?')
        if size == '?' or grade == '?':
            continue
        name_lower = name.lower()
        for suffix in type_suffixes:
            if name_lower.endswith(suffix):
                short = name[:-len(suffix)].strip()
                key = (short.lower(), ctype)
                if key not in lookup:
                    lookup[key] = (size, grade)
                break
    fixed = 0
    for c in components:
        if c.get('size') != '?' and c.get('grade') != '?':
            continue
        key = (c.get('name', '').lower(), c.get('type', ''))
        if key in lookup:
            c['size'] = lookup[key][0]
            c['grade'] = lookup[key][1]
            fixed += 1
    if fixed:
        print(f"  🔄 {fixed} short-name components merged (size/grade filled from full-name entries)")
    return components


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
components = merge_short_name_components(components)
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
items_list_all = items_raw if isinstance(items_raw, list) else (list(items_raw.values()) if isinstance(items_raw, dict) else [])
print(f"  ✅ {len(items_list_all)} items de tienda (raw)")

# ─── Categorización de items ───
# Cada item recibe un campo 'category' explícito:
#   'ship_component' → power plant, shield, cooler, quantum drive, radar
#   'ship_weapon'    → cañones, repetidores, gatlings, misiles, torpedos, bombas
#   'fps_weapon'     → pistolas, rifles, shotguns, SMGs, etc.
#   'item'           → items genéricos de tienda

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
    # By name suffix (most reliable: 'Pistol', 'Rifle', 'Shotgun', etc.)
    fps_suffix_re = re.compile(
        r'(?i)\b(Pistol|Sniper\s*Rifle|Shotgun|SMG|LMG|Launcher|'
        r'Combat\s*Knife|Submachine\s*Gun|Assault\s*Rifle|'
        r'Machine\s*Gun|Rifle)\s*$'
    )
    if fps_suffix_re.search(name) and not re.search(r'(?i)\b(mining|salvage)\b', name):
        return {'category': 'fps_weapon', 'is_ship_weapon': False, 'weapon_subtype': 'fps_weapon'}

    # By known FPS weapon base names (covers variants + magazines + batteries)
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
            # Skip ship paints/skins/liveries that contain these as model names
            if re.search(r'(?i)\b(paint|livery|skin|schematic|plushie|poster|trophy|model|decal)\b', name):
                continue
            return {'category': 'fps_weapon', 'is_ship_weapon': False, 'weapon_subtype': 'fps_weapon'}

    return result


def classify_item_type(name):
    """
    Clasifica un item por nombre en tipo detallado.
    Returns: string con el tipo (armor_helmet, armor_core, ... other)
    """
    n = name.lower()

    # Skip internal/placeholder names
    if n.startswith('item_name') or n.startswith('items_') or n.startswith('ph - ') or n.startswith('placeholder'):
        return 'other'

    # Weapon-like patterns that are NOT weapons
    weapon_exception = any(exc in n for exc in ['bomber jacket', 'bombora', 'torpedo burrito',
                                                 'bombardier', 'laser pointer', 'laser activation',
                                                 'mining laser', 'mining repeater', 'salvage head',
                                                 'plushie', 'schematic', 'poster', 'paint'])

    # ─── LIVERY (check first) ───
    if 'livery' in n:
        return 'livery'
    if n.split()[-1] == 'paint':
        return 'livery'

    # ─── PLUSHIE ───
    if 'plushie' in n or n.endswith(' plush'):
        return 'plushie'

    # ─── SHIP WEAPONS ───
    if not weapon_exception:
        if re.search(r'\b(cannon|repeater|gatling|mass\s*driver|suckerpunch)\b', n):
            return 'ship_weapon'
        if re.search(r'\bmissile\b', n) and 'burrito' not in n and 't-shirt' not in n:
            return 'ship_weapon'
        if re.search(r'\btorpedo\b', n) and 'burrito' not in n and 't-shirt' not in n and 'shirt' not in n:
            return 'ship_weapon'
        if re.search(r'\bbomb\b', n) and not any(x in n for x in ['bomber', 'bombardier', 'bombora']):
            return 'ship_weapon'
        if re.search(r'\bturret\b', n):
            return 'ship_weapon'
        if 'rocket launcher' in n:
            return 'ship_weapon'

    # ─── FPS WEAPONS ───
    if n.endswith('pistol') and 'battery' not in n:
        return 'fps_weapon'
    if (n.endswith('rifle') or n.endswith('shotgun') or n.endswith('smg') or n.endswith('lmg') or n.endswith('hmg')) and 'battery' not in n:
        return 'fps_weapon'
    if 'sniper rifle' in n and 'battery' not in n:
        return 'fps_weapon'
    if (n.endswith('combat knife') or (n.endswith('knife') and 'display' not in n and 'spread' not in n)):
        return 'fps_weapon'
    if 'crossbow' in n:
        return 'fps_weapon'
    if 'broadsword' in n or 'machete' in n:
        return 'fps_weapon'
    if 'grenade' in n and 'livery' not in n:
        return 'fps_weapon'

    fps_names = ['arclight', 'coda', 'gallant', 'karna', 'demeco', 'custodian',
                 'arrowhead', 'deadrig', 'devastator', 'atzakav', 'salvation',
                 'yubarev', 'br-2', 'fs-9', 'p4-ar', 'p6-lr', 'p8-sc',
                 'pf-9', 'gp-33', 'ravager', 'animus', 'c54', 'rpl-20',
                 'tascan', 'tsunagi', 'zampec', 'zanaru', 'zweihander',
                 'sangar', 'f55', 'lh-86', 'gemini',
                 'enforcer', 'desperado', 'finnigan', 'zogo',
                 'kubeyev', 'killshot', 'ripper', 'scourge',
                 'cambrio', 'fresnel', 'parallax',
                 'prism', 'pulse', 'quartz',
                 'absorbance', 'vendetta', 'pulverizer',
                 'sawtooth', 'demon fang', 'myondo', 'myuda',
                 'njakte', 'pambada', 'sizi', 'tbf-4', 'fsk-8',
                 'eyaja', 'jaghte',
                 'tk-9', 'tk-9a', 'tk-9b',
                 'scattergun', 'absolution',
                 'ppb-116', 'psx pistol', 'tripledown',
                 'grey\'s basher', 'grey\'s shiv',
                 'cleaver', 'alignment blade',
                 'vck-1']
    for fp in fps_names:
        if fp in n and 'livery' not in n and 'paint' not in n:
            # Items with 'battery' or 'magazine' are ammo, not the weapon itself
            if 'battery' in n or 'magazine' in n:
                continue
            return 'fps_weapon'

    # ─── AMMO ───
    if 'ammo carrier' in n or n == 'ammunition crate':
        return 'ammo'
    if 'battery' in n and 'tractor' not in n and 'multi-tool' not in n and 'multitool' not in n:
        return 'ammo'
    if 'magazine' in n and 'tractor' not in n:
        return 'ammo'

    # ─── TOOLS ───
    if 'multi-tool' in n or 'multitool' in n or 'laser pointer' in n:
        return 'tool'
    if 'tractor beam' in n or 'tractor module' in n:
        return 'tool'
    if ('mining laser' in n or 'mining repeater' in n or 'salvage head' in n or 'orebit' in n):
        return 'tool'
    if 'cutter' in n and 'livery' not in n:
        return 'tool'
    if 'scanner' in n and 'helmet' not in n and 'livery' not in n:
        return 'tool'
    if 'pyro ryt' in n:
        return 'tool'
    if n.endswith(' flashlight') or n.endswith('flashlight') or n.endswith('floodlight') or n.endswith('head lamp'):
        return 'tool'

    med_tools = ['adrenapen', 'boostpen', 'corticopen', 'deconpen', 'oxypen',
                 'curare', 'hemozal', 'medpen', 'detoxpen', 'opiopen', 'vitalitypen',
                 'paramed', 'lifeguard', 'field medic', 'drema injector', 'pancea']
    if any(mt in n for mt in med_tools):
        return 'tool'
    if 'medical device' in n or 'medical attachment' in n:
        return 'tool'
    if n.endswith(' module') or n.endswith('attachment') or n.endswith('refill'):
        return 'tool'
    if n.endswith('scraper') and 'abrade' in n:
        return 'tool'
    if n.endswith('medgel canister'):
        return 'tool'

    # ─── SHIP COMPONENTS ───
    if 'power plant' in n or 'shield generator' in n:
        return 'ship_component'
    if 'quantum drive' in n:
        return 'ship_component'
    if re.search(r'\b(cooler|chiller)\b', n) and 'livery' not in n:
        return 'ship_component'
    if re.search(r'\b(radar|qed)\b', n) and 'livery' not in n and 'helmet' not in n:
        return 'ship_component'
    if 'secure shield' in n:
        return 'ship_component'
    if re.search(r'\b(vari\s*puck|gimbal\s*mount)\b', n):
        return 'ship_component'
    if n.endswith('powerplant'):
        return 'ship_component'
    if n.startswith(('js-', 'v60-', 'v801', 'v880', 'vk-00', 'xl-1', 'fr-', 'cr-6')):
        return 'ship_component'

    # ─── MISSION ITEMS ───
    if 'schematic' in n or 'keycard' in n:
        return 'mission_item'
    if 'chip' in n or 'datachip' in n:
        return 'mission_item'
    if 'access card' in n or 'access chip' in n:
        return 'mission_item'
    if 'decryption key' in n or 'encryption key' in n:
        return 'mission_item'
    if n.endswith('inverter code') or n.endswith('passcode disk'):
        return 'mission_item'
    if 'mainframe' in n and 'card' in n:
        return 'mission_item'
    if n.startswith('asd ') and any(x in n for x in ['card', 'drive', 'sample', 'blade', 'memory']):
        return 'mission_item'
    if n.endswith('data') and 'livery' not in n:
        return 'mission_item'

    # T-shirt check before food to avoid "Torpedo Burrito T-Shirt" being classified as food
    if n.endswith('t-shirt') or 't-shirt' in n:
        return 'clothing'

    # ─── FOOD / DRINK ───
    food_kw = ['ration', 'energy bar', 'nutrition bar', 'water bottle', 'sandwich',
               'snack', 'pizza', 'burrito', 'steak', 'cake', 'cookie', 'candy',
               'dumpling', 'soup', 'chocolate', 'ice cream', 'protein bar',
               'apple', 'banana', 'berry', 'milk', 'juice', 'soda',
               'coffee', 'beer', 'wine', 'whiskey', 'vodka', 'rum', 'liquor',
               'cola', 'tea bottle', 'smoothie', 'kacho', 'omni pack',
               'ready meal', 'wham', 'whamburger',
               'grill', 'skewer', 'noodle', 'katsu', 'curry', 'pad thai', 'lapsha',
               'snaggle', 'protein stick',
               'bo-go', 'boumbo', 'stew', 'chili', 'mushroom',
               'hot dog', 'bagel', 'casserole', 'omelette', 'pancake', 'waffle',
               'donut', 'pastry', 'cracker', 'fry', 'fries',
               'kung', ' duck', 'lo mein', 'kung pao']
    if any(fk in n for fk in food_kw) and 'livery' not in n:
        return 'food_drink'
    if n.endswith('ration') or n.endswith('smoothie'):
        return 'food_drink'
    if n.endswith('cola') or n.endswith('tea'):
        return 'food_drink'
    if n.startswith('cruz ') or n.startswith('fizzz '):
        return 'food_drink'
    if n.startswith('ma\'s ready'):
        return 'food_drink'

    # ─── MINERAL / ORE ───
    if re.search(r'\b(carinite|quantainium|hadanite|dolivine|aphorite|taranite|borase|bexalite|laranite|agricium|janalite|jaclite)\b', n):
        return 'mineral_ore'
    if n.endswith(' ore') or n.endswith('(ore)'):
        return 'mineral_ore'

    # ─── VEHICLE (ships, ground vehicles) ───
    vehicle_prefixes = [
        'tumbril ', 'c.o. ', 'argo ', 'rsi ', 'aegis ', 'anvil ',
        'drake ', 'misc ', 'origin ', 'crusader ', 'esperia ',
        'gatac ', 'kruger ', 'mirai ', 'consolidated outland ', 'banu ',
        'greycat ', 'aopoa ',
    ]
    for vp in vehicle_prefixes:
        if n.startswith(vp):
            return 'vehicle'

    # Ship models without manufacturer prefix
    vehicle_models = [
        'hoverquad', 'lynx', 'starlancer', 'starlite', 'perseus',
        'scorpius', 'hermes', 'meteor', 'apollo', 'zeus',
        'nomad', 'intrepid', 'golem', 'ironclad', 'pitbull',
        'clipper', 'moth', 'csv', 'atls', 'srv', 'raft',
        'rail', 'tyilui', 'c8 ',
        'mustang', 'spirit', 'ares', 'hercules', 'genesis',
        'blade', 'glaive', 'scythe', 'talon', 'prowler',
        'syulen', 'fury', 'pulse', 'razor',
        'defender', 'merchantman', 'ptv', 'roc', 'stinger', 'm80',
        '100i', '125a', '135c', '300i', '315p', '325a', '350r',
        '400i', '600i', '890 jump', '85x', 'm50', 'x1',
        'avenger', 'vanguard', 'hammerhead', 'eclipse', 'reclaimer',
        'sabre', 'gladius', 'redeemer', 'idris', 'javelin',
        'hornet', 'hurricane', 'valkyrie', 'carrack', 'crucible',
        'arrow', 'pisces', 'terrapin', 'hawk', 'gladiator',
        'ballista', 'centurion', 'spartan', 'paladin',
        'cutlass', 'caterpillar', 'herald', 'buccaneer', 'dragonfly',
        'vulture', 'corsair', 'kraken', 'mule',
        'freelancer', 'starfarer', 'prospector', 'reliant',
        'hull', 'endeavor', 'odyssey', 'fortune',
        'cyclone', 'storm', 'ranger', 'nova',
        'ursa', 'andromeda', 'aquila', 'phoenix', 'taurus',
        'retaliator', 'liberator', 'legionnaire',
        'g12', '65ce',
    ]
    for vm in vehicle_models:
        if n.startswith(vm) and (len(n) == len(vm) or n[len(vm)] in [' ', '\n', ')', '(']):
            if 'livery' not in n and 'paint' not in n:
                return 'vehicle'

    if n.endswith('model') and 'livery' not in n:
        return 'vehicle'

    # ─── ARMOR ───
    if re.search(r'\b(helmet|helm)\b', n) and 'livery' not in n:
        return 'armor_helmet'
    if re.search(r'\b(core)\b', n) and 'livery' not in n and 'paint' not in n:
        return 'armor_core'
    if re.search(r'\b(arms|arm)\b', n) and 'livery' not in n and 'paint' not in n \
       and 'chair' not in n and 'harm' not in n and 'charm' not in n and 'arm chair' not in n and 'armour' not in n:
        return 'armor_arms'
    if re.search(r'\b(legs|leg)\b', n) and 'livery' not in n and 'paint' not in n:
        return 'armor_legs'
    if ('backpack' in n or n.endswith(' pack') or 'bag' in n.split()) and 'livery' not in n:
        return 'armor_backpack'
    if 'undersuit' in n:
        return 'undersuit'

    # ─── CLOTHING ───
    clothing_kw = ['jacket', 'pants', 'shirt', 'coat', 'hoodie', 'sweater', 'tunic', 'robe',
                   'boots', 'gloves', 'hat', 'hood', 'bandana', 'veil', 'goggles',
                   'jumpsuit', 'trousers', 'dress', 'gown', 'beanie', 'apron',
                   'slippers', 'coverall', 'head cover', 'workpack', 'worksuit']
    for ck in clothing_kw:
        if ck in n and 'livery' not in n and 'paint' not in n:
            return 'clothing'
    if 'vest' in n and 'livery' not in n and 'paint' not in n and 'clipvest' not in n and 'harness' not in n:
        return 'clothing'
    if 'balaclava' in n:
        return 'clothing'
    if n.endswith('glasses') or n.endswith('monocle') or n.endswith('tophat'):
        return 'clothing'
    if n.endswith('t-shirt') or 't-shirt' in n:
        return 'clothing'
    # Cap as headwear: standalone word 'cap', not an ammo capacity suffix like "(10 cap)"
    if re.search(r'\bcap\b', n) and 'livery' not in n and 'capsule' not in n and 'caps' not in n and 'capstone' not in n:
        if not re.search(r'\(\s*\d+\s*cap\s*\)', n):
            return 'clothing'

    # ─── COLLECTIBLES / DECOR (other) ───
    if any(n.endswith(x) for x in ['poster', 'trophy', 'plaque', 'mug', 'tankard',
                                    'figure', 'decal', 'flair', 'flask',
                                    'statue', 'bobblehead', 'miniature',
                                    'replica', 'plant', 'planter', 'vase',
                                    'lamp', 'sign',
                                    'banner', 'clock', 'display',
                                    'stool', 'footlocker',
                                    'footstool', 'cabinet',
                                    'chest', 'container',
                                    'locker', 'safe']):
        return 'other'
    if 'action figure' in n or 'knife display' in n or 'hologram' in n or 'holographic' in n:
        return 'other'
    if n.endswith('chair') or n.endswith('couch') or n.endswith('bed') or n.endswith('table'):
        return 'other'

    return 'other'


# Separar items de tienda por categoría
items_list = []
weapon_items_from_store = []
fps_weapon_items_from_store = []

# Filtrar weapons_list y construir set de deduplicación
wpn_name_set = set()
filtered_weapons = []  # weapons_list filtrado: solo verdaderas armas de nave
for w in weapons_list:
    n = w.get('name', '')
    cls = classify_item(n)
    if cls['is_ship_weapon']:
        filtered_weapons.append(w)
        if n:
            wpn_name_set.add(n.lower().strip())
    else:
        pass  # descartar: liveries, plantas decorativas, etc. que el scraper capturó

weapons_list = filtered_weapons
print(f"  ✅ {len(weapons_list)} armas de nave (tras filtrar datos ruidosos del scraper)")

for item in items_list_all:
    name = item.get('name', '')
    cls = classify_item(name)
    entry = {
        'id': item.get('id', ''),
        'name': name,
        'Sold': item.get('Sold', 0),
        'item_type': classify_item_type(name),
        'category': cls['category'],
        '_weapon_type': cls['weapon_subtype'],
        '_source': 'shop_data'
    }
    if cls['is_ship_weapon']:
        weapon_items_from_store.append(entry)
    elif cls['category'] == 'fps_weapon':
        fps_weapon_items_from_store.append(entry)
    else:
        items_list.append(entry)

print(f"  ✅ {len(items_list)} items regulares")
print(f"  🔫 {len(weapon_items_from_store)} items armamentísticos de nave (misiles, torpedos, bombas, racks)")
print(f"  🎯 {len(fps_weapon_items_from_store)} items de armas FPS (pistolas, rifles, etc.)")


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

# Weapons (translate names + merge store weapon items)
wpns_es = []
for w in weapons_list:
    we = dict(w)
    name = w.get('name', '')
    es_name = translate_text(name)
    if es_name and es_name != name:
        we['name_es'] = es_name
    we['category'] = 'ship_weapon'
    wpns_es.append(we)

# Añadir items armamentísticos de la tienda (misiles, torpedos, etc.)
items_added_to_weapons = 0
for wi in weapon_items_from_store:
    n = wi.get('name', '')
    # Evitar duplicados con armas existentes
    if n.lower().strip() not in wpn_name_set:
        wpns_es.append({
            'id': wi.get('id', ''),
            'name': n,
            'Sold': wi.get('Sold', 0),
            'item_type': wi.get('item_type', 'ship_weapon'),
            'category': 'ship_weapon',
            'weapon_type': wi.get('_weapon_type', 'unknown'),
            '_source': 'shop_data'
        })
        items_added_to_weapons += 1

db_es['weapons'] = wpns_es
print(f"  ✅ {len(wpns_es)} armas traducidas (+{items_added_to_weapons} de tienda: misiles/torpedos/etc)")

# Components (already translated via __())
comps_with_cat = []
for c in components:
    ce = dict(c)
    ce['category'] = 'ship_component'
    comps_with_cat.append(ce)
db_es['components'] = comps_with_cat
db_es['minerals'] = minerals

# Items: merge FPS weapons into items list with explicit category
items_es = list(items_list)  # copy so we don't mutate the source
for fw in fps_weapon_items_from_store:
    items_es.append(fw)
db_es['items'] = items_es

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

# Weapons: merge existing + store weapon items (deduplicated)
wpns_en = []
for w in weapons_list:
    we = dict(w)
    we['category'] = 'ship_weapon'
    wpns_en.append(we)
wpns_en_set = set(w.get('name', '').lower().strip() for w in wpns_en if w.get('name'))
for wi in weapon_items_from_store:
    n = wi.get('name', '')
    if n.lower().strip() not in wpns_en_set:
        wpns_en.append({
            'id': wi.get('id', ''),
            'name': n,
            'Sold': wi.get('Sold', 0),
            'item_type': wi.get('item_type', 'ship_weapon'),
            'category': 'ship_weapon',
            'weapon_type': wi.get('_weapon_type', 'unknown'),
            '_source': 'shop_data'
        })

# Components with explicit category
comps_en = []
for c in components:
    ce = dict(c)
    ce['category'] = 'ship_component'
    comps_en.append(ce)

# Items: merge FPS weapons into items list with explicit category
items_en = list(items_list)  # copy — items_list is NOT mutated by ES section
for fw in fps_weapon_items_from_store:
    items_en.append(fw)

print(f"  ✅ {len(missions)} misiones (EN)")
print(f"  ✅ {len(blueprints)} blueprints (EN)")
print(f"  ✅ {len(wpns_en)} armas (EN, +{len(wpns_en) - len(weapons_list)} de tienda)")
print(f"  ✅ {len(comps_en)} componentes (EN)")
print(f"  ✅ {len(minerals)} minerales (EN)")
print(f"  ✅ {len(items_en)} items (EN, {len(fps_weapon_items_from_store)} FPS)")
print(f"  ✅ {len(wikelo_items)} wikelo (EN)")

db_en = {
    "name": "Star Citizen Database",
    "language": "en",
    "version": "4.9.0-live",
    "built": datetime.utcnow().isoformat() + "Z",
    "missions": missions,
    "blueprints": blueprints,
    "weapons": wpns_en,
    "components": comps_en,
    "minerals": minerals,
    "items": items_en,
    "wikelo": wikelo_items,
    "factions": load(os.path.join(DATA, 'faction_translations.json')),
    "contractor_translations": contractors,
}


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

# ─── Guardar frontend items.json (versión plana con item_type) ───
frontend_items_path = os.path.join(BASE, 'frontend', 'data', 'items.json')
os.makedirs(os.path.dirname(frontend_items_path), exist_ok=True)
# Extraer items planos de la DB en inglés (solo id, name, Sold, item_type)
frontend_items = []
for item in items_en:
    frontend_items.append({
        'id': item.get('id', ''),
        'name': item.get('name', ''),
        'Sold': item.get('Sold', 0),
        'item_type': item.get('item_type', 'other')
    })
with open(frontend_items_path, 'w') as f:
    json.dump(frontend_items, f, ensure_ascii=False)
print(f"\n✅ Guardado: {frontend_items_path} ({len(frontend_items)} items)")

# Stats
print(f"\n📊 Estadísticas finales:")
print(f"   ES: {os.path.getsize(es_path)/1024/1024:.1f} MB")
print(f"   EN: {os.path.getsize(en_path)/1024/1024:.1f} MB")
print(f"   Frontend: {os.path.getsize(frontend_items_path)/1024:.1f} KB")

# ─── Tipo de items breakdown ───
from collections import Counter
type_counts = Counter()
for item in frontend_items:
    type_counts[item['item_type']] += 1
print(f"\n📊 Desglose por item_type:")
for t, c in sorted(type_counts.items()):
    print(f"   {t}: {c}")
