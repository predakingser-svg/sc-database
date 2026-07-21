#!/usr/bin/env python3
"""Final merge - stats items + full catalog, no duplicates"""
import json, os
from datetime import datetime, timezone

BASE = "/home/predakingser/.openclaw/workspace/proyectos/star-citizen-db/api/data"
EXISTING = f"{BASE}/sc_database_es.json"
NEW_DATA = "/tmp/sc_web_data"
OUT = f"{BASE}/sc_database_es.json"

with open(EXISTING) as f: db = json.load(f)
items_stats = json.load(open(f"{NEW_DATA}/items.json"))  # 5000 with stats
items_full = json.load(open(f"{NEW_DATA}/items_full.json"))  # 23951 full catalog

print(f"Stats items: {len(items_stats)} | Full items: {len(items_full)}")

# Keep existing missions, blueprints, minerals as-is (already merged)
print(f"Missions: {len(db.get('missions',[]))}")
print(f"Blueprints: {len(db.get('blueprints',[]))}")
print(f"Minerals: {len(db.get('minerals',[]))}")

# Rebuild WEAPONS from items_stats (with real stats)
existing_ids = set()
db['weapons'] = []
for item in items_stats:
    if 'weapon' in (item.get('type','') or '').lower():
        wid = item.get('id','')
        if wid and wid not in existing_ids:
            db['weapons'].append({
                'id': wid,
                'name': item.get('name_es', wid),
                'category': item.get('type',''),
                'stats': {'damage': item.get('damage',0), 'fire_rate': item.get('fire_rate',0), 'range': item.get('range',0)}
            })
            existing_ids.add(wid)
print(f"Weapons: {len(db['weapons'])}")

# Rebuild COMPONENTS from items_stats (with stats)
existing_ids = set()
db['components'] = []
for item in items_stats:
    cid = item.get('id','')
    if cid and cid not in existing_ids:
        db['components'].append({
            'name': item.get('name_es', cid),
            'type': item.get('type',''),
            'size': item.get('size',0),
            'grade': item.get('grade',0),
            'power_output': item.get('power_output',0),
            'shield_hp': item.get('shield_hp',0),
            'cooling_rate': item.get('cooling_rate',0),
            'qt_speed': item.get('qt_speed',0),
            'health': item.get('health',0),
            'heat': item.get('heat',0),
            'power_draw': item.get('power_draw',0)
        })
        existing_ids.add(cid)
print(f"Components: {len(db['components'])}")

# Build full ITEMS catalog from items_full (all 23951)
existing_ids = set()
db['items'] = []
for item in items_full:
    iid = item.get('id','')
    if iid and iid not in existing_ids:
        db['items'].append({'id': iid, 'name': iid.split('.')[-1], 'item_type': item.get('type',''), 'category': item.get('type','')})
        existing_ids.add(iid)
print(f"Items: {len(db['items'])}")

db['built'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ')
db['version'] = '4.9.0-live'

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)

size = os.path.getsize(OUT)/1024/1024
print(f"\nSaved: {OUT} ({size:.1f} MB)")
print("DONE")
