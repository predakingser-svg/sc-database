#!/usr/bin/env python3
"""
Star Citizen Database — API Flask
Sirve todos los datos scrapeados vía endpoints REST
"""
import gzip
import json
import os
import sys
import time
from functools import lru_cache
from io import BytesIO
from flask import Flask, jsonify, request, after_this_request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


# ─── Gzip compression via after_request ───
@app.after_request
def gzip_response(response):
    """Comprime respuestas JSON mayores a 1KB con gzip si el cliente lo acepta."""
    accept_encoding = request.headers.get('Accept-Encoding', '')
    if 'gzip' not in accept_encoding:
        return response
    if response.status_code >= 300:
        return response
    if response.content_length and response.content_length < 1024:
        return response
    if not response.content_type or 'application/json' not in response.content_type:
        return response

    original = response.get_data()
    if len(original) < 1024:
        return response

    buf = BytesIO()
    with gzip.GzipFile(mode='wb', fileobj=buf) as gz:
        gz.write(original)
    compressed = buf.getvalue()

    if len(compressed) < len(original):
        response.set_data(compressed)
        response.headers['Content-Encoding'] = 'gzip'
        response.headers['Content-Length'] = str(len(compressed))
        response.headers.pop('Content-Type', None)

    return response

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'scrapers', 'sc_data')

# ─── Funciones helper ───

def _strip_nulls(obj):
    """Elimina recursivamente campos None/null y strings vacíos de dicts y listas."""
    if isinstance(obj, dict):
        return {k: _strip_nulls(v) for k, v in obj.items() if v is not None and v != '' and not (isinstance(v, list) and len(v) == 0)}
    if isinstance(obj, list):
        return [_strip_nulls(i) for i in obj]
    return obj


def _is_ship_weapon(component):
    """True si el ítem es un arma de nave (debe excluirse de /components)."""
    type_val = (component.get('type') or '').lower().replace(' ', '')
    cat_val = (component.get('category') or '').lower().replace(' ', '')
    name_val = (component.get('name') or '').lower()
    combined = f"{type_val}|{cat_val}|{name_val}"
    weapon_kw = ['weapon', 'missile', 'torpedo', 'repeater', 'cannon', 'machinegun',
                 'gatling', 'massdriver', 'suckerpunch', 'bomb', 'launcher', 'rocket']
    for kw in weapon_kw:
        if kw in combined:
            return True
    return False


# ─── Cargar datos en memoria ───
def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        print(f"⚠️  No encontrado: {path}", file=sys.stderr)
        return None
    with open(path, 'r') as f:
        return json.load(f)

print("📡 Cargando datos...", file=sys.stderr)

# Missions
missions_raw = load_json('missions_all.json')
missions_list = missions_raw.get('missions', []) if missions_raw else []
print(f"  ✅ {len(missions_list)} misiones", file=sys.stderr)

# Blueprints
blueprints_raw = load_json('blueprints_all.json')
blueprints_list = blueprints_raw.get('blueprints', []) if blueprints_raw else []
print(f"  ✅ {len(blueprints_list)} blueprints", file=sys.stderr)

# Weapons
weapons_raw = load_json('ship_weapons.json')
weapons_dict = weapons_raw if weapons_raw else {}
weapons_list = list(weapons_dict.values())
print(f"  ✅ {len(weapons_list)} armas de nave", file=sys.stderr)

# Wikelo
wikelo = load_json('wikelo_catalog.json')
print(f"  ✅ Wikelo catalog loaded", file=sys.stderr)

# All items — filtered: weapon items go to weapons, not generic items
items_raw = load_json('_all_items.json')
items_list_raw = items_raw if isinstance(items_raw, list) else []

# Try loading items from built frontend/data/items.json (has item_type field)
import re
items_list = []
weapon_items_count = 0

frontend_items_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'data', 'items.json')
if os.path.exists(frontend_items_path):
    with open(frontend_items_path) as f:
        items_list = json.load(f)
    print(f"  ✅ {len(items_list)} items con item_type cargados de frontend/data/items.json", file=sys.stderr)
else:
    # Fallback: load from _all_items.json and classify on the fly
    NON_WEAPON_EXCEPTIONS = [
        r'(?i)bomber\s*jacket', r'(?i)bombora\s*livery', r'(?i)torpedo\s*burrito',
        r'(?i)laser\s*pointer', r'(?i)laser\s*activation', r'(?i)mining\s*laser',
    ]
    for item in items_list_raw:
        name = item.get('name', '')
        is_wpn = False
        for exc in NON_WEAPON_EXCEPTIONS:
            if re.search(exc, name):
                is_wpn = False
                break
        else:
            if re.search(r'(?i)\b(cannon|repeater|gatling|mass\s*driver|suckerpunch)\b', name):
                is_wpn = True
            elif re.search(r'(?i)\b(missile|torpedo)\b', name):
                is_wpn = True
            elif re.search(r'(?i)\bbomb\b', name):
                is_wpn = True
            elif re.search(r'(?i)\b(missile|torpedo|bomb)\s*rack\b', name):
                is_wpn = True
            elif re.search(r'(?i)\b(rocket\s*launcher|launcher)\b', name):
                is_wpn = True
            elif re.search(r'(?i)\bturret\b', name):
                is_wpn = True
        if is_wpn:
            weapon_items_count += 1
        else:
            items_list.append(item)
    print(f"  ✅ {len(items_list)} items ({weapon_items_count} armas filtradas)", file=sys.stderr)

# Stats cache (conteos ligeros)
wikelo_count = 0
if wikelo:
    for cat in ['favor_trades', 'polaris_bit_recipes', 'weapon_contracts', 'armor_contracts', 'vehicle_contracts', 'ship_contracts']:
        wikelo_count += len(wikelo.get(cat, []))

# Components
comps_path = os.path.join(os.path.dirname(__file__), "data", "components.json")
components_list = []
WEAPON_TYPES = {
    'missile', 'torpedo', 'weapon', 'weapons', 'missiles', 'torpedoes',
    'repeater', 'repeaters', 'cannon', 'cannons',
    'machinegun', 'machineguns', 'gatling', 'gatlings',
    'massdriver', 'massdrivers', 'bomb', 'bombs',
    'launcher', 'launchers', 'rocket', 'rockets',
}
if os.path.exists(comps_path):
    with open(comps_path) as f:
        components_list = json.load(f).get("data", [])
    components_list = [c for c in components_list if c.get('type', '').lower().replace(' ','') not in WEAPON_TYPES]
    print(f"  ✅ {len(components_list)} componentes (weapons/missiles/torpedos/repeaters/cannons/machineguns filtrados)", file=sys.stderr)
else:
    print(f"  ⚠️  components.json no encontrado", file=sys.stderr)

# Minerals
minerals_path = os.path.join(os.path.dirname(__file__), "data", "minerals.json")
minerals_list = []
if os.path.exists(minerals_path):
    with open(minerals_path) as f:
        minerals_data = json.load(f)
        minerals_list = minerals_data.get("data", [])
    print(f"  ✅ {len(minerals_list)} minerales", file=sys.stderr)
else:
    print(f"  ⚠️  minerals.json no encontrado", file=sys.stderr)

# ─── Stats ligeros (conteos) ───
# Count factions desde database files
factions_count = 0
for db_fname in ['sc_database_en.json', 'sc_database_v3_en.json']:
    db_path = os.path.join(os.path.dirname(__file__), 'data', db_fname)
    if os.path.exists(db_path):
        with open(db_path) as f:
            db_data = json.load(f)
        f_data = db_data.get('factions', {})
        if isinstance(f_data, list):
            factions_count = max(factions_count, len(f_data))
        elif isinstance(f_data, dict):
            factions_count = max(factions_count, len(f_data))
# Count unique systems desde misiones
unique_systems = set()
for m in missions_list:
    for sys_info in m.get('star_systems', []):
        sname = sys_info.get('name', 'Unknown') if isinstance(sys_info, dict) else str(sys_info)
        unique_systems.add(sname)
systems_count = len(unique_systems)

STATS = {
    'missions': len(missions_list),
    'blueprints': len(blueprints_list),
    'items': len(items_list),
    'weapons': len(weapons_list),
    'components': len(components_list),
    'wikelo': wikelo_count,
    'factions': factions_count,
    'systems': systems_count,
}
print(f"  ✅ Stats ligeros: {len(STATS)} campos", file=sys.stderr)

# Translations (global.ini)
translations_path = os.path.join(os.path.dirname(__file__), "data", "translations_full.json")
translations_dict = {}
if os.path.exists(translations_path):
    with open(translations_path) as f:
        translations_dict = json.load(f)
    print(f"  ✅ {len(translations_dict)} traducciones cargadas del global.ini", file=sys.stderr)
else:
    print(f"  ⚠️  translations_full.json no encontrado en {translations_path}", file=sys.stderr)

# ─── Función de traducción ───
def translate(key, default=None):
    """Busca key en las traducciones, devuelve default si no existe."""
    if key in translations_dict:
        return translations_dict[key]
    kl = key.lower()
    for k, v in translations_dict.items():
        if k.lower() == kl:
            return v
    return default

# ─── Cargar contractor translations ───
ct_path = os.path.join(os.path.dirname(__file__), "data", "contractor_translations.json")
contractor_translations = {}
if os.path.exists(ct_path):
    with open(ct_path) as f:
        contractor_translations = json.load(f)
    print(f"  ✅ {len(contractor_translations)} contractors con traducciones", file=sys.stderr)
else:
    print(f"  ⚠️  contractor_translations.json no encontrado", file=sys.stderr)

# ─── Pre-calcular stats (carga rápida) ───
def _compute_stats():
    scopes = {}
    for m in missions_list:
        s = m.get('reward_scope', 'Unknown')
        scopes[s] = scopes.get(s, 0) + 1

    systems = {}
    for m in missions_list:
        for sys_info in m.get('star_systems', []):
            sname = sys_info.get('name', 'Unknown') if isinstance(sys_info, dict) else str(sys_info)
            systems[sname] = systems.get(sname, 0) + 1

    bp_missions = sum(1 for m in missions_list if m.get('has_blueprints'))

    return {
        'total_missions': len(missions_list),
        'total_blueprints': len(blueprints_list),
        'total_weapons': len(weapons_list),
        'total_components': len(components_list),
        'total_minerals': len(minerals_list),
        'total_items': len(items_list),
        'missions_by_category': scopes,
        'missions_by_system': systems,
        'missions_with_blueprints': bp_missions,
        'data_version': missions_raw.get('date', 'unknown') if missions_raw else 'unknown'
    }

STATS_CACHE = _compute_stats()
print(f"  ✅ Stats pre-calculados ({len(STATS_CACHE['missions_by_category'])} categorías, {len(STATS_CACHE['missions_by_system'])} sistemas)", file=sys.stderr)

# ─── Caché simple en memoria ───
_cache = {}
_cache_time = {}

def cached_response(key, data_func, ttl=300):
    now = time.time()
    if key in _cache and now - _cache_time.get(key, 0) < ttl:
        return _cache[key]
    result = data_func()
    _cache[key] = result
    _cache_time[key] = now
    return result

print("🚀 API lista", file=sys.stderr)


# ═══════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════

@app.route('/api')
def api_docs():
    return jsonify({
        'name': 'Star Citizen Database API',
        'version': '2.0',
        'endpoints': {
            'GET /stats': 'Estadísticas ligeras: conteos (~1KB)',
            'GET /stats/detailed': 'Estadísticas detalladas con desgloses',
            'GET /missions': 'Lista de misiones (?faction=X&system=Y&has_blueprints=true&lang=es&search=Z)',
            'GET /missions/<uuid>': 'Detalle de una misión (?lang=es)',
            'GET /blueprints': 'Lista de blueprints (?output=X&min_ingredients=N&search=Z)',
            'GET /blueprints/<uuid>': 'Detalle de un blueprint',
            'GET /weapons': 'Armas de nave (?size=N&type=X&min_dps=N)',
            'GET /weapons/<id>': 'Detalle de un arma',
            'GET /wikelo': 'Contratos Wikelo',
            'GET /items': 'Catálogo de items (?search=Z&sold=true&type=armor_helmet)',
            'GET /components': 'Componentes de nave (sin armas; ?type=&size=&search=)',
            'GET /minerals': 'Minerales (?rarity=&location=&search=)',
            'GET /translate?q=clave': 'Traducir clave del global.ini al español',
            'GET /translations': 'Todas las traducciones del global.ini',
            'GET /translate/missions?contractor=X': 'Traducciones por contratista',
            'GET /database?lang=es&fields=missions,blueprints': 'Base de datos (?fields= para subsets, ?fields=stats para conteos)',
            'GET /changelog': 'Historial de versiones',
            'GET /search?q=termino': 'Búsqueda global'
        }
    })


# ─── TRADUCCIONES ───

@app.route('/translate')
def get_translate():
    key = request.args.get('q', '')
    if not key:
        return jsonify({'error': 'Falta parámetro ?q=clave'}), 400
    result = translate(key)
    if result:
        return jsonify({'key': key, 'translation': result})
    return jsonify({'key': key, 'translation': None, 'error': 'No encontrado'}), 404

@app.route('/translations')
def get_all_translations():
    lang = request.args.get('lang', 'es')
    def _gen():
        if lang == 'en':
            return {'total': 0, 'note': 'English is source language', 'data': {}}
        return {
            'total': len(translations_dict),
            'source': 'global.ini (Star Citizen Spanish localization)',
            'data': translations_dict
        }
    return jsonify(cached_response(f'translations_{lang}', _gen))

@app.route('/translate/missions')
def translate_missions():
    """Devuelve traducciones de misiones agrupadas por contractor."""
    contractor = request.args.get('contractor', '').lower()
    if contractor and contractor in contractor_translations:
        return jsonify(contractor_translations[contractor])
    return jsonify(contractor_translations)

@app.route('/changelog')
def get_changelog():
    def _gen():
        cl_path = os.path.join(os.path.dirname(__file__), "data", "changelog.json")
        if os.path.exists(cl_path):
            with open(cl_path) as f:
                return json.load(f)
        return {'error': 'No changelog'}
    result = cached_response('changelog', _gen)
    if 'error' in result:
        return jsonify(result), 404
    return jsonify(result)

@app.route('/database')
def get_database():
    lang = request.args.get('lang', 'en')
    fields_param = request.args.get('fields', '').strip()

    def _gen():
        nonlocal fields_param
        if lang == 'es':
            db_path = os.path.join(os.path.dirname(__file__), 'data', 'sc_database_es.json')
        else:
            db_path = os.path.join(os.path.dirname(__file__), 'data', 'sc_database_en.json')

        if not os.path.exists(db_path):
            return {'error': 'Database not found', 'lang': lang}

        db = json.load(open(db_path))

        # ?fields=stats -> equivalente a /stats
        if fields_param == 'stats':
            return STATS

        # ?fields=missions,blueprints -> solo esos subsets
        if fields_param:
            requested = [f.strip() for f in fields_param.split(',') if f.strip()]
            result = {}
            for key in requested:
                if key in db:
                    val = db[key]
                    # Filtrar armas del array components
                    if key == 'components' and isinstance(val, list):
                        val = [c for c in val if not _is_ship_weapon(c)]
                    result[key] = val
                elif key in STATS:
                    result[key] = STATS[key]
            return result

        # Comportamiento normal: limpiar y filtrar armas de components
        # Remover metadata innecesaria y campos nulos
        for meta_key in ['_meta', 'built', 'version', 'language', 'name']:
            db.pop(meta_key, None)

        # Filtrar armas del array components
        if 'components' in db and isinstance(db['components'], list):
            db['components'] = [c for c in db['components'] if not _is_ship_weapon(c)]

        # Eliminar campos nulos del payload
        db = _strip_nulls(db)

        return db

    return jsonify(cached_response(f'database_{lang}_{fields_param or "full"}', _gen))

@app.route('/stats')
def stats():
    """Endpoint ligero: solo conteos (~1KB)."""
    def _gen():
        return STATS
    return jsonify(cached_response('stats', _gen))


@app.route('/stats/detailed')
def stats_detailed():
    """Endpoint pesado: estadísticas detalladas con desgloses."""
    def _gen():
        return STATS_CACHE
    return jsonify(cached_response('stats_detailed', _gen))


# ─── MISIONES ───

@app.route('/missions')
def get_missions():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 30, type=int)
    per_page = min(per_page, 100)

    # Filtros
    faction = request.args.get('faction')
    system = request.args.get('system')
    has_bp = request.args.get('has_blueprints')
    scope = request.args.get('scope')
    search = request.args.get('search', '').lower()
    illegal = request.args.get('illegal')

    filtered = missions_list

    if faction:
        filtered = [m for m in filtered if (lambda f: f.get('name', '') if isinstance(f, dict) else str(f or ''))(m.get('faction')) == faction.lower()]
    if system:
        filtered = [m for m in filtered if any(
            s.get('name', '').lower() == system.lower() if isinstance(s, dict) else str(s).lower() == system.lower()
            for s in m.get('star_systems', [])
        )]
    if has_bp == 'true':
        filtered = [m for m in filtered if m.get('has_blueprints')]
    if scope:
        filtered = [m for m in filtered if m.get('reward_scope', '').lower() == scope.lower()]
    if search:
        filtered = [m for m in filtered if search in m.get('title', '').lower() or search in m.get('description', '').lower()]
    if illegal == 'true':
        filtered = [m for m in filtered if m.get('illegal')]
    elif illegal == 'false':
        filtered = [m for m in filtered if not m.get('illegal')]

    total = len(filtered)
    start = (page - 1) * per_page
    end = start + per_page
    page_items = filtered[start:end]

    return jsonify({
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page,
        'data': page_items
    })


@app.route('/missions/<uuid>')
def get_mission(uuid):
    for m in missions_list:
        if m.get('uuid') == uuid:
            return jsonify(m)
    return jsonify({'error': 'Mission not found'}), 404


# ─── BLUEPRINTS ───

@app.route('/blueprints')
def get_blueprints():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 30, type=int)
    per_page = min(per_page, 100)

    search = request.args.get('search', '').lower()
    min_ing = request.args.get('min_ingredients', type=int)
    output = request.args.get('output', '').lower()

    filtered = blueprints_list

    if search:
        filtered = [b for b in filtered if search in safe_lower(b.get('output_name'))]
    if min_ing:
        filtered = [b for b in filtered if b.get('ingredient_count', 0) >= min_ing]
    if output:
        filtered = [b for b in filtered if output in safe_lower(b.get('output_name'))]

    total = len(filtered)
    start = (page - 1) * per_page
    end = start + per_page
    page_items = filtered[start:end]

    return jsonify({
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page,
        'data': page_items
    })


@app.route('/blueprints/<uuid>')
def get_blueprint(uuid):
    for b in blueprints_list:
        if b.get('uuid') == uuid:
            return jsonify(b)
    return jsonify({'error': 'Blueprint not found'}), 404


# ─── ARMAS DE NAVE ───

@app.route('/weapons')
def get_weapons():
    size = request.args.get('size', type=int)
    wp_type = request.args.get('type', '').lower()
    min_dps = request.args.get('min_dps', type=float)
    search = request.args.get('search', '').lower()

    filtered = weapons_list

    if size:
        filtered = [w for w in filtered if w.get('stats', {}).get('SIZE') == str(size)]
    if wp_type:
        filtered = [w for w in filtered if wp_type in w.get('stats', {}).get('TYPE', '').lower()]
    if min_dps:
        filtered = [w for w in filtered]
        # Filter by DPS
        result = []
        for w in filtered:
            dps_str = w.get('stats', {}).get('BASE DPS', '0')
            try:
                dps = float(dps_str.split()[0])
                if dps >= min_dps:
                    result.append(w)
            except:
                result.append(w)
        filtered = result
    if search:
        filtered = [w for w in filtered if search in w.get('name', '').lower()]

    return jsonify({
        'total': len(filtered),
        'data': filtered
    })


@app.route('/weapons/<item_id>')
def get_weapon(item_id):
    for w in weapons_list:
        if w.get('id') == item_id:
            return jsonify(w)
    return jsonify({'error': 'Weapon not found'}), 404


# ─── WIKELO ───

@app.route('/wikelo')
def get_wikelo():
    category = request.args.get('category')
    search = request.args.get('search', '').lower()

    if not wikelo:
        return jsonify({'error': 'Wikelo data not loaded'}), 500

    result = {}
    for cat in ['favor_trades', 'polaris_bit_recipes', 'weapon_contracts', 'armor_contracts', 'vehicle_contracts', 'ship_contracts']:
        items = wikelo.get(cat, [])
        if search:
            items = [i for i in items if search in i.get('name', '').lower() or search in str(i.get('rewards', [])).lower()]
        result[cat] = items

    if category:
        if category in result:
            return jsonify({category: result[category]})
        return jsonify({'error': f'Category {category} not found'}), 404

    return jsonify(result)


# ─── ITEMS ───

@app.route('/items')
def get_items():
    search = request.args.get('search', '').lower()
    sold = request.args.get('sold')
    item_type = request.args.get('type', '').lower()

    filtered = items_list
    if search:
        filtered = [i for i in filtered if search in i.get('name', '').lower()]
    if sold == 'true':
        filtered = [i for i in filtered if i.get('Sold')]
    elif sold == 'false':
        filtered = [i for i in filtered if not i.get('Sold')]
    if item_type:
        filtered = [i for i in filtered if i.get('item_type', '').lower() == item_type]

    return jsonify({
        'total': len(filtered),
        'data': filtered[:200]  # Limit to 200 for performance
    })


# ─── COMPONENTES ───

@app.route('/components')
def get_components():
    ctype = request.args.get('type', '').lower()
    size = request.args.get('size', '').lower()
    search = request.args.get('search', '').lower()
    filtered = components_list
    # Filtro adicional de seguridad: excluir cualquier arma de nave
    filtered = [c for c in filtered if not _is_ship_weapon(c)]
    if ctype:
        filtered = [c for c in filtered if c.get('type', '').lower() == ctype]
    if size:
        filtered = [c for c in filtered if c.get('size', '') == size]
    if search:
        filtered = [c for c in filtered if search in c.get('name', '').lower()]
    return jsonify({'total': len(filtered), 'data': filtered})


# ─── MINERALES ───

@app.route('/minerals')
def get_minerals():
    rarity = request.args.get('rarity', '').lower()
    location = request.args.get('location', '').lower()
    min_val = request.args.get('min_value', type=float)
    max_val = request.args.get('max_value', type=float)
    search = request.args.get('search', '').lower()
    filtered = minerals_list
    if rarity:
        filtered = [m for m in filtered if m.get('rarity', '').lower() == rarity]
    if location:
        filtered = [m for m in filtered if any(location in loc.lower() for loc in m.get('locations', []))]
    if min_val is not None:
        filtered = [m for m in filtered if m.get('value_per_scu', 0) >= min_val]
    if max_val is not None:
        filtered = [m for m in filtered if m.get('value_per_scu', 0) <= max_val]
    if search:
        filtered = [m for m in filtered if search in m.get('name', '').lower()]
    return jsonify({'total': len(filtered), 'data': filtered})

@app.route('/minerals/<name>')
def get_mineral(name):
    for m in minerals_list:
        if m.get('name', '').lower() == name.lower():
            return jsonify(m)
    return jsonify({'error': 'Mineral not found'}), 404


def safe_lower(val):
    if val is None:
        return ''
    if isinstance(val, str):
        return val.lower()
    return str(val).lower()


# ─── BÚSQUEDA GLOBAL ───

@app.route('/search')
def global_search():
    q = request.args.get('q', '').lower()
    if len(q) < 2:
        return jsonify({'error': 'Query too short. Minimum 2 characters.'}), 400

    def _gen():
        results = {
            'missions': [],
            'blueprints': [],
            'weapons': [],
            'items': []
        }

        # Search missions
        for m in missions_list:
            if q in safe_lower(m.get('title')) or q in safe_lower(m.get('description')):
                results['missions'].append({
                    'uuid': m['uuid'],
                    'title': m['title'],
                    'faction': (lambda f: f.get('name', 'Unknown') if isinstance(f, dict) else str(f or 'Unknown'))(m.get('faction')),
                    'reward': m.get('reward_min'),
                    'has_blueprints': m.get('has_blueprints')
                })
                if len(results['missions']) >= 10:
                    break

        # Search blueprints
        for b in blueprints_list:
            if q in safe_lower(b.get('output_name')):
                results['blueprints'].append({
                    'uuid': b['uuid'],
                    'output': b['output_name'],
                    'ingredients': b.get('ingredient_count'),
                    'time': b.get('craft_time_label')
                })
                if len(results['blueprints']) >= 10:
                    break

        # Search weapons
        for w in weapons_list:
            if q in w.get('name', '').lower():
                results['weapons'].append({
                    'id': w['id'],
                    'name': w['name'],
                    'type': w.get('stats', {}).get('TYPE'),
                    'size': w.get('stats', {}).get('SIZE')
                })
                if len(results['weapons']) >= 10:
                    break

        # Search items
        for i in items_list:
            if q in i.get('name', '').lower():
                results['items'].append({
                    'id': i['id'],
                    'name': i['name']
                })
                if len(results['items']) >= 10:
                    break

        return results

    return jsonify(cached_response(f'search_{q}', _gen))


# ─── MAIN ───

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    print(f"\n🔥 API corriendo en http://0.0.0.0:{port}", file=sys.stderr)
    app.run(host='0.0.0.0', port=port, debug=debug)
