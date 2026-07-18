# Plan: Traducción UI y Contenido (Fase E)

## Objetivo
Las misiones se ven en inglés → traducirlas al español usando el global.ini.
Añadir: toggle ES/EN, accesos rápidos, changelog, feedback.

## Paso 1 — Endpoint `/translate/missions` en API
- El global.ini tiene +2,000 títulos y +4,300 descripciones en español organizados por contratista (Headhunters, Covalex, Foxwell, Vaughn, CFP, etc.)
- Crear endpoint que devuelva SOLO las traducciones relevantes a misiones
- `GET /translate/missions` → `{ contractor: { titles: [...], descriptions: [...] } }`
- Agrupar por contractor para que el frontend pueda buscar fácilmente

## Paso 2 — Frontend: reemplazar títulos en español
- Cuando el toggle esté en ES, para cada misión buscar si hay un título del contratista que coincida
- NO mapear 1:1 (no es posible), sino mostrar el listado de traducciones del contratista
- Ej: Misión de Headhunters → mostrar los títulos de Headhunters del global.ini

## Paso 3 — Traducción de Wikelo
- Los contratos Wikelo están en inglés (armas, naves, armaduras)
- Extraer nombres del global.ini que coincidan con items de Wikelo
- Endpoint `/translate/wikelo` que intente traducir cada contrato

## Paso 4 — Toggle ES/EN funcional
- Ya existe el botón en sidebar, pero debe recargar datos con `?lang=es` o `?lang=en`
- Al cambiar idioma, re-fetch todos los datos activos con el nuevo lang
- Mostrar original (EN) por defecto, ES cuando se activa

## Paso 5 — Acceso rápido "Componentes de nave"
- En el dashboard, abajo de los enlaces rápidos actuales, añadir acceso a /components
- Ya existe la página de componentes, solo agregar enlace

## Paso 6 — Changelog, Releases, Feedback
- Nueva página "🆕 Novedades" en sidebar
- Changelog: mostrar últimas actualizaciones (fechas, cambios)
- Feedback: enlace a GitHub Issues o formulario
- Releases: enlace al repo de GitHub
- Datos servidos desde `api/data/changelog.json`

## Paso 7 — Deploy
- Push a GitHub Pages
- Verificar en túnel Serveo
- Testear toggle ES/EN
