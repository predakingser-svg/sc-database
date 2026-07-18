# Plan: Fix toggle ES/GB + Feedback card + Changelog popup bilingüe

## Diagnóstico inicial

### Problema 1: Botón de idioma no funciona
- El toggleLang() existe pero:
  - `currentLang` se inicializa desde localStorage pero `localStorage.getItem('sc_lang')` puede devolver `null`
  - `applyLang()` recorre el DOM pero como el HTML ya está en español, al cambiar a EN se reemplazan textos... ¿y al volver a ES? Llama a `navigateTo(currentPage)` que recarga la página
  - Posible bug: `applyLang()` falla silenciosamente
- **Fix:** Depurar toggleLang → que realmente muestre ES o EN y recargue la página al cambiar

### Problema 2: Feedback debe mostrar tarjeta en página (no modal)
- Actualmente `openFeedback()` crea un modal overlay
- Debe abrir la página de Novedades o mostrar una tarjeta dentro del contenido principal
- **Fix:** `openFeedback()` → abre la página de changelog con sección de feedback visible

### Problema 3: Changelog/Releases en ventana emergente
- Actualmente es una página aparte
- Debe ser un popup/emerging window que se abra desde la top bar
- **Fix:** Crear `openChangelog()` que muestre un modal con todo el changelog y releases

### Problema 4: Changelog completo bilingüe
- Agregar todas las versiones desde la creación:
  - 1.0.0: Lanzamiento inicial (API, misiones, blueprints, armas, wikelo)
  - 1.1.0: Componentes y minerales expandidos (40→91 componentes, 26 minerales)
  - 2.0.0: Traducciones global.ini + toggle ES/EN
  - 2.1.0: Fase D - endpoint /translate, contractor translations
  - 2.2.0: Fase E - Top bar, sidebar fixes, components page
  - 2.3.0: Fixes - currentLang, loadComponents, string map
- Cada versión en ambos idiomas: `título_es` y `title_en`

## Orden de ejecución

1. Fix toggleLang() — asegurar que cambie idioma y recargue correctamente
2. openFeedback() → tarjeta en changelog page
3. openChangelog() → ventana emergente modal
4. Actualizar changelog.json con versión completa bilingüe
5. Push y verificar
