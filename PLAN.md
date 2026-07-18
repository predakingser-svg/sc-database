# Plan: Star Citizen Database — Web App

## Objetivo
Plataforma web funcional que centralice TODOS los datos scrapeados de Star Citizen (misiones, blueprints, armas, naves, componentes, facciones, contratos Wikelo, items) en una interfaz rápida, buscable y filtrable.

## Stack Tecnológico
- **Frontend:** HTML + CSS + JavaScript vanilla (sin frameworks pesados)
- **Backend:** Python + Flask (API ligera para servir datos)
- **Datos:** JSON locales (los scrapers ya generaron todo)
- **Host:** Netlify (frontend estático) + el backend en el mismo servidor o en otro lado
- **Despliegue:** Netlify (frontend) + GCP (API si hace falta)

---

## Fase 1 — Base de Datos API (Python/Flask)

Orden de implementación:

### 1.1 API REST básica con Flask
- Endpoint único que sirva todos los datos
- `/api/search?q=termino` — búsqueda global
- `/api/missions` — lista paginada de misiones con filtros
- `/api/blueprints` — lista paginada de blueprints con filtros
- `/api/items` — catálogo completo

### 1.2 Endpoints específicos
- GET `/api/missions?faction=X&system=Y&has_blueprints=true`
- GET `/api/blueprints?category=shield&min_ingredients=3`
- GET `/api/stats` — resumen de cuentas
- GET `/api/weapons` — armas de nave con stats y filtros (size, type, dps)
- GET `/api/wikelo` — contratos de Wikelo

### 1.3 Caché
- Los JSON se cargan en memoria al iniciar
- Sin base de datos externa — todo desde los archivos JSON

---

## Fase 2 — Frontend HTML/CSS/JS

### 2.1 Estructura de páginas
Cada página se genera con JS desde los datos de la API, sin recargar.

Páginas planificadas:
1. **Inicio/Dashboard** — stats rápidas, búsqueda global, enlaces
2. **Misiones** — tabla completa filtrando por facción, sistema, tipo, legalidad, blueprint
3. **Blueprints** — catálogo de planos, filtro por ingredientes, output, misiones que lo desbloquean
4. **Armas de nave** — tabla con stats (size, DPS, alpha, range, firerate, precio)
5. **Wikelo** — todos los contratos con inputs/rewards
6. **Facciones** — lista con sus misiones asociadas
7. **Items** — catálogo completo buscable

### 2.2 Diseño
- Tema oscuro (Star Citizen vibe)
- Layout responsive (funciona en móvil)
- Barra de búsqueda global siempre visible
- Sidebar con navegación por categorías
- Tablas con ordenamiento por columnas
- Tooltips con detalles al hover

### 2.3 Funcionalidades clave
- Búsqueda en tiempo real con autocomplete
- Filtros combinados (facción + sistema + tipo + blueprints)
- Ordenamiento por cualquier columna
- Vista detalle de cada misión/blueprint/item al hacer clic
- Enlaces cruzados (de un blueprint a las misiones que lo dan, de una misión a su facción)

---

## Fase 3 — Despliegue y Automatización

### 3.1 Actualización de datos
- Script que corre el scraper periódicamente
- Los JSON se regeneran y se suben

### 3.2 Host
- Frontend estático → Netlify
- API Flask → mismo servidor GCP o Netlify Functions

---

## Orden de Implementación (Prioridades)

### Paso 1 — API básica (Flask)
- Montar servidor con todos los endpoints
- Probar que sirve datos correctamente
- Implementar búsqueda y filtros

### Paso 2 — Página principal
- HTML base con layout oscuro, sidebar, barra de búsqueda
- Dashboard con stats y cards de acceso rápido

### Paso 3 — Página de misiones
- Tabla completa con las 1,786 misiones
- Filtros: facción, sistema, tipo, legalidad, blueprints
- Vista detalle al hacer clic

### Paso 4 — Página de blueprints
- Catálogo de 1,591 planos
- Filtros: ingredientes, output, misiones que lo dan
- Vista detalle

### Paso 5 — Páginas secundarias
- Armas de nave
- Wikelo
- Facciones
- Items

### Paso 6 — Pulido y refinamiento

#### 6.1 Enlaces cruzados entre páginas
- Modal de misión: link a facción, link a misiones similares
- Modal de blueprint: link a misiones que lo desbloquean (por UUID)
- Modal de arma: link a tiendas
- Quick links desde dashboard llevan a la página correspondiente con filtro aplicado

#### 6.2 Tooltips y hover states
- Tooltip en badges (BP, ilegal, legal) con descripción
- Hover en filas de tabla muestra indicador visual
- Tooltip en nombres de facción con detalle rápido

#### 6.3 Búsqueda global mejorada
- Navegación con teclado (flechas + Enter) en dropdown
- Secciones con iconos y conteo de resultados
- Debounce optimizado (400ms)

#### 6.4 Responsive design completo
- Sidebar colapsable con overlay en móvil
- Tablas con scroll horizontal en móvil
- Filters bar se apila verticalmente en pantallas pequeñas
- Stats grid adaptativo (2 columnas en móvil)

#### 6.5 Optimización de carga
- Loading skeletons mientras se cargan datos
- Caché en memoria (no recargar datos al navegar entre páginas)
- Badges de cuenta actualizados en sidebar
- Indicador de estado de API (online/offline)

---

## Resumen de Datos a Visualizar

| Dataset | Registros | Página |
|---------|-----------|--------|
| Misiones individuales | 1,786 | Misiones |
| Blueprints | 1,591 | Blueprints |
| Items catálogo | 7,733 | Items |
| Armas de nave (con stats) | 137 | Armas |
| Contratos Wikelo | 51 | Wikelo |
| Facciones | 31 | Facciones |
| Sistemas | 3 (Stanton, Pyro, Nyx) | — |
