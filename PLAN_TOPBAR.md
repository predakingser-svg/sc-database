# Plan: Top bar con traducción, releases, feedback + fixes de errores

## Problemas

### Error 1: `getMissionTranslation is not defined`
- La función se definió en medio del código pero no está disponible en el scope donde `renderMissionPage` la llama
- Causa: la función se anidó dentro de otro bloque al hacer reemplazos de texto
- Fix: mover la función al inicio de app.js, antes de que cualquier otra función la necesite

### Error 2: `container is not defined` en renderWikelo
- Bug recurrente: la variable `container` no se declara antes de usarse en renderWikelo
- Fix: declarar `const container = document.getElementById('mainContent');` al inicio de renderWikelo

## Nuevo diseño: Top bar

**Estado actual:**
- Lang toggle está en sidebar (parte inferior)
- Changelog/Releases es una página en sidebar
- Feedback es una subsección dentro de Novedades

**Estado deseado (lo que pide Señor):**
- Botón de traducción ES/EN en la barra superior donde está el status de conexión API
- Releases y Feedback también en la barra superior
- Que sea visible y accesible desde cualquier página

## Implementación

### Paso 1: Mover funciones al scope global
- Mover `getMissionTranslation()` y `loadTranslations()` al inicio de app.js
- Declarar `fullTranslations`, `contractorTranslations` y `currentLang` antes que todo

### Paso 2: Fix `container is not defined`
- Agregar `const container = document.getElementById('mainContent');` dentro de renderWikelo

### Paso 3: Top bar redesign
- Modificar el HTML `index.html` y el CSS `style.css`
- La top bar tendrá:
  - Izquierda: logo + nombre
  - Centro: status de conexión API
  - Derecha: 🇪🇸 ES / 🇬🇧 EN toggle, 🆕 Releases, 💬 Feedback
- El botón de traducción será un toggle visual con banderas
- Releases abrirá el changelog en un modal
- Feedback abrirá un modal con enlaces a GitHub y email

### Paso 4: Deploy y verificación
- Push a GitHub Pages
- Recargar y verificar que no hay errores en consola
- Testear toggle, releases y feedback desde la top bar
