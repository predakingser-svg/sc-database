# Plan: Traducción completa + Base de datos integrada

## Problemas detectados
1. Traducción ES/EN solo aplica a títulos de misión → debe aplicar a **toda** la página
2. Sidebar tiene "Traducciones" y "Novedades" → deben estar solo en la top bar
3. No hay una base de datos unificada que combine datos scrapeados + traducciones del global.ini

## Paso 1 — Traducción completa de la página (ES/EN)

**Estado actual:** El toggle `currentLang` solo afecta `getMissionTranslation()` para títulos de misiones.

**Estado deseado:** Cuando `currentLang === 'es'`, TODA la página se muestra en español:
- Sidebar: Dashboard→Panel, Misiones→Misiones, Blueprints→Planos, Armas→Armas, Wikelo→Wikelo, Facciones→Facciones, Items→Ítems, Componentes→Componentes
- Botones y filtros: "Buscar..."→"Buscar...", "Filtrar por..."→"Filtrar por..."
- Tablas: encabezados traducidos (Name→Nombre, Type→Tipo, Size→Tamaño, Price→Precio)
- Badges: Common→Común, Rare→Raro, Epic→Épico, Legendary→Legendario
- Estados: Loading→Cargando, Error→Error, Ready→Listo
- Data dinámica: tipos de componente, rareza de minerales, estados de misión

**Implementación:**
- Expandir el diccionario `_translations` en app.js con TODOS los textos visibles del frontend
- Cada render function debe usar `__(texto_ingles)` para todos los textos fijos
- Función `reloadPage()` que al cambiar idioma recarga todos los datos activos

## Paso 2 — Limpiar sidebar

- Quitar "Traducciones" (🌐) del menú lateral
- Quitar "Novedades" (🆕) del menú lateral
- Mantener solo en top bar: 🇪🇸 toggle, 🆕, 💬

## Paso 3 — Base de datos integrada

**Estado actual:** Datos separados:
- `api/data/components.json` — 91 componentes
- `api/data/minerals.json` — 26 minerales
- `api/data/translations_full.json` — 89,529 entradas de global.ini
- `api/data/contractor_translations.json` — 227 contractors
- `scrapers/sc_data/` — misiones, blueprints, armas, items, wikelo

**Estado deseado:** Una base de datos `sc_database_integrated.json` que contenga:
```json
{
  "version": "4.9.0-live",
  "translations": { "89,529 entradas del global.ini" },
  "missions": [ "1,786 misiones con campo _translated_title y _translated_description" ],
  "blueprints": [ "1,591 planos con nombres traducidos" ],
  "weapons": [ "137 armas con nombres traducidos" ],
  "components": [ "91 componentes" ],
  "minerals": [ "26 minerales" ],
  "wikelo": [ "51 contratos con descripciones traducidas" ],
  "factions": [ "facciones con descripciones traducidas" ]
}
```

**Proceso:**
1. Script `scripts/build_integrated_db.py` que lea todos los datos existentes
2. Para cada misión, buscar su contractor en `contractor_translations` y asignar traducciones
3. Para cada blueprint, buscar nombre de output en `translations_full`
4. Para cada arma, buscar nombre en `translations_full`
5. Para cada contrato Wikelo, buscar coincidencias por nombre de item
6. Guardar como `api/data/sc_database_integrated.json`

## Paso 4 — Deploy

- Push a GitHub Pages
- Verificar toggle ES/EN en toda la página
- Verificar base de datos integrada en `/database` endpoint
