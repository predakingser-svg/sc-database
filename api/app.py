#!/usr/bin/env python3
"""
Star Citizen Database — API Flask
Sirve todos los datos scrapeados vía endpoints REST
"""
import json
import os
import sys
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'scrapers', 'sc_data')

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

# Components
comps_path = os.path.join(os.path.dirname(__file__), "data", "components.json")
components_list = []
if os.path.exists(comps_path):
    with open(comps_path) as f:
        components_list = json.load(f).get("data", [])
    print(f"  ✅ {len(components_list)} componentes", file=sys.stderr)
else:
    print(f"  ⚠️  components.json no encontrado", file=sys.stderr)


# Wikelo
wikelo = load_json('wikelo_catalog.json')
print(f"  ✅ Wikelo catalog loaded", file=sys.stderr)

# All items
items_raw = load_json('_all_items.json')
items_list = items_raw if isinstance(items_raw, list) else []
print(f"  ✅ {len(items_list)} items", file=sys.stderr)

# Stats cache
STATS = {
    'missions': len(missions_list),
    'blueprints': len(blueprints_list),
    'weapons': len(weapons_list),
    'wikelo_contracts': 0,
    'items': len(items_list)
}
if wikelo:
    for cat in ['favor_trades', 'polaris_bit_recipes', 'weapon_contracts', 'armor_contracts', 'vehicle_contracts', 'ship_contracts']:
        STATS['wikelo_contracts'] += len(wikelo.get(cat, []))

# ─── Cargar traducciones del global.ini ───
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
    # Try case-insensitive
    kl = key.lower()
    for k, v in translations_dict.items():
        if k.lower() == kl:
            return v
    return default

def translate_mission(mission):
    """Intenta traducir una misión buscando contractor + tipo en global.ini."""
    debug_name = mission.get('debug_name', '')
    if not debug_name:
        return mission
    
    # Extract contractor from debug_name
    parts = debug_name.split('_')
    contractor = ''
    if parts:
        c = parts[0]
        if c not in ('PU', 'PU-', 'Sandbox'):
            contractor = c
        elif len(parts) > 1:
            contractor = parts[1]
    
    if not contractor:
        return mission
    
    # Build search keys
    title = mission.get('title', '')
    result = dict(mission)
    
    # Search for matching translation by debug_name pattern
    # Try: Contractor_type_title_NNN or Contractor_Type_desc_NNN
    trans_keys_to_try = [
        f"{contractor}_title",
        f"{contractor}_desc",
        f"{contractor}_Description",
        f"{contractor}_Name",
    ]
    
    # Search all translations matching this contractor
    matching = {}
    for k, v in translations_dict.items():
        if k.lower().startswith(contractor.lower() + '_'):
            # Also check if title matches
            if '_title_' in k or '_Title_' in k:
                matching[f'title_{k}'] = v
            elif '_desc_' in k or '_Desc_' in k or '_Description' in k:
                matching[f'desc_{k}'] = v
            elif k.endswith('_Name') or '_Name=' in k:
                matching[f'name_{k}'] = v
    
    if matching:
        result['_translations'] = matching
        # Try to find best title match
        title_keys = [k for k in matching if k.startswith('title_')]
        if title_keys:
            result['_translated_title'] = list(matching.values())[0]
    
    return result

print("🚀 API lista", file=sys.stderr)


# ═══════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════

@app.route('/api')
def api_docs():
    return jsonify({
        'name': 'Star Citizen Database API',
        'version': '1.0',
        'endpoints': {
            'GET /stats': 'Estadísticas generales',
            'GET /missions': 'Lista de misiones (?faction=X&system=Y&has_blueprints=true&search=Z)',
            'GET /missions/<uuid>': 'Detalle de una misión',
            'GET /blueprints': 'Lista de blueprints (?output=X&min_ingredients=N&search=Z)',
            'GET /blueprints/<uuid>': 'Detalle de un blueprint',
            'GET /weapons': 'Armas de nave (?size=N&type=X&min_dps=N)',
            'GET /weapons/<id>': 'Detalle de un arma',
            'GET /wikelo': 'Contratos Wikelo',
            'GET /items': 'Catálogo de items (?search=Z)',
            'GET /translate?q=clave': 'Traducir una clave del global.ini al español',
    'GET /translations': 'Obtener todas las traducciones (diccionario completo)',
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
    if lang == 'en':
        return jsonify({'total': 0, 'note': 'English is source language', 'data': {}})
    return jsonify({
        'total': len(translations_dict),
        'source': 'global.ini (Star Citizen Spanish localization)',
        'data': translations_dict
    })

@app.route('/stats')
def stats():
    # Mission counts by category
    scopes = {}
    for m in missions_list:
        s = m.get('reward_scope', 'Unknown')
        scopes[s] = scopes.get(s, 0) + 1

    # Mission counts by system
    systems = {}
    for m in missions_list:
        for sys_info in m.get('star_systems', []):
            sname = sys_info.get('name', 'Unknown') if isinstance(sys_info, dict) else str(sys_info)
            systems[sname] = systems.get(sname, 0) + 1

    # Blueprint missions
    bp_missions = sum(1 for m in missions_list if m.get('has_blueprints'))

    return jsonify({
        'total_missions': len(missions_list),
        'total_blueprints': len(blueprints_list),
        'total_weapons': len(weapons_list),
        'total_items': len(items_list),
        'missions_by_category': scopes,
        'missions_by_system': systems,
        'missions_with_blueprints': bp_missions,
        'blueprint_ingredients_distribution': {},
        'data_version': missions_raw.get('date', 'unknown') if missions_raw else 'unknown'
    })


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

    lang = request.args.get('lang', 'es')
    total = len(filtered)
    start = (page - 1) * per_page
    end = start + per_page
    page_items = filtered[start:end]

    if lang == 'es':
        enriched = []
        for m in page_items:
            em = translate_mission(m)
            enriched.append(em)
        page_items = enriched

    return jsonify({
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page,
        'data': page_items
    })


@app.route('/missions/<uuid>')
def get_mission(uuid):
    lang = request.args.get('lang', 'es')
    for m in missions_list:
        if m.get('uuid') == uuid:
            if lang == 'es':
                return jsonify(translate_mission(m))
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

    filtered = items_list
    if search:
        filtered = [i for i in filtered if search in i.get('name', '').lower()]
    if sold == 'true':
        filtered = [i for i in filtered if i.get('Sold')]
    elif sold == 'false':
        filtered = [i for i in filtered if not i.get('Sold')]

    return jsonify({
        'total': len(filtered),
        'data': filtered[:200]  # Limit to 200 for performance
    })


@app.route("/components")
def get_components():
    ctype = request.args.get("type", "").lower()
    size = request.args.get("size", "").lower()
    search = request.args.get("search", "").lower()
    filtered = components_list
    if ctype:
        filtered = [c for c in filtered if c.get("type", "").lower() == ctype]
    if size:
        filtered = [c for c in filtered if c.get("size", "") == size]
    if search:
        filtered = [c for c in filtered if search in c.get("name", "").lower()]
    return jsonify({"total": len(filtered), "data": filtered})



def safe_lower(val):
    if val is None:
        return ''
    if isinstance(val, str):
        return val.lower()
    return str(val).lower()

@app.route("/minerals")
def get_minerals():
    rarity = request.args.get("rarity", "").lower()
    location = request.args.get("location", "").lower()
    min_val = request.args.get("min_value", type=float)
    max_val = request.args.get("max_value", type=float)
    search = request.args.get("search", "").lower()
    filtered = minerals_list
    if rarity:
        filtered = [m for m in filtered if m.get("rarity", "").lower() == rarity]
    if location:
        filtered = [m for m in filtered if any(location in loc.lower() for loc in m.get("locations", []))]
    if min_val is not None:
        filtered = [m for m in filtered if m.get("value_per_scu", 0) >= min_val]
    if max_val is not None:
        filtered = [m for m in filtered if m.get("value_per_scu", 0) <= max_val]
    if search:
        filtered = [m for m in filtered if search in m.get("name", "").lower()]
    return jsonify({"total": len(filtered), "data": filtered})

@app.route("/minerals/<name>")
def get_mineral(name):
    for m in minerals_list:
        if m.get("name", "").lower() == name.lower():
            return jsonify(m)
    return jsonify({"error": "Mineral not found"}), 404

@app.route('/search')
def global_search():
    q = request.args.get('q', '').lower()
    if len(q) < 2:
        return jsonify({'error': 'Query too short. Minimum 2 characters.'}), 400

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

    return jsonify(results)


# ─── MAIN ───

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    print(f"\n🔥 API corriendo en http://0.0.0.0:{port}", file=sys.stderr)
    app.run(host='0.0.0.0', port=port, debug=debug)
