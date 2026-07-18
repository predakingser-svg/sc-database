#!/usr/bin/env python3
"""Compila datos de minerales + firmas de escaneo + ubicaciones"""
import json, os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'api', 'data')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Firmas de escaneo (del usuario - Reddit post)
raw_data = """Agricium	3885	7770	11655	15540	19425	23310
Aluminum	4285	8570	12855	17140	21425	25710
Aslarite	3840	7680	11520	15360	19200	23040
Beryl	3540	7080	10620	14160	17700	21240
Bexalite	3600	7200	10800	14400	18000	21600
Borase	3570	7140	10710	14280	17850	21420
Copper	4240	8480	12720	16960	21200	25440
Corundum	4225	8450	12675	16900	21125	25350
Gold	3585	7170	10755	14340	17925	21510
Hephaestanite	4180	8360	12540	16720	20900	25080
Ice	4300	8600	12900	17200	21500	25800
Iron	4270	8540	12810	17080	21350	25620
Laranite	3825	7650	11475	15300	19125	22950
Lindinium	3400	6800	10200	13600	17000	20400
Ouratite	3370	6740	10110	13480	16850	20220
Quantanium	3170	6340	9510	12680	15850	19020
Quartz	4210	8420	12630	16840	21050	25260
Riccite	3385	6770	10155	13540	16925	20310
Savrilium	3200	6400	9600	12800	16000	19200
Silicon	4255	8510	12765	17020	21275	25530
Stileron	3185	6370	9555	12740	15925	19110
Taranite	3555	7110	10665	14220	17775	21330
Tin	4195	8390	12585	16780	20975	25170
Titanium	3855	7710	11565	15420	19275	23130
Torite	3900	7800	11700	15600	19500	23400
Tungsten	3870	7740	11610	15480	19350	23220"""

# Ubicaciones por mineral
locations_db = {
    "Quantanium": {"planets": ["Aberdeen (Hurston)", "Magda (Crusader)", "Cellin (Crusader)", "Daymar (Crusader)", "Lyria (ArcCorp)", "Wala (microTech)"], "rarity": "legendario", "value": 24.69},
    "Agricium": {"planets": ["Ita (Hurston)", "Arial (Hurston)", "Cellin (Crusader)", "Daymar (Crusader)", "Lyria (ArcCorp)", "Wala (microTech)"], "rarity": "común", "value": 20.07},
    "Bexalite": {"planets": ["Arial (Hurston)", "Magda (Crusader)", "Lyria (ArcCorp)", "Calliope (microTech)"], "rarity": "raro", "value": 12.33},
    "Borase": {"planets": ["Aberdeen (Hurston)", "Arial (Hurston)", "Euterpe (microTech)", "Cellin (Crusader)", "Daymar (Crusader)", "Wala (microTech)"], "rarity": "común", "value": 8.53},
    "Laranite": {"planets": ["Aberdeen (Hurston)", "Arial (Hurston)", "Euterpe (microTech)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)", "Wala (microTech)", "Calliope (microTech)"], "rarity": "común", "value": 18.59},
    "Taranite": {"planets": ["Aberdeen (Hurston)", "Arial (Hurston)", "Euterpe (microTech)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)", "Calliope (microTech)", "Wala (microTech)"], "rarity": "común", "value": 8.28},
    "Titanium": {"planets": ["Aberdeen (Hurston)", "Ita (Hurston)", "Arial (Hurston)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)", "Calliope (microTech)", "Wala (microTech)"], "rarity": "común", "value": 5.31},
    "Gold": {"planets": ["Arial (Hurston)", "Euterpe (microTech)", "Daymar (Crusader)", "Lyria (ArcCorp)", "Wala (microTech)"], "rarity": "raro", "value": 11.37},
    "Tungsten": {"planets": ["Aberdeen (Hurston)", "Ita (Hurston)", "Arial (Hurston)", "Euterpe (microTech)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)", "Calliope (microTech)", "Wala (microTech)"], "rarity": "común", "value": 4.71},
    "Copper": {"planets": ["Aberdeen (Hurston)", "Ita (Hurston)", "Arial (Hurston)", "Euterpe (microTech)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)", "Calliope (microTech)", "Wala (microTech)"], "rarity": "común", "value": 4.27},
    "Corundum": {"planets": ["Aberdeen (Hurston)", "Ita (Hurston)", "Arial (Hurston)", "Euterpe (microTech)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)", "Calliope (microTech)", "Wala (microTech)"], "rarity": "común", "value": 4.62},
    "Quartz": {"planets": ["Aberdeen (Hurston)", "Ita (Hurston)", "Arial (Hurston)", "Euterpe (microTech)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)", "Calliope (microTech)", "Wala (microTech)"], "rarity": "común", "value": 4.17},
    "Aluminum": {"planets": ["Aberdeen (Hurston)", "Ita (Hurston)", "Arial (Hurston)", "Euterpe (microTech)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)", "Calliope (microTech)", "Wala (microTech)"], "rarity": "común", "value": 4.30},
    "Savrilium": {"planets": ["Arial (Hurston)", "Magda (Crusader)", "Wala (microTech)"], "rarity": "épico", "value": 15.25},
    "Hephaestanite": {"planets": ["Aberdeen (Hurston)", "Ita (Hurston)", "Arial (Hurston)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)"], "rarity": "común", "value": 3.89},
    "Silicon": {"planets": ["Aberdeen (Hurston)", "Ita (Hurston)", "Arial (Hurston)", "Euterpe (microTech)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)"], "rarity": "común", "value": 4.09},
    "Ice": {"planets": ["Aberdeen (Hurston)", "Ita (Hurston)", "Arial (Hurston)", "Euterpe (microTech)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)", "Calliope (microTech)", "Wala (microTech)"], "rarity": "común", "value": 3.29},
    "Iron": {"planets": ["Aberdeen (Hurston)", "Ita (Hurston)", "Arial (Hurston)", "Euterpe (microTech)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)", "Calliope (microTech)", "Wala (microTech)"], "rarity": "común", "value": 4.05},
    "Tin": {"planets": ["Aberdeen (Hurston)", "Ita (Hurston)", "Arial (Hurston)", "Euterpe (microTech)", "Cellin (Crusader)", "Daymar (Crusader)", "Magda (Crusader)", "Lyria (ArcCorp)", "Calliope (microTech)", "Wala (microTech)"], "rarity": "común", "value": 4.23},
    "Aslarite": {"planets": ["Arial (Hurston)"], "rarity": "épico", "value": 18.90},
    "Beryl": {"planets": ["Cellin (Crusader)", "Daymar (Crusader)", "Wala (microTech)"], "rarity": "raro", "value": 6.78},
    "Lindinium": {"planets": ["Lyria (ArcCorp)", "Calliope (microTech)"], "rarity": "épico", "value": 22.15},
    "Ouratite": {"planets": ["Cellin (Crusader)", "Wala (microTech)"], "rarity": "raro", "value": 14.20},
    "Riccite": {"planets": ["Magda (Crusader)", "Calliope (microTech)"], "rarity": "épico", "value": 19.85},
    "Stileron": {"planets": ["Cellin (Crusader)", "Daymar (Crusader)", "Lyria (ArcCorp)"], "rarity": "raro", "value": 20.50},
    "Torite": {"planets": ["Ita (Hurston)", "Cellin (Crusader)", "Magda (Crusader)"], "rarity": "raro", "value": 7.42}
}

# Compilar
minerals = []
for line in raw_data.strip().split('\n'):
    parts = line.split('\t')
    name = parts[0]
    sigs = list(map(int, parts[1:7]))
    loc = locations_db.get(name, {"planets": [], "rarity": "común", "value": 0})

    minerals.append({
        "name": name,
        "type": "ore",
        "rarity": loc["rarity"],
        "signatures": {"20%": sigs[0], "40%": sigs[1], "60%": sigs[2], "80%": sigs[3], "100%": sigs[4], "max": sigs[5]},
        "signature_min": sigs[0],
        "signature_max": sigs[5],
        "locations": loc["planets"],
        "value_per_scu": loc["value"]
    })

rarity_order = {"común": 0, "raro": 1, "épico": 2, "legendario": 3}
minerals.sort(key=lambda m: (-rarity_order.get(m["rarity"], 0), m["signature_min"]))

path = os.path.join(OUTPUT_DIR, 'minerals.json')
with open(path, 'w') as f:
    json.dump({"total": len(minerals), "data": minerals}, f, indent=2, ensure_ascii=False)

rarities = {}
for m in minerals:
    rarities[m["rarity"]] = rarities.get(m["rarity"], 0) + 1

print(f"✅ minerals.json — {len(minerals)} minerales")
print(f"   Rarezas: {rarities}")
print()
print(f"{'Mineral':15s} {'Rareza':10s} {'Firma':12s} {'Loc':3s} {'Valor':8s}")
print("-"*50)
for m in minerals:
    print(f"{m['name']:15s} {m['rarity']:10s} {m['signature_min']:5d}-{m['signature_max']:5d} {len(m['locations']):3d} {m['value_per_scu']:6.2f}")
