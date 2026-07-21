# Plan: Reestructuración de Star Citizen Database

## Problemas identificados
1. **Items (31,440) sin categorizar** — mezcla piezas de naves, armas FPS, armaduras, componentes diversos. Sin filtros útiles.
2. **Minerales no cargan** — 295 registros en DB pero frontend muestra "Cargando..."
3. **Faltan Contratos** — 647 contratos en DB sin página/sección
4. **Wikelo incompleto** — solo 51 registros. Datos reales del wiki disponibles.
5. **Falta sección Naves** — 1,058 naves sin página dedicada

## Orden de implementación

### Fase 1: Categorización de Items (crítica)
**Agente:** backend-dev + database-engineer
**Qué:** Clasificar 31,440 items en categorías reales del juego:
- `armor` — cascos, petos, brazos, piernas, mochilas
- `fps_weapon` — armas de fuego (pistolas, rifles, escopetas, SMGs, LMGs, lanzamisiles)
- `weapon_attachment` — miras, silenciadores, cargadores, baterías
- `tool` — herramientas de minería, reparación, multitool, etc.
- `consumable` — comida, bebidas, medicinas
- `clothing` — ropa, sombreros, camisetas
- `component` — power plants, shields, coolers, QT drives (los que tienen stats)
- `ship_weapon` — cañones, repeaters, gatlings de nave
- `ship_part` — piezas de nave (wing, fan, thruster, etc.)
- `misc` — todo lo demás que no encaja
**Entregable:** items.json categorizado + frontend con filtros por categoría

### Fase 2: Arreglar Minerales (alta)
**Agente:** frontend-dev
**Qué:** Debuggear `loadMinerals()` para que cargue los 295 minerales correctamente
**Entregable:** minerales funcionales en la página

### Fase 3: Página de Contratos (alta)
**Agente:** frontend-dev
**Qué:** Nueva sección "Contratos" con tabla de 647 contratos (tipo, pago, reputación, sistema)
**Entregable:** página de contratos en frontend

### Fase 4: Expansión de Wikelo (alta)
**Agente:** backend-dev + frontend-dev
**Qué:** 
- Parsear datos del wiki de Wikelo (~200+ trades reales)
- Categorizar: Weapons, Armor, Vehicles, Ships, Miscellaneous
- Agregar subsecciones dentro de Wikelo
**Entregable:** wikelo.json expandido + frontend con subcategorías

### Fase 5: Página de Naves (media)
**Agente:** frontend-dev
**Qué:** Nueva sección "Naves" con tabla de 1,058 naves (nombre, fabricante, tamaño, HP, velocidad, carga)
**Entregable:** página de naves funcional

## Criterios de aceptación generales
- Cada sección debe cargar datos sin errores de consola
- Los filtros deben funcionar correctamente
- La navegación entre secciones debe ser fluida
- Los datos deben ser correctos (verificables contra el juego)
- Items irrelevantes (piezas, fans, etc.) deben estar en su categoría correcta, no en la general

## Archivos a modificar
- `frontend/app.js` — nuevas secciones + fix minerals
- `frontend/index.html` — nuevos items nav + páginas
- `frontend/data/items.json` — categorizado
- `frontend/data/wikelo.json` — expandido
- `sc_database_es.json` — actualizado con categorías
