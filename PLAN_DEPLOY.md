# Plan de Despliegue — Star Citizen Database (Fase 3)

## Objetivo
Poner en producción el frontend y la API de Star Citizen Database, accesible desde internet.

## Arquitectura
```
Usuario → Netlify (frontend estático) → API en GCP (server.py)
                         ↓
                index.html + app.js + style.css
```

## Stack
- **Frontend:** Netlify (hosting estático, CDN global, HTTPS automático)
- **API:** server.py en GCP (el mismo servidor donde corre OpenClaw)
- **Datos:** ~113MB de JSON servidos desde memoria por la API Flask

## Pasos

### Paso 1 — Configurar frontend para Netlify
- Crear `netlify.toml` con reglas de redirect:
  - `/api/*` → redirigir a la API en GCP
  - `/*` → servir archivos estáticos (SPA fallback)
- El frontend actual usa `apiFetch()` con BASE_URL relativa
- Configurar para que en prod use la URL pública de la API

### Paso 2 — Subir frontend a Netlify
- `netlify deploy --prod --dir=frontend/`
- Obtener URL pública (ej: https://star-citizen-db.netlify.app)

### Paso 3 — Configurar API en GCP
- server.py ya unifica frontend + API en un proceso
- Pero en Netlify deploy, el frontend va separado
- Ejecutar server.py apuntando solo a la API (sin frontend)
- Usar systemd o screen para mantener el proceso vivo
- Puerto: 8080 (o el que esté disponible)

### Paso 4 — Probar integración
- Verificar que frontend en Netlify se comunica con API en GCP
- CORS ya está configurado en app.py
- Probar búsquedas, filtros, carga de datos

## Consideraciones
- La API carga ~113MB de datos en RAM al iniciar
- Tiempo de carga inicial: ~2-4 segundos
- GCP tiene recursos suficientes (OpenClaw ya corre aquí)
- Sin base de datos externa — todo desde JSON en memoria
- Netlify: hosting gratis con 100GB de ancho de banda/mes

## Rollback
- Netlify: `netlify deploy --prod --dir=anterior/` o redeploy anterior
- API: restart server.py con versión anterior del código
