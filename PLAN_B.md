# Plan B — Netlify + GCP

## Objetivo
Desplegar frontend en Netlify (estático, sin túnel) y mantener API en GCP.

## Problema actual
localtunnel se cae al reiniciar el servidor y da Bad Gateway. El túnel no es estable.

## Solución
Separar frontend y API en dos servicios independientes.

## Pasos

### 1. Autenticar Netlify
- `netlify login` necesita abrir un navegador para autorizar
- Como estoy en terminal sin navegador, necesito un token de acceso
- Opción A: generar token desde netlify.com → `netlify deploy --auth $TOKEN`
- Opción B: el usuario genera el token y me lo proporciona

### 2. Actualizar frontend para API externa
- Cambiar `const API = '';` a `const API = 'http://35.253.228.176:8080';`
- La API queda en el servidor GCP (IP pública, puerto 8080)
- Habilitar CORS en Flask para permitir peticiones desde Netlify

### 3. Desplegar frontend a Netlify
- `netlify deploy --dir=frontend --prod`
- Esto sube index.html, app.js, style.css a Netlify
- Netlify provee URL pública (ej: sc-database.netlify.app)

### 4. Abrir puerto 8080 en firewall de GCP
- La API necesita ser accesible desde internet
- Usar `gcloud compute firewall-rules create allow-api --allow tcp:8080`
- O abrir manualmente desde consola GCP

### 5. Verificar CORS
- Flask ya tiene `CORS(app)` habilitado
- Asegurar que acepte peticiones del dominio de Netlify

### 6. Testear
- Acceder a URL de Netlify
- Verificar que el frontend carga y la API responde
- Status indicator debe mostrar verde "Conectado"

## Tiempo estimado: 15-30 minutos
