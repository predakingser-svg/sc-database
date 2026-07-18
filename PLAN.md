# Star Citizen Database — Plan y Resolución

## 1. Conexión Frontend-API
- **Problema:** fetch sin timeout → status indicator colgado en "conectando"
- **Fix aplicado:** AbortController con timeout de 5s en apiFetch()
- **Pendiente:** verificar que funcione desde el túnel

## 2. Servidor y API
- Servidor Flask en puerto 8080 (background con nohup)
- API integrada en el mismo proceso
- Túnel localtunnel para acceso externo

## 3. Acceso rápido — Minerales
- Añadir link a minerales en el dashboard (quick links)
- Misma estructura que "Catálogo Wikelo" y "Componentes de naves"

## 4. Background
- Servidor: nohup + disown
- Comandos cortos para ediciones/consultas
- Procesos largos con background=true
