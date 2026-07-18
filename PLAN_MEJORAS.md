# Plan de mejoras — SC Database

## Regla: No tocar la conexión API ni el frontend existente

## Problemas a resolver

### 1. Minerales — solo locaciones de Stanton
**Causa:** el archivo `minerals_compiler.py` solo tiene ubicaciones de Stanton (Aberdeen, Arial, Cellin, Daymar, etc.)
**Solución:** añadir ubicaciones de Pyro y Nyx al compilador y regenerar minerals.json

**Pasos:**
1. Investigar qué minerales se encuentran en Pyro y Nyx
2. Añadir esas locaciones al minerals_compiler.py
3. Regenerar api/data/minerals.json
4. Verificar que el frontend muestre las nuevas locaciones

**Datos pendientes (investigar):**
- Pyro: Bloom, Ruin Station, Orbituary, Checkmate, Gaslight — qué minerales hay
- Nyx: QV Extraction Stations — qué minerales hay

### 2. Wikelo — la página no carga
**Causa probable:** la data de wikelo viene de `wikelo_catalog.json` en scrapers/sc_data/. Puede que:
- El archivo no se esté cargando en app.py (ruta incorrecta)
- El endpoint `/wikelo` no está devolviendo los datos correctamente
- El frontend está procesando mal la respuesta

**Diagnóstico (sin tocar código):**
1. Verificar que `wikelo_catalog.json` existe en scrapers/sc_data/
2. Verificar cuántos contratos carga la API (GET /wikelo debe devolver datos)
3. Verificar qué error da el frontend al cargar Wikelo

**Solución según el diagnóstico:**
- Si falta el archivo → recrearlo con el scraper
- Si la ruta está mal → corregir la carga en app.py
- Si el frontend falla → ajustar el renderizado

## Orden de implementación
1. NO tocar API connection ni frontend
2. Diagnosticar Wikelo (solo consultas)
3. Presentar diagnóstico
4. Ejecutar correcciones según diagnóstico
5. Añadir ubicaciones de Pyro/Nyx a minerales
