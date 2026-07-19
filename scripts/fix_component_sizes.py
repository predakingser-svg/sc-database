#!/usr/bin/env python3
"""
Fix T-001: Complete size/grade for short-name components that had "?" values
while their full-name counterparts have real data.

Mapping:
  short_name (type) → full_name_pattern → size, grade
"""
import json, os, re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def build_lookup(components):
    """
    Build {short_name_key: (size, grade)} from full-name entries.
    short_name_key = (short_name_lower, type_lower)
    
    For each full-name entry, derive the short name by removing
    known type suffixes: " Cooler", " Power Plant", " Quantum Drive",
    " Shield Generator", " Shield", " Radar"
    """
    # Type suffix patterns (longest first to avoid partial matches)
    type_suffixes = {
        'shield generator': 'Shield',
        'power plant': 'Power Plant',
        'quantum drive': 'Quantum Drive',
        ' shield': 'Shield',
        ' cooler': 'Cooler',
        ' radar': 'Radar',
    }
    
    lookup = {}
    for c in components:
        name = c.get('name', '')
        ctype = c.get('type', '')
        size = c.get('size', '?')
        grade = c.get('grade', '?')
        
        if size == '?' or grade == '?':
            continue  # Skip incomplete entries
        
        name_lower = name.lower()
        
        for suffix, comp_type in type_suffixes.items():
            if name_lower.endswith(suffix):
                short = name[:-len(suffix)].strip()
                key = (short.lower(), comp_type)
                if key not in lookup:
                    lookup[key] = (size, grade)
                break
    
    return lookup


def fix_components_list(components, lookup, filename_label):
    """Apply lookup to components list in-place. Returns (fixed, still_broken) counts."""
    fixed = 0
    still_broken = 0
    
    for c in components:
        if c.get('size') != '?' and c.get('grade') != '?':
            continue  # Already complete
        
        # Check if it's a short name without the type suffix in its name
        name = c.get('name', '')
        ctype = c.get('type', '')
        
        key = (name.lower(), ctype)
        if key in lookup:
            size, grade = lookup[key]
            c['size'] = size
            c['grade'] = grade
            fixed += 1
            print(f"  ✓ {name} ({ctype}) → size={size}, grade={grade}")
        else:
            still_broken += 1
            print(f"  ⚠ {name} ({ctype}) → NO MATCH, left as ?")
    
    return fixed, still_broken


print("=" * 60)
print("T-001: Complete size/grade for short-name components")
print("=" * 60)

# ─── 1. components.json ───
print("\n📦 api/data/components.json")
comp_path = os.path.join(BASE, 'api', 'data', 'components.json')
with open(comp_path) as f:
    comps_data = json.load(f)

components = comps_data['data']
lookup = build_lookup(components)
print(f"  Lookup built: {len(lookup)} short→full mappings")

f_before = sum(1 for c in components if c.get('size') == '?' or c.get('grade') == '?')
print(f"  Before: {f_before} components with ?")
fix_components_list(components, lookup, "components.json")

with open(comp_path, 'w') as f:
    json.dump(comps_data, f, indent=2)
print(f"  ✅ Saved components.json")

f_after = sum(1 for c in components if c.get('size') == '?' or c.get('grade') == '?')
print(f"  After: {f_after} components with ?")

# ─── 2. sc_database_en.json ───
print("\n📦 api/data/sc_database_en.json")
en_path = os.path.join(BASE, 'api', 'data', 'sc_database_en.json')
with open(en_path) as f:
    en_data = json.load(f)

en_comps = en_data['components']
f_before_en = sum(1 for c in en_comps if c.get('size') == '?' or c.get('grade') == '?')
print(f"  Before: {f_before_en} components with ?")
fix_components_list(en_comps, lookup, "sc_database_en.json")

with open(en_path, 'w') as f:
    json.dump(en_data, f, ensure_ascii=False)
print(f"  ✅ Saved sc_database_en.json")

# ─── 3. frontend/data/components.json ───
print("\n📦 frontend/data/components.json")
fe_path = os.path.join(BASE, 'frontend', 'data', 'components.json')
with open(fe_path) as f:
    fe_comps = json.load(f)

f_before_fe = sum(1 for c in fe_comps if c.get('size') == '?' or c.get('grade') == '?')
print(f"  Before: {f_before_fe} components with ?")
fix_components_list(fe_comps, lookup, "frontend/data/components.json")

with open(fe_path, 'w') as f:
    json.dump(fe_comps, f, indent=2)
print(f"  ✅ Saved frontend/data/components.json")


# ─── Summary ───
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
total_before = f_before + f_before_en + f_before_fe
total_after = sum(
    1 for c in components if c.get('size') == '?' or c.get('grade') == '?'
) + sum(
    1 for c in en_comps if c.get('size') == '?' or c.get('grade') == '?'
) + sum(
    1 for c in fe_comps if c.get('size') == '?' or c.get('grade') == '?'
)
print(f"  Total before: {total_before}")
print(f"  Total after:  {total_after}")
print(f"  Fixed:        {total_before - total_after}")
print()
if total_after > 0:
    print("  🟡 Remaining with ? (no full-name match available):")
    for c in components:
        if c.get('size') == '?' or c.get('grade') == '?':
            print(f"     - {c['name']} ({c['type']})")
else:
    print("  ✅ All components have real size/grade values!")
