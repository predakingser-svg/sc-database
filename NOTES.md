# NOTES — Revisión de categorización de armas (P3)

## Problema identificado

El archivo `_all_items.json` (~/scrapers/sc_data/_all_items.json, 7,733 items)
contenía items armamentísticos (misiles, torpedos, bombas, cañones, repetidores,
ametralladoras, racks de misiles, lanzadores y torretas) mezclados con items
genéricos de tienda (armaduras, ropa, pinturas de nave, etc.).

Estos items debían estar en el apartado `weapons`, no en `items`.

## Cambios realizados

### 1. `scripts/build_integrated_db.py` — Clasificación de items armamentísticos

Se agregó la función `is_weapon_item(name)` que identifica items armamentísticos
basándose en patrones de nombre:

| Tipo          | Patrón de nombre                                              | Ejemplos                                     |
|---------------|---------------------------------------------------------------|----------------------------------------------|
| ship_weapon   | `\b(cannon\|repeater\|gatling\|mass\s*driver\|suckerpunch)\b`  | M5A Cannon, CF-447 Rhino Repeater            |
| missile       | `\bmissile\b`                                                   | 'Arrow' I Missile, Ignite II Missile          |
| torpedo       | `\btorpedo\b`                                                   | Argos IX Torpedo, Executor Torpedo            |
| bomb          | `\bbomb\b`                                                      | Colossus Bomb, Thunderball Bomb               |
| weapon_mount  | `\b(missile\|torpedo\|bomb)\s*rack\b`                           | MSD-313 Missile Rack, Aegis Eclipse Bomb Rack |
| launcher      | `\b(rocket\s*launcher\|launcher)\b`                             | Boomtube Rocket Launcher, Animus Launcher     |
| turret        | `\bturret\b`                                                     | RSI Lesath Missile Turret                     |

**Exclusiones** (no son armas aunque contengan palabras clave):
- Bomber Jacket (ropa)
- Bombora Livery (pintura de nave)
- Bombardier (traje)
- Torpedo Burrito T-Shirt (camiseta)
- Laser Pointer / Laser Activation (accesorios FPS)
- Mining Laser (herramienta de minería)

**Flujo corregido:**
- `items_list_all` → se separa en:
  - `weapon_items_from_store` (251 items armamentísticos)
  - `items_list` (7,482 items no-armamentísticos) ← **este es el nuevo `items`**
- `weapons` section: recibe los 137 de `ship_weapons.json` + **122 nuevos** de
  `weapon_items_from_store` que no estaban duplicados (los 129 cañones/repetidores
  ya existían en `ship_weapons.json` y no se duplican).

### 2. `api/app.py` — Filtro consistente en endpoint `/items`

Se replicó la misma lógica de filtrado en la API Flask para que sirva datos
consistentes aunque no se use la base de datos pre-construida.

### 3. Archivos de datos regenerados

- `api/data/sc_database_es.json` → **259** weapons, **7,482** items
- `api/data/sc_database_en.json` → **259** weapons, **7,482** items

## Estadísticas finales

```
Apartado    Antes    Después    Cambio
──────────────────────────────────────
weapons     137      259        +122 (misiles, torpedos, bombas, racks, etc.)
items       7,733    7,482      -251 (armas movidas a weapons)
components  91       91         sin cambios (ya estaba limpio)
```

## Notas para frontend

Los nuevos items en `weapons` tienen la siguiente estructura (diferente a las
armas de `ship_weapons.json` que tienen `stats`):

```json
{
  "id": "uuid",
  "name": "'Arrow' I Missile",
  "Sold": 1,
  "weapon_type": "missile",
  "_source": "shop_data"
}
```

Para mostrar estos items en la tabla de armas, el frontend debe verificar:
- Si el item tiene `stats` → mostrar stats detalladas (DPS, alcance, etc.)
- Si el item tiene `weapon_type` → mostrar solo nombre, tipo y disponibilidad

Los nuevos `weapon_type` valores son: `missile`, `torpedo`, `bomb`, `ship_weapon`,
`weapon_mount`, `launcher`, `turret`.

El frontend podría usar `weapon_type` para agrupar/filtrar en la página de armas.

## Issues pre-existentes (fuera del alcance de este fix)

8 items en `ship_weapons.json` no tienen `stats` ni `weapon_type` — solo tienen
`id`, `name` y `error`:

- Altrucia Lacus (Revenant Tree) Plant — es una planta decorativa
- Bantam Hat Badger Bad — desconocido
- Mantis Polar Camo / Skullcrusher / Stormbringer Livery — pinturas de nave
- Prowler Panthera Livery — pintura de nave
- Revenant Pod — pod de carga, no un arma
- RSI Mantis — es una nave, no un arma

Estos deben ser corregidos a nivel del scraper (`ship_weapons.json`), no del
build script.
