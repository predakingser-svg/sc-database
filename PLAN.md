# PLAN: Mejoras Star Citizen Database

## Objetivo
Implementar 3 mejoras solicitadas por Señor sobre la base de datos existente de Star Citizen.

---

## Diagnóstico inicial

### 1. Componentes — Size y Grade incompletos
- **91 componentes** en `api/data/components.json` y `sc_database_en.json`
- **21 entradas duplicadas** con nombre corto (ej. "QuikCool", "FR-66") tienen `size: "?"` y `grade: "?"`
- Sus contrapartes con nombre completo (ej. "QuikCool Cooler", "FR-66 Shield Generator") tienen datos reales: ej. `size: 1, grade: "Competition"`, `size: 2, grade: "Military"`
- **70 entradas restantes** tienen datos correctos de size/grade
- **Causa raíz:** Los scrapers generan entradas duplicadas; el short-name hereda `?` y no se completa

### 2. Blueprints — Faltan blueprints de componentes y armas
- **1,591 blueprints** totales en `frontend/data/blueprints.json`
- **Solo 3 blueprints de componentes** detectados: "Main Powerplant" (x2), "SecureShield"
- **116 blueprints de armas de nave** (Omnisky, Revenant, Singe, C-788, AD4B/5B/6B, etc.)
- **Indicios:** Output classes (`powr_`, `cool_`, `shld_`, `qdrv_`, `radr_`) sugieren que existen items de componentes en el juego que podrían tener blueprints craftables (data debe venir de los scrapers)
- **Análisis de componentes en `_all_items.json`:** Los items contienen tipos de componente por nombre (`power plant`, `shield`, `cooler`, `quantum drive`, `radar`) — cruzar contra blueprints existentes

### 3. Items — Sin filtro por tipo/categoría
- **7,482 items** en `frontend/data/items.json` — SOLO campos: `id`, `name`, `Sold`
- En `sc_database_en.json` los items tienen `category` (`item` / `fps_weapon`) y `_weapon_type`, pero estos campos se pierden en el build que genera `frontend/data/items.json`
- **Clasificación posible por nombre:**
  - Armaduras: ~2,200 items (helmet, core, arms, legs, backpack, undersuit)
  - Ropa: ~1,500 items (shirt, pants, boots, jacket, etc.)
  - Liverties/Paints: ~938
  - Armas FPS: ~320
  - Items de misión: ~74
  - Comida/Bebida: ~64
  - Vehículos: ~39
  - Minerales/Materias primas: ~38
  - Herramientas: ~36
  - Munición: ~11
  - Componentes de nave: ~10
  - Sin clasificar: ~2,024

---

## Tareas

### T-001: Completar size/grade de componentes (backend)
**Agente:** database-engineer
**Prioridad:** alta
**Depende:** []
**Archivos:** `api/data/components.json`, `api/data/sc_database_en.json`, `scripts/build_integrated_db.py`
**Descripción:**
Corregir los 21 componentes duplicados que tienen `size: "?"` y `grade: "?"` en ambas bases de datos (components.json y sc_database_en.json).

**Acciones:**
1. En `api/data/components.json`: identificar las 21 entradas short-name con `size: "?"` y reemplazar con los valores reales de sus contrapartes full-name
2. En `api/data/sc_database_en.json`: igual que arriba, transferir valores de full-name a short-name
3. En `scripts/build_integrated_db.py`: agregar lógica de merge para que en futuros builds los short-name hereden datos de full-name automáticamente
4. Actualizar `frontend/data/components.json` con los datos corregidos
5. Regenerar `frontend/data/stats.json` si es necesario

**Criterios de éxito:**
- Zero componentes con `size: "?"` o `grade: "?"` en components.json
- Zero componentes con `size: "?"` o `grade: "?"` en sc_database_en.json
- El build script previene duplicados incompletos en futuros builds
- La UI de componentes muestra size y grade numéricos

---

### T-002: Agregar blueprint_unlock_map para componentes/armas faltantes (backend)
**Agente:** database-engineer
**Prioridad:** alta
**Depende:** []
**Archivos:** `scrapers/sc_data/blueprints_all.json`, `frontend/data/blueprints.json`, `frontend/data/blueprint_unlock_map.json`
**Descripción:**
Analizar los datos scrapeados para identificar blueprints de componentes y armas que existen en `blueprints_all.json` pero que no están siendo clasificados correctamente en la UI.

**Acciones:**
1. Escanear `blueprints_all.json` / `frontend/data/blueprints.json` por todos los blueprints con output class que contenga `powr_`, `cool_`, `shld_`, `qdrv_`, `radr_` (componentes) y tipos de arma
2. Verificar que todos los blueprints tengan entrada en `blueprint_unlock_map.json`
3. Verificar que los blueprints de componentes aparezcan en `frontend/data/blueprints.json` correctamente
4. Si faltan blueprints en los datos scrapeados, documentar qué componentes del juego existen sin blueprint craftable
5. Agregar cualquier blueprint faltante de componentes/armas a los archivos de datos

**Criterios de éxito:**
- Todos los blueprints de componentes existentes en los datos scrapeados aparecen correctamente
- Cruce validado: componentes en `components.json` vs. blueprints de componentes
- La UI permite ver y filtrar blueprints de componentes

---

### T-003: Clasificar items por tipo/categoría (backend/data)
**Agente:** database-engineer
**Prioridad:** alta
**Depende:** []
**Archivos:** `scripts/build_integrated_db.py`, `frontend/data/items.json`, `api/app.py`
**Descripción:**
Agregar clasificación de items por tipo (armadura, arma FPS, munición, herramienta, ropa, misión, comida, etc.) al build script y a los datos.

**Acciones:**
1. En `scripts/build_integrated_db.py`: agregar función `classify_item_type(name)` que analice el nombre del item y le asigne una categoría tipo:
   - `armor_helmet`, `armor_core`, `armor_arms`, `armor_legs`, `armor_backpack`
   - `undersuit`
   - `fps_weapon`
   - `ammo`
   - `tool`
   - `clothing`
   - `food_drink`
   - `mission_item`
   - `ship_component`
   - `ship_weapon`
   - `livery`
   - `vehicle`
   - `plushie`
   - `mineral_ore`
   - `other`
2. Agregar campo `item_type` a cada item durante el build
3. En `api/app.py` endpoint `/items`: agregar parámetro `?type=X` para filtrar por tipo
4. Ejecutar build para regenerar `frontend/data/items.json` con los nuevos campos

**Criterios de éxito:**
- Todos los items tienen campo `item_type` clasificado
- API soporta `GET /items?type=armor_helmet`
- Máximo ~2,024 items "other" (no clasificables por nombre)

---

### T-004: Filtro de tipo en UI de Items (frontend)
**Agente:** frontend-dev
**Prioridad:** alta
**Depende:** ["T-003"]
**Archivos:** `frontend/index.html`, `frontend/app.js`, `frontend/style.css`
**Descripción:**
Agregar dropdown de filtro por tipo/categoría en la página de Items y en el modal de detalle.

**Acciones:**
1. En `frontend/index.html`:
   - Agregar `<select id="filter-item-type">` dentro de `.filters-bar` en `#page-items`
   - Opciones: "Todas las categorías", "Armadura (Casco)", "Armadura (Torso)", "Armadura (Brazos)", "Armadura (Piernas)", "Armadura (Mochila)", "Undersuit", "Arma FPS", "Munición", "Herramienta", "Ropa", "Comida/Bebida", "Item de misión", "Componente de nave", "Livery", "Vehículo", "Mineral", "Plushie", "Otros"
   - Opciones de traducción para EN/ES

2. En `frontend/app.js` función `applyItemsFilters()`:
   - Agregar filtro por `item_type` del dropdown
   - Modificar `renderItemsPage()` para mostrar el `item_type`

3. En `frontend/app.js` modal de detalle:
   - Mostrar el `item_type` clasificado

4. En `frontend/style.css`:
   - Agregar badges de color por tipo de item (opcional)

**Criterios de éxito:**
- Dropdown visible con todas las categorías en la página de Items
- Filtrar por tipo funciona y actualiza la tabla
- Reset limpia el filtro de tipo
- Traducción ES/EN del dropdown y tipos

---

### T-005: Mostrar clasificación de items en tabla y modal (frontend)
**Agente:** frontend-dev
**Prioridad:** media
**Depende:** ["T-003", "T-004"]
**Archivos:** `frontend/app.js`, `frontend/style.css`
**Descripción:**
Mejorar la visualización de items con la nueva clasificación: badges visuales en la tabla y detalle completo en el modal.

**Acciones:**
1. Modificar columna "Tipo" en la tabla de items para mostrar un badge coloreado según tipo
2. Agregar mapeo de `item_type` → label legible (ES/EN): ej. `armor_helmet` → "Casco" / "Helmet"
3. En el modal de detalle de item, agregar sección con `item_type` clasificado
4. Hacer que la columna "Tipo" sea sorteable por la clasificación

**Criterios de éxito:**
- Badge de tipo visible en la tabla con color distintivo
- Modal muestra tipo clasificado
- Se puede ordenar por tipo en la tabla

---

### T-006: Sincronizar datos y probar integración (qa)
**Agente:** qa-engineer
**Prioridad:** alta
**Depende:** ["T-001", "T-002", "T-003", "T-004", "T-005"]
**Archivos:** (todos los modificados)
**Descripción:**
Ejecutar la app completa, verificar que todo funciona y que los datos están correctos.

**Acciones:**
1. Verificar los datos de componentes: ningún componente con `size: "?"` o `grade: "?"`
2. Verificar blueprints de componentes: que al menos existan los blueprints para componentes principales
3. Verificar items: que todos tengan `item_type` y que el filtro funcione
4. Verificar que no se rompieron secciones existentes (misiones, blueprints, armas, wikelo, facciones)
5. Verificar paginación, búsqueda y ordenamiento en items
6. Verificar que los datos estáticos (frontend/data/) estén sincronizados con la API

**Criterios de éxito:**
- No hay regresiones en funcionalidad existente
- Todos los checks de datos pasan
- API responde correctamente en todos los endpoints modificados

---

## Resumen de dependencias

```
T-001 (completar size/grade) ─────────────────┐
                                               ├── T-006 (QA integración)
T-002 (blueprints faltantes) ─────────────────┤
                                               │
T-003 (clasificar items backend) ──┬──── T-004 ┴── T-005 (frontend items)
                                    │              (badges)
                                    └── T-004 (filtro UI)
```

## Archivos modificados

| Archivo | Tareas |
|---------|--------|
| `api/data/components.json` | T-001 |
| `api/data/sc_database_en.json` | T-001 |
| `scripts/build_integrated_db.py` | T-001, T-003 |
| `frontend/data/components.json` | T-001 |
| `frontend/index.html` | T-004 |
| `frontend/app.js` | T-004, T-005 |
| `frontend/style.css` | T-005 |
| `api/app.py` | T-003 |

## Notas adicionales

- Los blueprints provienen de datos scrapeados del juego; si faltan blueprints de componentes, es porque no existen como craftable en el juego actual. El análisis debe cruzar los componentes existentes vs. blueprint output names.
- La clasificación de items por nombre tiene un margen de ~2,000 items "other" que no coinciden con patrones conocidos. Estos pueden clasificarse manualmente después o dejarse como "other".
- No modificar la lógica de carga de datos de la API (caché, lazy loading) — solo agregar nuevos filtros
