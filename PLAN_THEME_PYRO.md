# PLAN: Diseño estilo Pyro para SC Database

## Objetivo
Implementar un sistema de temas que permita cambiar entre el tema actual **Stanton** (azul/limpio/corporativo) y un nuevo tema **Pyro** (rojo oxidado/naranja/ámbar — hostil, peligroso, fronteirizo). El tema Pyro debe reflejar la estética del sistema Pyro de Star Citizen: desértico, criminal, sin ley, con elementos visuales de fuego, polvo y peligro.

---

## Diagnóstico inicial del proyecto

### Arquitectura actual
- **Frontend**: Vanilla HTML + CSS + JS (~942 líneas CSS)
- **Tema**: Variables CSS en `:root`, tema oscuro con acentos azules (`#4fc3f7` accent, `#4a9eff` blue)
- **Sin frameworks UI** — no hay Tailwind, Bootstrap, ni sistema de temas
- **Deploy**: Cloudflare Pages vía `frontend/_worker.js`
- **Estructura CSS**: Un solo archivo `style.css` con todo

### Variables CSS actuales (a reemplazar/con-extender)
```css
:root {
    --bg-primary: #0a0a0f;
    --bg-secondary: #12121a;
    --bg-card: #1a1a25;
    --bg-hover: #22223a;
    --border: #2a2a3a;
    --text-primary: #e0e0e0;
    --text-secondary: #8888aa;
    --text-muted: #555577;
    --accent: #4fc3f7;           /* ← azul Stanton */
    --accent-dim: #1a3a4a;       /* ← azul oscuro Stanton */
    --success: #66bb6a;
    --warning: #ffa726;
    --danger: #ef5350;
    --sidebar-width: 240px;
    --topbar-height: 60px;
}
```

### Componentes que usan variables de color
1. **Sidebar**: `--accent`, `--accent-dim`, `--border`, `--bg-secondary`
2. **Topbar**: `--bg-secondary`, `--border`
3. **Stat Cards**: `--accent` (valor), `--bg-card`, `--border`
4. **Data Tables**: `--accent` (th hover), `--accent-dim` (badges)
5. **Badges**: `.badge-bp` (usa `--accent-dim` y `--accent`), `.badge-illegal` (usa `--danger`), `.badge-legal` (usa `--success`)
6. **Pagination**: `--accent-dim`, `--accent`
7. **Filters**: `--accent` (focus), `--accent` (checkbox)
8. **Quick Links**: `--accent` (hover border)
9. **Modals**: `--bg-card`, `--border`
10. **Charts**: Bar colors hardcodeadas por sistema (Stanton=azul, Pyro=rojo, Nyx=púrpura)
11. **Catalog cards**: `--accent` (hover)
12. **Category badges**: Hardcodeados con colores específicos
13. **CSS-only card tables**: `--accent` (hover border)
14. **Scroll-to-top**: `--accent-dim`, `--accent`
15. **Loading indicator**: `--accent`

### Componentes con colores hardcodeados (requieren revisión)
- `.system-Stanton .chart-bar-fill { background: #4fc3f7; }`
- `.system-Pyro .chart-bar-fill { background: #ef5350; }`
- `.system-Nyx .chart-bar-fill { background: #ab47bc; }`
- `.cat-Bounty_Hunter .chart-bar-fill { background: #4fc3f7; }`
- `.cat-Assassination .chart-bar-fill { background: #ef5350; }`
- `.cat-Hauling .chart-bar-fill { background: #66bb6a; }`
- `.cat-Security .chart-bar-fill { background: #ffa726; }`
- `.cat-Investigation .chart-bar-fill { background: #ab47bc; }`
- `.cat-Mining .chart-bar-fill { background: #8d6e63; }`
- `.cat-Salvage .chart-bar-fill { background: #78909c; }`
- `.cat-Other .chart-bar-fill { background: #5c6bc0; }`
- `.cat-Recovery .chart-bar-fill { background: #26c6da; }`
- `.comp-badge.ct-PowerPlant`, `.ct-Shield`, `.ct-Cooler`, `.ct-QuantumDrive`, `.ct-Radar` — colores fijos
- `.badge-type-*` — ~15 clases con colores hardcodeados
- `.bp-cat-*` — ~11 clases con colores hardcodeados
- `.kofi-link`, `.kofi-banner`, `.kofi-btn` — colores rojos hardcodeados (estos pueden quedar)

### Iconos/emoji en el HTML
- Sidebar nav: 📊, 📋, 🔧, 🔫, 🛸, 🏛️, 📦, ⚙️
- Topbar: 🇪🇸/🇬🇧, 🆕, 💬
- Dashboard: ☕ (kofi), 🎯 (quick links), ⚔️, 💥, 🛸, ⚙️
- Charts: Sin resultados
- Footer: ⚡

---

## Estrategia de implementación

### Enfoque: Sistema CSS nativo con `[data-theme="pyro"]`

Aprovechar que el HTML ya tiene `data-theme="dark"` en `<html>`. Extender con un nuevo valor `"pyro"` mediante un toggle en la UI. Esto permite:

1. **No duplicar CSS** — usar el mismo archivo, solo agregar bloque `[data-theme="pyro"]` con variables override
2. **Toggle instantáneo** — solo cambiar `data-theme` attribute
3. **Persistencia** — guardar preferencia en `localStorage`
4. **Fácil mantenimiento** — un solo lugar para definir colores del tema

### Paleta de color Pyro

| Variable | Color | Descripción |
|----------|-------|-------------|
| `--bg-primary` | `#0a0808` | Casi negro, tinte carbón |
| `--bg-secondary` | `#14100d` | Marrón oscuro humo |
| `--bg-card` | `#1c1410` | Marrón card |
| `--bg-hover` | `#261a14` | Marrón hover |
| `--border` | `#332218` | Borde óxido oscuro |
| `--text-primary` | `#e0d5cc` | Beige claro |
| `--text-secondary` | `#a08878` | Marrón grisáceo |
| `--text-muted` | `#6a5545` | Marrón apagado |
| `--accent` | `#ff6b35` | Naranja quemado (Pyro accent) |
| `--accent-dim` | `#3d1e0e` | Naranja oscuro |
| `--success` | `#66bb6a` | Se mantiene (info importante) |
| `--warning` | `#ffa726` | Se mantiene (info importante) |
| `--danger` | `#ef5350` | Se mantiene (info importante) |
| `--pyro-glow` | `rgba(255,107,53,0.15)` | Glow naranja para hover/shadow |
| `--pyro-glow-strong` | `rgba(255,107,53,0.25)` | Glow más intenso |

---

## Tareas detalladas

### Fase 0: Preparación y scaffolding

#### T-0.1: Crear estructura de tema en CSS
**Archivo:** `frontend/style.css`
**Descripción:** Agregar bloque `[data-theme="pyro"]` con todas las variables CSS override.
**Detalles:**
- Copiar todo el bloque `:root` como `[data-theme="pyro"]` con valores Pyro
- Mantener las variables invariables (`--sidebar-width`, `--topbar-height`, `--success`, `--warning`, `--danger`)
- Agregar nuevas variables específicas Pyro: `--pyro-glow`, `--pyro-glow-strong`, `--accent-gradient`
- El bloque `[data-theme="pyro"]` debe ir después de `:root` en el CSS

**Criterio de éxito:** Al cambiar `<html data-theme="pyro">` en el HTML, toda la app cambia a colores Pyro.

---

#### T-0.2: Agregar toggle de tema en JS
**Archivo:** `frontend/app.js`
**Descripción:** Agregar función `toggleTheme()` y lógica de persistencia.
**Detalles:**
- Agregar botón de toggle en la topbar (junto al botón de idioma)
- Guardar preferencia en `localStorage.getItem('sc_theme')` 
- Valores: `'dark'` (Stanton) o `'pyro'`
- Al cargar la página, leer `localStorage` y aplicar tema
- Estado inicial por defecto: `'dark'` (Stanton)
- El botón debe mostrar icono 🔥 (Pyro) o 💠 (Stanton)
- Título del botón: "Tema Pyro" / "Tema Stanton"

**Criterio de éxito:** Botón visible en topbar, cambia tema al hacer clic, persiste al recargar.

---

#### T-0.3: Agregar botón Pyro en HTML
**Archivo:** `frontend/index.html`
**Descripción:** Agregar botón de cambio de tema en la topbar.
**Detalles:**
- Dentro de `.topbar-actions`, después del botón de changelog
- `<button class="tb-btn" onclick="toggleTheme()" title="Tema Pyro">🔥</button>`
- El botón debe reflejar el tema actual al cargar

**Criterio de éxito:** Botón visible y funcional en la topbar.

---

### Fase 1: Rediseño de componentes clave

#### T-1.1: Sidebar Pyro
**Archivo:** `frontend/style.css` (bloque `[data-theme="pyro"]`)
**Descripción:** Estilo Pyro para sidebar, nav items activos, badges, footer.
**Detalles:**
- `.nav-item.active` debe tener borde derecho naranja en lugar de azul
- `.badge` con fondo `--accent-dim` y texto `--accent` (naranja)
- `.sidebar-header h1 span` con `--accent` (naranja)
- Agregar `border-image` o gradiente sutil al borde activo
- Efecto glow sutil en el item activo: `box-shadow: inset 3px 0 0 var(--accent)`

**Criterio de éxito:** Sidebar se ve claramente Pyro con acentos naranjas.

---

#### T-1.2: Stat Cards Pyro
**Archivo:** `frontend/style.css` (bloque `[data-theme="pyro"]`)
**Descripción:** Rediseñar stat cards con estilo fronterizo.
**Detalles:**
- `.stat-card .stat-value` con `var(--accent)` (naranja)
- Hover: `border-color: var(--accent)` + `box-shadow: 0 0 12px var(--pyro-glow)`
- Opcional: agregar text-shadow sutil al valor (`0 0 8px var(--pyro-glow)`)

**Criterio de éxito:** Stat cards tienen glow naranja al hover, valores en naranja.

---

#### T-1.3: Data Tables Pyro
**Archivo:** `frontend/style.css` (bloque `[data-theme="pyro"]`)
**Descripción:** Adaptar tablas al estilo Pyro.
**Detalles:**
- `.data-table th:hover` con `var(--accent)` (naranja)
- `.data-table th.sorted` con `var(--accent)`
- `.data-table tbody tr:hover` con borde/background naranja sutil
- Badges dentro de tablas: `.badge-bp` con naranja, `.badge-illegal` se mantiene rojo
- En mobile card-view: border-color naranja al hover

**Criterio de éxito:** Tablas se ven coherentes en Pyro con headers naranjas.

---

#### T-1.4: Paginación Pyro
**Archivo:** `frontend/style.css` (bloque `[data-theme="pyro"]`)
**Descripción:** Adaptar paginación a Pyro.
**Detalles:**
- `.page-btn:hover` con `var(--accent)` (naranja)
- `.page-btn.active` con `var(--accent-dim)` bg + `var(--accent)` border

**Criterio de éxito:** Paginación usa naranja en hover y active.

---

#### T-1.5: Filtros y Búsqueda Pyro
**Archivo:** `frontend/style.css` (bloque `[data-theme="pyro"]`)
**Descripción:** Adaptar inputs, selects y botones de filtro.
**Detalles:**
- `.filter-input:focus`, `.filter-select:focus` con `border-color: var(--accent)`
- `.check-label input[type="checkbox"]` con `accent-color: var(--accent)` (naranja)
- `.btn-reset:hover` se mantiene con `var(--danger)`
- Search dropdown: `.search-result-item:hover` con `--accent-dim`

**Criterio de éxito:** Filtros y búsqueda usan naranja en estados focus/hover.

---

#### T-1.6: Quick Links y Catalog Cards Pyro
**Archivo:** `frontend/style.css` (bloque `[data-theme="pyro"]`)
**Descripción:** Adaptar enlaces rápidos y cards del catálogo.
**Detalles:**
- `.quick-link:hover` con `border-color: var(--accent)` + glow
- `.catalog-card:hover` con glow naranja
- `.catalog-card .cc-title` con `var(--accent)`

**Criterio de éxito:** Quick links y catalog cards tienen hover naranja.

---

#### T-1.7: Modales Pyro
**Archivo:** `frontend/style.css` (bloque `[data-theme="pyro"]`)
**Descripción:** Adaptar modales al tema Pyro.
**Detalles:**
- Los modales heredan de `--bg-card` y `--border`, se adaptan automáticamente
- El detalle modal mantiene bordes naranjas en hover de mini-cards
- Modal headers y backgrounds se ven con la paleta Pyro

**Criterio de éxito:** Modales se ven correctamente en Pyro.

---

#### T-1.8: Charts y barras Pyro
**Archivo:** `frontend/style.css`
**Descripción:** Ajustar colores de gráficos de barras para el tema Pyro.
**Detalles:**
- **Chart por sistema:** En Pyro, Stanton pasa a naranja, Pyro sigue rojo, Nyx sigue púrpura
  - `.system-Stanton .chart-bar-fill` en Pyro: `#ff8a65` (naranja claro)
  - `.system-Pyro .chart-bar-fill` en Pyro: `#ff5252` (rojo más intenso)
  - `.system-Nyx .chart-bar-fill` en Pyro: `#ce93d8` (púrpura claro)
- **Chart por categoría:** Mantener distinción de colores pero con tonos más cálidos
  - `.cat-Bounty_Hunter .chart-bar-fill` → `#ff8a65`
  - `.cat-Assassination .chart-bar-fill` → `#ff1744`
  - `.cat-Hauling .chart-bar-fill` → `#76d275`
  - `.cat-Security .chart-bar-fill` → `#ffab40`
  - `.cat-Investigation .chart-bar-fill` → `#ce93d8`
  - `.cat-Mining .chart-bar-fill` → `#a1887f`
  - `.cat-Salvage .chart-bar-fill` → `#90a4ae`
  - `.cat-Other .chart-bar-fill` → `#9fa8da`
  - `.cat-Recovery .chart-bar-fill` → `#4dd0e1`

**Criterio de éxito:** Los charts tienen colores cálidos en Pyro, manteniendo legibilidad.

---

#### T-1.9: Badges de tipos y categorías Pyro
**Archivo:** `frontend/style.css`
**Descripción:** Ajustar colores de badges de componentes, items y blueprints.
**Detalles:**
- **Component badges (`comp-badge`):**
  - `.ct-PowerPlant` → naranja (`--warning`)
  - `.ct-Shield` → naranja claro (antes azul)  
  - `.ct-Cooler` → verde se mantiene
  - `.ct-QuantumDrive` → púrpura se mantiene
  - `.ct-Radar` → cyan se mantiene
- **Item type badges (`badge-type-*`):** Mantener colores actuales, solo ajustar los que usan azul a naranja
  - `.badge-type-armor_*` → de azul a naranja/marrón
- **BP category badges (`bp-cat-*`):** Mantener colores actuales (ya son variados)

**Criterio de éxito:** Badges se adaptan al tema Pyro sin perder legibilidad.

---

### Fase 2: Elementos decorativos Pyro

#### T-2.1: Gradientes de fuego
**Archivo:** `frontend/style.css` (bloque `[data-theme="pyro"]`)
**Descripción:** Agregar gradientes decorativos que evoquen fuego y calor.
**Detalles:**
- **Sidebar header gradient:** Gradiente sutil en el borde inferior
  ```css
  .sidebar-header {
      background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-card) 100%);
      border-bottom: 1px solid rgba(255,107,53,0.2);
  }
  ```
- **Topbar subtle:** Borde inferior con glow naranja
  ```css
  #topbar {
      border-bottom: 1px solid rgba(255,107,53,0.15);
  }
  ```
- **Hero gradient para stat-cards:** hover con gradiente radial de glow

**Criterio de éxito:** Elementos decorativos sutiles, no abrumadores.

---

#### T-2.2: Textura sutil de polvo/arena
**Archivo:** `frontend/style.css` (bloque `[data-theme="pyro"]`)
**Descripción:** Agregar textura de fondo sutil que evoque el desierto de Pyro.
**Detalles:**
- Usar CSS `background-image` con un patrón SVG inline tiny data-uri
- Patrón: puntos o motas muy sutiles (opacidad ~0.03) en el fondo principal
- Aplicar a `#app` o `body`
- Asegurar que no afecte rendimiento ni legibilidad

**Criterio de éxito:** Textura presente pero casi imperceptible, solo se nota al prestar atención.

---

#### T-2.3: Partículas/Sparkle sutiles con CSS
**Archivo:** `frontend/style.css` (bloque `[data-theme="pyro"]`)
**Descripción:** Efecto de partículas de fuego/polvo muy sutil.
**Detalles:**
- Pequeños puntos flotantes usando CSS `@keyframes` + pseudo-elementos
- Opcional: no implementar si afecta rendimiento en mobile
- Alternativa: solo en desktop, con animaciones muy lentas

**Criterio de éxito:** Efecto sutil, no intrusivo, funciona sin JS extra.

---

### Fase 3: Cambios en iconos/emoji

#### T-3.1: Iconos de navegación Pyro
**Archivo:** `frontend/index.html` y `frontend/app.js`
**Descripción:** Cambiar emojis de sidebar y otros lugares para tono Pyro.
**Detalles:**
- No cambiar todos los iconos — solo los más representativos
- En tema Pyro, algunos emojis podrían cambiar (opcional):
  - Dashboard: 📊 → 🔥 (fuego/calor)
  - Misiones: 📋 → 🎯 (más peligroso)
  - Blueprints: 🔧 → ⚙️ (industrial/ruinoso)
  - Items: 📦 → 🗃️
- **Mejor enfoque:** No cambiar emojis en HTML, sino en JS usar replace al cambiar tema
- Simplificar: mantener emojis actuales y solo cambiar el botón de tema

**Criterio de éxito:** Iconos se mantienen legibles y con sentido en Pyro.

---

### Fase 4: Aseguramiento de calidad

#### T-4.1: Responsive test Pyro
**Archivo:** N/A (testing)
**Descripción:** Verificar que todas las media queries y layouts responsive funcionan en Pyro.
**Detalles:**
- Probar tablet (768-1024px)
- Probar mobile (<768px)
- Probar mobile pequeño (<480px)
- Verificar sidebar collapse
- Verificar mobile card-view tables
- Verificar kofi banner

**Criterio de éxito:** Todas las vistas responsive se ven correctas en Pyro.

---

#### T-4.2: Contraste y legibilidad
**Archivo:** N/A (testing)
**Descripción:** Verificar contraste de colores en Pyro.
**Detalles:**
- Texto sobre fondo: `--text-primary` (beige claro) sobre `--bg-primary` (#0a0808) — buen contraste
- Texto secundario sobre fondo: `--text-secondary` (#a08878) sobre `--bg-card` (#1c1410) — verificar ratio
- Badges: `--accent` sobre `--accent-dim` — verificar legibilidad
- Links y hover states

**Criterio de éxito:** Todos los textos son legibles con buen contraste.

---

#### T-4.3: Transiciones suaves entre temas
**Archivo:** `frontend/style.css`
**Descripción:** Agregar transiciones suaves al cambiar de tema.
**Detalles:**
- Agregar `transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease` a elementos clave
- Usar `*` selector con `transition` para cambio suave (pero solo para propiedades de color)
- No transition en `transform` u otras propiedades de layout

**Criterio de éxito:** Cambio de tema es suave, sin flickering.

---

### Fase 5: Deploy

#### T-5.1: Deploy a Cloudflare Pages
**Archivo:** `frontend/` completo
**Descripción:** Desplegar el frontend actualizado a Cloudflare Pages.
**Detalles:**
- Usar wrangler o el dashboard de Cloudflare
- El proyecto usa `_worker.js` para proxy API
- Deploy desde `frontend/` directory
- URL actual: sc-database.pages.dev

**Criterio de éxito:** Deploy exitoso, todos los cambios visibles en producción.

---

## Dependencias entre tareas

```
T-0.1 ──── T-0.2 ──── T-0.3
  │          │
  ├──────────┼───────────────── T-1.1 (sidebar)
  │          │                 T-1.2 (stat cards)
  │          │                 T-1.3 (data tables)
  │          │                 T-1.4 (pagination)
  │          │                 T-1.5 (filters)
  │          │                 T-1.6 (quick links)
  │          │                 T-1.7 (modals)
  │          │                 T-1.8 (charts)
  │          │                 T-1.9 (badges)
  │          │
  ├──────────┼───────────────── T-2.1 (gradients)
  │          │                 T-2.2 (texture)
  │          │                 T-2.3 (particles) [OPCIONAL]
  │          │
  ├──────────┼───────────────── T-3.1 (icons)
  │          │
  ├──────────┼───────────────── T-4.1 (responsive)
  │          │                 T-4.2 (contrast)
  │          │                 T-4.3 (transitions)
  │          │
  └──────────┴───────────────── T-5.1 (deploy)
```

**Leyenda:**
- → = depende de
- Las tareas Fase 1 pueden empezar tan pronto T-0.1 esté hecho
- T-4.x puede empezar en paralelo con Fase 2/3
- T-5.1 requiere todo lo demás completo

---

## Orden de ejecución recomendado

1. **T-0.1** → Bloque CSS `[data-theme="pyro"]` (fundación)
2. **T-0.2** + **T-0.3** → Toggle button en JS + HTML
3. **T-1.1 a T-1.7** → Componentes principales (sidebar, stats, tables, pagination, filters, links, modals)
4. **T-1.8 a T-1.9** → Charts y badges
5. **T-2.1 a T-2.3** → Decoraciones (gradientes, textura, partículas)
6. **T-3.1** → Iconos
7. **T-4.1 a T-4.3** → QA (responsive, contraste, transiciones)
8. **T-5.1** → Deploy

---

## Archivos a modificar

| Archivo | Tipo | Tareas |
|---------|------|--------|
| `frontend/style.css` | CSS | T-0.1, T-1.1..T-1.9, T-2.1..T-2.3, T-4.3 |
| `frontend/app.js` | JS | T-0.2 |
| `frontend/index.html` | HTML | T-0.3 |

---

## Especificación del bloque CSS `[data-theme="pyro"]`

A continuación, el contenido completo del bloque que debe agregarse en `style.css`:

```css
/* ═══ THEME: PYRO ═══
   Sistema hostil de Star Citizen 
   Paleta: rojo oxidado, naranja quemado, ámbar, negro carbón
   Sensación: calor, peligro, frontier, polvo, fuego
   ═══════════════════════════════════════ */

[data-theme="pyro"] {
    --bg-primary: #0a0808;
    --bg-secondary: #14100d;
    --bg-card: #1c1410;
    --bg-hover: #261a14;
    --border: #332218;
    --text-primary: #e0d5cc;
    --text-secondary: #a08878;
    --text-muted: #6a5545;
    --accent: #ff6b35;
    --accent-dim: #3d1e0e;
    --pyro-glow: rgba(255, 107, 53, 0.12);
    --pyro-glow-strong: rgba(255, 107, 53, 0.25);
    --accent-gradient: linear-gradient(135deg, #ff6b35, #ff8a50);
}

/* Sidebar */
[data-theme="pyro"] .sidebar-header {
    background: linear-gradient(180deg, var(--bg-secondary), var(--bg-card));
    border-bottom: 1px solid rgba(255, 107, 53, 0.15);
}

[data-theme="pyro"] .sidebar-header h1 span { color: var(--accent); }

[data-theme="pyro"] .nav-item.active {
    background: var(--accent-dim);
    color: var(--accent);
    border-right: 3px solid var(--accent);
    box-shadow: inset 3px 0 0 var(--accent);
}

[data-theme="pyro"] .badge {
    background: var(--accent-dim);
    color: var(--accent);
}

/* Topbar */
[data-theme="pyro"] #topbar {
    border-bottom: 1px solid rgba(255, 107, 53, 0.12);
}

/* Stat Cards */
[data-theme="pyro"] .stat-card .stat-value { color: var(--accent); }
[data-theme="pyro"] .stat-card:hover {
    border-color: var(--accent);
    box-shadow: 0 0 16px var(--pyro-glow);
}

/* Data Tables */
[data-theme="pyro"] .data-table th:hover { color: var(--accent); }
[data-theme="pyro"] .data-table th.sorted { color: var(--accent); }
[data-theme="pyro"] .data-table th.sortable::after { color: var(--text-muted); }
[data-theme="pyro"] .data-table th.sorted::after { color: var(--accent); }

/* Badges */
[data-theme="pyro"] .badge-bp {
    background: var(--accent-dim);
    color: var(--accent);
}

/* Pagination */
[data-theme="pyro"] .page-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
}
[data-theme="pyro"] .page-btn.active {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
}

/* Filters */
[data-theme="pyro"] .filter-input:focus { border-color: var(--accent); }
[data-theme="pyro"] .filter-select:focus { border-color: var(--accent); }
[data-theme="pyro"] .check-label input[type="checkbox"] { accent-color: var(--accent); }

/* Quick Links */
[data-theme="pyro"] .quick-link:hover {
    border-color: var(--accent);
    box-shadow: 0 0 12px var(--pyro-glow);
}

/* Catalog Cards */
[data-theme="pyro"] .catalog-card .cc-title { color: var(--accent); }
[data-theme="pyro"] .catalog-card:hover {
    border-color: var(--accent);
    box-shadow: 0 4px 16px var(--pyro-glow);
}

/* Search */
[data-theme="pyro"] #search-input:focus { border-color: var(--accent); }
[data-theme="pyro"] .search-result-item:hover { background: var(--bg-hover); }
[data-theme="pyro"] .search-dropdown > div[style*="color:var(--accent)"] { color: var(--accent) !important; }

/* Charts: system bars */
[data-theme="pyro"] .system-Stanton .chart-bar-fill { background: #ff8a65; }
[data-theme="pyro"] .system-Pyro .chart-bar-fill { background: #ff5252; }
[data-theme="pyro"] .system-Nyx .chart-bar-fill { background: #ce93d8; }

/* Charts: category bars */
[data-theme="pyro"] .cat-Bounty_Hunter .chart-bar-fill { background: #ff8a65; }
[data-theme="pyro"] .cat-Assassination .chart-bar-fill { background: #ff1744; }
[data-theme="pyro"] .cat-Hauling .chart-bar-fill { background: #76d275; }
[data-theme="pyro"] .cat-Security .chart-bar-fill { background: #ffab40; }
[data-theme="pyro"] .cat-Investigation .chart-bar-fill { background: #ce93d8; }
[data-theme="pyro"] .cat-Mining .chart-bar-fill { background: #a1887f; }
[data-theme="pyro"] .cat-Salvage .chart-bar-fill { background: #90a4ae; }
[data-theme="pyro"] .cat-Other .chart-bar-fill { background: #9fa8da; }
[data-theme="pyro"] .cat-Recovery .chart-bar-fill { background: #4dd0e1; }

/* Component badges */
[data-theme="pyro"] .comp-badge.ct-PowerPlant { background: rgba(255,107,35,0.15); color: #ff8a50; }
[data-theme="pyro"] .comp-badge.ct-Shield { background: rgba(255,138,101,0.12); color: #ff8a65; }

/* Item type badges — armor types to warm tones */
[data-theme="pyro"] .badge-type-armor_helmet,
[data-theme="pyro"] .badge-type-armor_core,
[data-theme="pyro"] .badge-type-armor_arms,
[data-theme="pyro"] .badge-type-armor_legs,
[data-theme="pyro"] .badge-type-armor_backpack {
    background: rgba(255,107,53,0.12);
    color: #ff8a50;
}

/* Scroll to top */
[data-theme="pyro"] #scroll-top-btn {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
}
[data-theme="pyro"] #scroll-top-btn:hover {
    background: var(--accent);
    color: var(--bg-primary);
}

/* Loading indicator spinner */
[data-theme="pyro"] .loading-indicator .spinner {
    border-top-color: var(--accent);
}

/* Mobile card-view: hover border */
[data-theme="pyro"] .data-table tr:hover {
    border-color: var(--accent) !important;
}

/* Mini cards */
[data-theme="pyro"] .mini-card:hover {
    border-color: var(--accent);
    box-shadow: 0 0 8px var(--pyro-glow);
}

/* Smooth theme transitions */
[data-theme="pyro"] .stat-card,
[data-theme="pyro"] .nav-item,
[data-theme="pyro"] .quick-link,
[data-theme="pyro"] .catalog-card,
[data-theme="pyro"] .page-btn,
[data-theme="pyro"] .data-table th,
[data-theme="pyro"] .badge,
[data-theme="pyro"] .filter-input,
[data-theme="pyro"] .filter-select {
    transition: all 0.2s ease;
}
```

---

## Especificación del toggle en JS (`app.js`)

Agregar al final de `app.js`:

```javascript
// ─── THEME TOGGLE: Dark (Stanton) / Pyro ───
const THEME_KEY = 'sc_theme';

function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    // Update button icon
    const btn = document.getElementById('theme-btn');
    if (btn) {
        btn.textContent = theme === 'pyro' ? '💠' : '🔥';
        btn.title = theme === 'pyro' ? 'Tema Stanton' : 'Tema Pyro';
    }
}

function toggleTheme() {
    const current = getTheme();
    const next = current === 'pyro' ? 'dark' : 'pyro';
    applyTheme(next);
}

// Apply theme on load
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getTheme());
});
```

---

## Especificación del botón en HTML

Agregar dentro de `.topbar-actions` en `index.html`:

```html
<button class="tb-btn" id="theme-btn" onclick="toggleTheme()" title="Tema Pyro">🔥</button>
```

---

## Consideraciones adicionales

### Rendimiento
- El cambio de tema por `data-theme` es instantáneo (solo cambia variables CSS)
- No hay re-renderizado de JS ni recarga de datos
- Las transiciones CSS deben limitarse a propiedades de color (no layout)

### Mantenimiento futuro
- Si se agregan más temas, seguir el mismo patrón `[data-theme="nombre"]`
- Fácil agregar un tema "Nyx" (púrpura) siguiendo el mismo patrón

### Compatibilidad
- 100% compatible con navegadores modernos (CSS custom properties)
- No requiere polyfills
- Funciona con Cloudflare Pages sin cambios en el worker

### Mejoras post-MVP (no incluidas)
- Tema persistente por usuario sin localStorage (server-side)
- Efecto de transición animada entre temas (morphing)
- Partículas de fuego animadas con CSS puro
- Sonido ambiental al cambiar a Pyro
