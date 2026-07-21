#!/usr/bin/env python3
"""Merge StarBreaker data into existing SC Database - no duplicates"""
import json, os, glob
from datetime import datetime

# Paths
EXISTING = "/home/predakingser/.openclaw/workspace/proyectos/star-citizen-db/api/data/sc_database_es.json"
NEW_DATA = "/tmp/sc_web_data"
OUT = "/home/predakingser/.openclaw/workspace/proyectos/star-citizen-db/api/data/sc_database_es.json"
TRAD = {}  # Will load inline

# Load existing DB
print("Loading existing DB...")
with open(EXISTING) as f: db = json.load(f)
print(f"  Missions: {len(db.get('missions',[]))}")
print(f"  Blueprints: {len(db.get('blueprints',[]))}")
print(f"  Weapons: {len(db.get('weapons',[]))}")
print(f"  Components: {len(db.get('components',[]))}")
print(f"  Minerals: {len(db.get('minerals',[]))}")
print(f"  Items: {len(db.get('items',[]))}")
print(f"  Wikelo: {len(db.get('wikelo',[]))}")

# Load StarBreaker data
def load_json(path):
    try:
        with open(path) as f: return json.load(f)
    except: return []

sb_missions = load_json(f"{NEW_DATA}/missions.json")
sb_contracts = load_json(f"{NEW_DATA}/contracts.json")
sb_crafting = load_json(f"{NEW_DATA}/crafting.json")
sb_commodities = load_json(f"{NEW_DATA}/commodities.json")
sb_mineable = load_json(f"{NEW_DATA}/mineable.json")
sb_items = load_json(f"{NEW_DATA}/items_full.json")
sb_ships = load_json(f"{NEW_DATA}/ships.json")

print(f"\nStarBreaker data:")
print(f"  Missions: {len(sb_missions)}")
print(f"  Contracts: {len(sb_contracts)}")
print(f"  Crafting: {len(sb_crafting)}")
print(f"  Commodities: {len(sb_commodities)}")
print(f"  Mineable: {len(sb_mineable)}")
print(f"  Items: {len(sb_items)}")
print(f"  Ships: {len(sb_ships)}")

# REBUILD missions from StarBreaker (no duplicates by id)
print("\n--- MISSIONS ---")
existing_ids = {m.get('debug_name','') for m in db.get('missions',[])}
new_missions = []
kept = 0; added = 0
for m in db.get('missions',[]):
    mid = m.get('debug_name','')
    if mid in existing_ids:
        existing_ids.discard(mid)
        new_missions.append(m)
        kept += 1
for c in sb_contracts:
    cid = c.get('id','')
    if cid not in existing_ids and cid:
        new_missions.append({
            'uuid': cid,
            'title': c.get('name_es', cid),
            'debug_name': cid,
            'mission_giver': '',
            'faction': '',
            'reward': c.get('pay_auec', 0),
            'illegal': False
        })
        added += 1
        existing_ids.add(cid)
db['missions'] = new_missions
print(f"  Kept: {kept}, Added: {added}, Total: {len(new_missions)}")

# BLUEPRINTS (crafting + existing)
print("\n--- BLUEPRINTS ---")
existing_bp = {b.get('key','') for b in db.get('blueprints',[])}
new_bp = []
kept = 0; added = 0
for b in db.get('blueprints',[]):
    bk = b.get('key','')
    if bk:
        new_bp.append(b); kept += 1
for cr in sb_crafting:
    ck = cr.get('id','')
    if ck not in existing_bp and ck:
        new_bp.append({'uuid': ck, 'key': ck, 'output_name': cr.get('name_es',ck), 'output_class': cr.get('type',''), 'craft_time_seconds': 0, 'is_available_by_default': False})
        added += 1
        existing_bp.add(ck)
db['blueprints'] = new_bp
print(f"  Kept: {kept}, Added: {added}, Total: {len(new_bp)}")

# WEAPONS + COMPONENTS (from items)
print("\n--- WEAPONS & COMPONENTS ---")
existing_weps = {w.get('id','') for w in db.get('weapons',[])}
existing_comps = {c.get('name','') for c in db.get('components',[])}
new_weps = []; new_comps = []
for item in sb_items:
    iid = item.get('id','')
    # Check if it's a weapon
    if 'weapon' in item.get('type','').lower():
        if iid not in existing_weps:
            new_weps.append({'id': iid, 'name': item.get('name_es',iid), 'category': item.get('type',''), 'stats': {'damage': item.get('damage',0), 'fire_rate': item.get('fire_rate',0), 'range': item.get('range',0)}})
            existing_weps.add(iid)
    else:
        if iid not in existing_comps:
            new_comps.append({'name': item.get('name_es',iid), 'type': item.get('type',''), 'size': item.get('size',''), 'grade': item.get('grade',''), 'category': item.get('type','')})
            existing_comps.add(iid)
db['weapons'] = new_weps
db['components'] = new_comps
print(f"  Weapons: {len(new_weps)} | Components: {len(new_comps)}")

# MINERALS
print("\n--- MINERALS ---")
existing_min = {m.get('name','') for m in db.get('minerals',[])}
new_min = []
for m in sb_mineable:
    mn = m.get('name_es',m.get('id',''))
    if mn not in existing_min:
        new_min.append({'name': mn, 'type': m.get('type',''), 'rarity': m.get('rarity',''), 'signature_min': 0, 'signature_max': 0, 'value_per_scu': 0})
        existing_min.add(mn)
db['minerals'] = new_min
print(f"  Minerals: {len(new_min)} (total new)")

# ITEMS (full catalog)
print("\n--- ITEMS ---")
existing_items = {i.get('id','') for i in db.get('items',[])}
new_items = []
for item in sb_items:
    iid = item.get('id','')
    if iid not in existing_items:
        new_items.append({'id': iid, 'name': item.get('name_es',iid), 'item_type': item.get('type',''), 'category': item.get('type','')})
        existing_items.add(iid)
db['items'] = new_items
print(f"  Items: {len(new_items)} (total new)")

# UPDATE metadata
db['built'] = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ')
db['version'] = '4.9.0-live'

# SAVE
print(f"\nWriting updated DB...")
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)

size = os.path.getsize(OUT)/1024/1024
print(f"Saved: {OUT} ({size:.1f} MB)")

# Summary of all sections
print("\n=== FINAL SUMMARY ===")
for k in ['name','version','language','missions','blueprints','weapons','components','minerals','items','wikelo']:
    if k in db:
        v = db[k]
        print(f"  {k}: {len(v) if isinstance(v,list) else v}")
