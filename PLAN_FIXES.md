# Plan: Corrección de errores y organización del código

## Diagnóstico de errores

### Error 1: `currentLang is not defined` (app.js:12)
- `getMissionTranslation()` fue movida al inicio del archivo (scope global)
- Pero `currentLang` se declara después, en medio del archivo
- **Fix:** Mover `let currentLang = 'es';` al inicio del archivo, ANTES de las funciones que lo usan

### Error 2: Componentes vacío
- El endpoint `/components` devuelve 91 componentes (verificado)
- El frontend tiene `renderComponentsPage()` pero quizás no carga los datos
- **Fix:** Verificar que `loadAndRenderMissions`-style function para componentes exista y llame al endpoint

### Error 3: `toggleLang is not defined` (index.html:85)
- `toggleLang()` está definida en `app.js` pero anidada dentro de otro bloque de código
- El onclick del HTML no la encuentra porque no es global
- **Fix:** Mover `toggleLang()` al scope global, fuera de cualquier bloque

### Error 4: `openFeedback is not defined` (index.html:89)
- Mismo problema: la función se definió dentro de un bloque de reemplazo de texto
- **Fix:** Mover `openFeedback()` al scope global

### Error 5: Releases en acceso rápido duplicado
- Cuando se hace clic en el botón de traducción o releases, el botón de "Novedades" aparece en el menú de acceso rápido
- **Fix:** Eliminar el quick-link de Novedades del dashboard en index.html (solo dejar los originales)

## Orden de implementación

1. Reorganizar variables globales (`currentLang`, `fullTranslations`, etc.) al inicio de app.js
2. Mover funciones globales al scope superior: `getMissionTranslation()`, `toggleLang()`, `openFeedback()`
3. Verificar `renderComponentsPage()` y `loadComponents()` 
4. Eliminar quick-link de Novedades del dashboard en index.html
5. Probar que no haya errores en consola
6. Push a GitHub Pages
