# Plan Reorganizado: Fixes Finales

## Resumen de pendientes

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Sidebar: solo top bar para traducción, releases, feedback | ✅ Hecho |
| 2 | Toggle ES/EN traduce toda la página | ⚠️ Parcial (string map listo pero botón no ejecuta) |
| 3 | Feedback como tarjeta con contacto | ❌ Pendiente |
| 4 | Changelog/Releases en ventana emergente (popup modal) | ❌ Pendiente |
| 5 | Changelog bilingüe completo desde creación | ❌ Pendiente |
| 6 | Base de datos integrada ES + EN | ✅ Hecho |

## Pasos a ejecutar (en orden)

### Paso A — Fix toggle ES/GB
- `toggleLang()` existe pero el botón no actualiza visiblemente ni recarga
- Simplificar: al cambiar idioma, recargar página completa con `location.reload()`
- El botón debe mostrar claramente 🇪🇸 ES o 🇬🇧 GB
- `currentLang` guardado en localStorage, al recargar se aplica desde el principio
- Las cadenas estáticas del HTML se traducen con `applyLang()` al cargar la página

### Paso B — Feedback como tarjeta en página
- Actualmente `openFeedback()` crea modal overlay
- Cambiar: `openFeedback()` abre la página de Novedades y muestra tarjeta de contacto
- O mejor: mostrar tarjeta de contacto como contenido en la página principal
- Datos: GitHub Issues, email, enlaces directos

### Paso C — Changelog/Releases en ventana emergente
- Actualmente es página aparte en `renderChangelog()`
- Cambiar: `openChangelog()` que abre modal emergente con el historial completo
- El modal debe tener scroll, cerrar con ✕ o click fuera
- Incluir todas las versiones desde v1.0.0

### Paso D — Changelog bilingüe completo
- Actualizar `changelog.json` con TODAS las versiones desde la creación
- Cada versión con `title_es`, `title_en`, `changes_es`, `changes_en`
- Versiones a incluir:
  - v1.0.0: Lanzamiento inicial (scrapers, API, frontend)
  - v1.1.0: Componentes 40→91, minerales Pyro
  - v2.0.0: Global.ini parser, 89k traducciones, contractor translations
  - v2.1.0: Traducciones por contractor, endpoint /translate
  - v2.2.0: Top bar, sidebar fixes, componentes quick access
  - v2.3.0: Fix currentLang, loadComponents, string map ES/EN
  - v2.4.0: Base de datos integrada ES (21.6MB) + EN (20.8MB)

### Paso E — Integrar base de datos unificada en frontend
- Las bases `sc_database_es.json` (21.6MB) y `sc_database_en.json` (20.8MB) ya existen
- Actualmente el frontend hace fetch a endpoints separados: `/missions`, `/blueprints`, `/weapons`
- En lugar de eso, cargar la base completa al iniciar según el idioma:
  - `currentLang === 'es'` → cargar `sc_database_es.json`
  - `currentLang === 'en'` → cargar `sc_database_en.json`
- Endpoint único: `GET /database?lang=es` que sirve el archivo completo
- Frontend: `loadDatabase()` al iniciar que reemplaza todas las llamadas individuales
- Beneficio: un solo fetch masivo, datos precargados, sin múltiples requests
- Las páginas individuales (Misiones, Blueprints, etc.) leen de la cache local

## Orden de implementación
1. A → Fix toggle ES/GB (recarga página al cambiar idioma)
2. B → Feedback como tarjeta con contacto
3. C → Changelog/Releases en ventana emergente (popup modal)
4. D → Changelog bilingüe completo desde creación
5. E → Integrar base de datos unificada en frontend
