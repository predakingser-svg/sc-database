#!/usr/bin/env python3
"""Process all StarBreaker data + translations → clean JSON for web"""
import json, os, urllib.request, glob, re
from collections import defaultdict

BASE = "/tmp/starbreakers_data"
OUT = "/tmp/sc_web_data"
TRAD_URL = "https://raw.githubusercontent.com/LetalDark/StarCitizen_ES_Plus/v1.33.6/versions/4.9.0-LIVE_12248363/output/global.ini"

os.makedirs(OUT, exist_ok=True)

# ─── 1. Translations ────────────────────────────────────────────────────
print("Loading translations...")
trad = {}
with urllib.request.urlopen(TRAD_URL) as f:
    for line in f.read().decode().split('\n'):
        line = line.strip()
        if '=' in line and not line.startswith('#') and not line.startswith(';'):
            k, v = line.split('=', 1)
            trad[k.strip()] = v.strip()
print(f"OK {len(trad)}")

def tr(name):
    if not name: return name
    for k in [name, name.replace('EntityClassDefinition.','',1)]:
        for s in [f"{k}_DisplayName", f"@{k}", f"@item/{k}_Name", f"{k}_Name", f"@loc_PLACEHOLDER"]:
            if s in trad: return trad[s]
            ls = s.lower()
            if ls in trad: return trad[ls]
    return name.split('.')[-1] if '.' in name else name

def get_val(d, *keys, default=None):
    for k in keys:
        if isinstance(d, dict) and k in d: d = d[k]
        else: return default
    return d

def walk_json(path):
    """Load and navigate DataCore JSON"""
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except: return None

# ─── 2. Ships ───────────────────────────────────────────────────────────
print("\n=== SHIPS ===")
ships = []
for f in glob.glob(f"{BASE}/spaceships/*.json")[:1000]:
    data = walk_json(f)
    if not data: continue
    rv = data.get('_RecordValue_') or data.get('_RecordValue') or {}
    name = data.get('_RecordName_','').replace('EntityClassDefinition.','',1)
    comps = rv.get('Components', [])
    
    ship = {'id': name, 'name_es': tr(name), 'hp': 0, 'scm_speed': 0, 'max_speed': 0, 'cargo': 0, 'crew_min': 0, 'crew_max': 0, 'manufacturer': '', 'size': 0}
    for c in comps if isinstance(comps, list) else []:
        if not isinstance(c, dict): continue
        if 'Health' in c:
            h = c.get('Health', {})
            ship['hp'] = int(h.get('MaxHealth', 0) if isinstance(h, dict) else h or 0)
        if 'SpeedSCM' in c: ship['scm_speed'] = int(c.get('SpeedSCM',0))
        if 'SpeedMax' in c: ship['max_speed'] = int(c.get('SpeedMax',0))
        if 'MaxCargo' in c: ship['cargo'] = float(c.get('MaxCargo',0))
        if 'MinCrew' in c: ship['crew_min'] = int(c.get('MinCrew',0))
        if 'MaxCrew' in c: ship['crew_max'] = int(c.get('MaxCrew',0))
    for fab in ['AEGS','ANVL','ARGO','BANU','CNOU','CRUS','DRAK','ESPR','GAMA','GREY','KRIG','MISC','MRAI','ORIG','RSI','VNCL','XNAA']:
        if name.startswith(fab+'_'): ship['manufacturer'] = fab; break
    ships.append(ship)

with open(f"{OUT}/ships.json", 'w') as f: json.dump(ships, f, ensure_ascii=False, indent=2)
print(f"{len(ships)} ships")

# ─── 3. SC Items (components, weapons, armor) ───────────────────────────
print("\n=== SC ITEMS ===")
items = []
for f in glob.glob(f"{BASE}/scitem/**/*.json", recursive=True)[:5000]:
    data = walk_json(f)
    if not data: continue
    rv = data.get('_RecordValue_') or data.get('_RecordValue') or {}
    name = data.get('_RecordName_','').replace('EntityClassDefinition.','',1)
    item_type = os.path.basename(os.path.dirname(f))
    item = {'id': name, 'name_es': tr(name), 'type': item_type, 'size': rv.get('Size',0), 'grade': rv.get('Grade',0)}
    # Power plant
    pp = rv.get('PowerPlant', {})
    if pp: item['power_output'] = pp.get('Output',0)
    # Shield
    sh = rv.get('Shield', {})
    if sh: item['shield_hp'] = sh.get('MaxShieldHealth',0); item['shield_regen'] = sh.get('ShieldRegenRate',0)
    # Cooler
    co = rv.get('Cooler', {})
    if co: item['cooling_rate'] = co.get('CoolingRate',0)
    # Quantum Drive
    qd = rv.get('QuantumDrive', {})
    if qd: item['qt_speed'] = qd.get('Speed',0); item['qt_range'] = qd.get('Range',0)
    # Weapon
    wp = rv.get('Weapon', {})
    if wp: item['damage'] = wp.get('Damage',0); item['fire_rate'] = wp.get('FireRate',0); item['range'] = wp.get('Range',0)
    # Durability
    du = rv.get('Durability', {})
    if du: item['health'] = du.get('Health',0)
    # Heat
    ht = rv.get('HeatConnection', {})
    if ht: item['heat'] = ht.get('ThermalEnergyDraw',0)
    # Power draw
    pw = rv.get('PowerConnection', {})
    if pw: item['power_draw'] = pw.get('PowerDraw',0)
    items.append(item)

with open(f"{OUT}/items.json", 'w') as f: json.dump(items, f, ensure_ascii=False, indent=2)
print(f"{len(items)} items")

# ─── 4. Missions ────────────────────────────────────────────────────────
print("\n=== MISSIONS ===")
missions = []
for f in glob.glob(f"{BASE}/missiondata/**/*.json", recursive=True):
    data = walk_json(f)
    if not data: continue
    rv = data.get('_RecordValue_') or data.get('_RecordValue') or {}
    name = data.get('_RecordName_','')
    m = {'id': name, 'name_es': tr(name), 'type': rv.get('_Type',''), 'system': '', 'faction': '', 'pay': 0}
    missions.append(m)

with open(f"{OUT}/missions.json", 'w') as f: json.dump(missions, f, ensure_ascii=False, indent=2)
print(f"{len(missions)} missions")

# ─── 5. Contracts (with rewards, reputation) ────────────────────────────
print("\n=== CONTRACTS ===")
contracts = []
for f in glob.glob(f"{BASE}/contracts/**/*.json", recursive=True):
    data = walk_json(f)
    if not data: continue
    rv = data.get('_RecordValue_') or data.get('_RecordValue') or {}
    name = data.get('_RecordName_','')
    c = {'id': name, 'name_es': tr(name), 'type': rv.get('_Type',''), 'pay_auec': 0, 'rep_required': '', 'system': ''}
    contracts.append(c)

with open(f"{OUT}/contracts.json", 'w') as f: json.dump(contracts, f, ensure_ascii=False, indent=2)
print(f"{len(contracts)} contracts")

# ─── 6. Crafting ────────────────────────────────────────────────────────
print("\n=== CRAFTING ===")
crafting = []
for f in glob.glob(f"{BASE}/crafting/**/*.json", recursive=True):
    data = walk_json(f)
    if not data: continue
    rv = data.get('_RecordValue_') or data.get('_RecordValue') or {}
    name = data.get('_RecordName_','')
    cr = {'id': name, 'name_es': tr(name), 'type': rv.get('_Type',''), 'materials': [], 'output': '', 'output_qty': 0}
    crafting.append(cr)

with open(f"{OUT}/crafting.json", 'w') as f: json.dump(crafting, f, ensure_ascii=False, indent=2)
print(f"{len(crafting)} recipes")

# ─── 7. Reputation ──────────────────────────────────────────────────────
print("\n=== REPUTATION ===")
reputation = []
for f in glob.glob(f"{BASE}/reputation/**/*.json", recursive=True):
    data = walk_json(f)
    if not data: continue
    rv = data.get('_RecordValue_') or data.get('_RecordValue') or {}
    name = data.get('_RecordName_','')
    rep = {'id': name, 'name_es': tr(name), 'type': rv.get('_Type','')}
    reputation.append(rep)

with open(f"{OUT}/reputation.json", 'w') as f: json.dump(reputation, f, ensure_ascii=False, indent=2)
print(f"{len(reputation)} rep entries")

# ─── 8. Commodities ────────────────────────────────────────────────────
print("\n=== COMMODITIES ===")
commodities = []
for f in glob.glob(f"{BASE}/commodities/**/*.json", recursive=True):
    data = walk_json(f)
    if not data: continue
    rv = data.get('_RecordValue_') or data.get('_RecordValue') or {}
    name = data.get('_RecordName_','')
    co = {'id': name, 'name_es': tr(name), 'type': rv.get('_Type',''), 'base_price': rv.get('BasePrice',0)}
    commodities.append(co)

with open(f"{OUT}/commodities.json", 'w') as f: json.dump(commodities, f, ensure_ascii=False, indent=2)
print(f"{len(commodities)} commodities")

# ─── 9. Mineable ────────────────────────────────────────────────────────
print("\n=== MINEABLE ===")
mineable = []
for f in glob.glob(f"{BASE}/mineable/**/*.json", recursive=True):
    data = walk_json(f)
    if not data: continue
    rv = data.get('_RecordValue_') or data.get('_RecordValue') or {}
    name = data.get('_RecordName_','')
    mi = {'id': name, 'name_es': tr(name), 'type': rv.get('_Type',''), 'rarity': rv.get('Rarity','')}
    mineable.append(mi)

with open(f"{OUT}/mineable.json", 'w') as f: json.dump(mineable, f, ensure_ascii=False, indent=2)
print(f"{len(mineable)} mineables")

# ─── 10. Summary ────────────────────────────────────────────────────────
print("\n" + "="*50)
print("COMPLETE - Files in /tmp/sc_web_data/")
for f in sorted(os.listdir(OUT)):
    if f.endswith('.json'):
        sz = os.path.getsize(os.path.join(OUT, f)) / 1024
        print(f"  {f}: {sz:.1f} KB")
print(f"\nTotal size: {sum(os.path.getsize(os.path.join(OUT,f)) for f in os.listdir(OUT) if f.endswith('.json'))/1024/1024:.1f} MB")
