# PLAN: Integrar diseño Cyber/Glitch al tema Pyro

## Objetivo
Incorporar los efectos visuales cyber/glitch del ejemplo de referencia (`referencias/pyro-glitch-ejemplo.*`) al tema Pyro existente en SC Database. La integración debe seguir el patrón `[data-theme="pyro"]` existente, sin frameworks ni dependencias externas.

## Elementos a integrar

| # | Elemento | Referencia | Aplica a |
|---|----------|-----------|----------|
| 1 | Cyber buttons con clip-path 45° | `.cyber-btn` en CSS ejemplo | Botones de acción en Pyro |
| 2 | Modales con glitch CRT | `.modal__glitch`, clip-path polygon | Modal detail cuando Pyro activo |
| 3 | Efectos flicker mejorados | `--flicker` timing function | Badges, acentos, modales |
| 4 | Backdrop con saturate + blur | `.backdrop` en CSS ejemplo | Modales, hover de botones |
| 5 | Clip-path glitch system | `--clip-one` a `--clip-seven` + `@keyframes glitch` | Hover en botones, modales |
| 6 | Esquinas decorativas (`.corner`) | `.corner` en CSS ejemplo | Botones cyber, modales |

## Stack
- Vanilla CSS + JS (sin cambios)
- Sin Babel, Tweakpane, audio, popover API
- Los efectos solo se activan cuando `[data-theme="pyro"]`

## Archivos a modificar

| Archivo | Tipo | Cambios |
|---------|------|---------|
| `frontend/style.css` | CSS | Agregar ~400 líneas de efectos cyber/glitch dentro de `[data-theme="pyro"]` |
| `frontend/app.js` | JS | ~50 líneas para lógica de animación glitch en modales |
| `frontend/index.html` | HTML | ~30 líneas para estructura de botones cyber y esquinas decorativas |

---

## Tareas

### T-1: Cyber Buttons (style.css + index.html)

**Descripción:** Crear clase `.cyber-btn` con clip-path de esquinas recortadas a 45°, efecto glitch al hover.

**Detalles:**
- `--clip: polygon(0 0, 100% 0, 100% calc(100% - var(--corner)), calc(100% - var(--corner)) 100%, 0% 100%)`
- Agregar `--corner: 12px` y `--border: 1px` como variables locales
- Backdrop con `backdrop-filter: saturate(180%) blur(6px)` al fondo
- Al hover/focus: el `.glitch` interno se muestra con animación clip-path
- El glitch interno tiene letras invertidas (scaleY/scaleX alternadas)
- Aplicar a `tb-btn` cuando Pyro está activo

**Archivos:** `style.css` (bloque `[data-theme="pyro"]`), `index.html` (agregar clase a botones)

**Criterio de éxito:** Botones tienen esquinas recortadas, al hover muestran distorsión glitch con letras invertidas.

---

### T-2: Modal Glitch System (style.css + app.js)

**Descripción:** Agregar efecto CRT/glitch a los modales existentes (`.modal-detail`) cuando Pyro está activo.

**Detalles:**
- Variables `--clip-one` a `--clip-seven` con polygon shapes para distorsión
- `@keyframes glitch` que anima clip-path + translate con timing preciso
- `.modal__glitch` interno que duplica el contenido y aplica clip-path animado
- Backdrop del modal con `backdrop-filter: saturate(180%) blur(6px)`
- Transiciones suaves de entrada/salida del modal (fade + clip-path reveal)
- Flicker inicial al abrir (animación `flicker` con `--flicker` easing)

**Archivos:** `style.css` (bloque `[data-theme="pyro"]`), `app.js` (lógica de temporización)

**Criterio de éxito:** Modales en Pyro tienen glitch al abrir, distorsión CRT, backdrop blur.

---

### T-3: Flicker Enhancement (style.css)

**Descripción:** Mejorar el flicker existente con la `--flicker` linear() timing function del ejemplo.

**Detalles:**
- `--flicker: linear(0 0%, 0.1864 6.17%, 0.0001 14.41%, ...)` en `:root`
- Actualizar `@keyframes pyro-flicker` para usar `--flicker`
- Agregar `@keyframes bg-flicker` para flicker de background en botones

**Archivos:** `style.css` (global + bloque `[data-theme="pyro"]`)

**Criterio de éxito:** Flicker más orgánico y menos predecible que el actual.

---

### T-4: Corner Decorations (style.css)

**Descripción:** Agregar esquinas decorativas en botones y modales.

**Detalles:**
- `.corner` class: posición absolute, bottom-right, `height: var(--corner)`, `width: var(--corner)`
- Pseudo-elemento `::after` con línea diagonal a 135° simulando esquina recortada
- Color: `var(--accent)`
- Aplicar a botones cyber y modales

**Archivos:** `style.css` (bloque `[data-theme="pyro"]`)

**Criterio de éxito:** Esquinas decorativas visibles en botones y modales con acento naranja.

---

### T-5: Backdrop Effects (style.css)

**Descripción:** Agregar `.backdrop` con saturate + blur y overlay de acento.

**Detalles:**
- `.backdrop` como span interno: absolute, z-index: -1, inset: 0
- `background: hsla(0,0%,0%,0.4)` con `backdrop-filter: saturate(180%) blur(6px)`
- `clip-path: var(--clip)` para que coincida con el recorte del botón
- Al hover del botón: `background: var(--accent)` + color texto = canvas

**Archivos:** `style.css` (bloque `[data-theme="pyro"]`)

**Criterio de éxito:** Backdrop aparece detrás del texto del botón, efecto saturate + blur visible.

---

### T-6: Glitch Letters System (style.css)

**Descripción:** Sistema de letras invertidas para el efecto glitch.

**Detalles:**
- `.letters` con `display: flex`
- `span:nth-of-type(2), span:nth-of-type(5)` → `scale: 1 -1` (invertidas en Y)
- `span:nth-of-type(3), span:nth-of-type(6), span:nth-of-type(7)` → `scale: -1 -1` (invertidas en X+Y)
- Al hover del botón, el `.glitch` se muestra y anima

**Archivos:** `style.css` (bloque `[data-theme="pyro"]`)

**Criterio de éxito:** Letras del glitch aparecen invertidas aleatoriamente.

---

### T-7: JS Glitch Timing (app.js)

**Descripción:** Lógica de temporización para animación glitch en modales.

**Detalles:**
- Al abrir un modal, disparar animación glitch con delay aleatorio (1.5s inicial, luego random 2-12s)
- Al cerrar, detener timers
- Keyboard listener: Escape cierra, Enter confirma (adaptado sin popover API)
- No incluir audio ni tweakpane

**Archivos:** `app.js`

**Criterio de éxito:** Modal muestra glitch periódico mientras está abierto.

---

### T-8: Integración HTML (index.html)

**Descripción:** Agregar estructura HTML necesaria para los efectos.

**Detalles:**
- Botón theme-toggle como `.cyber-btn` cuando Pyro activo (vía JS)
- Esquinas decorativas en modales (`.corner`)
- Actualizar estructura de botones para incluir `.backdrop` y `.glitch`

**Archivos:** `index.html`

**Criterio de éxito:** HTML modificado sin romper funcionalidad existente.

---

## Dependencias

```
T-1 (buttons) ──────────────────── T-5 (backdrop)
                                    T-6 (glitch letters)
                                    T-4 (corners)
T-2 (modal glitch) ─────────────── T-7 (JS timing)
                                    T-4 (corners)
T-3 (flicker) ──── independiente

T-8 (HTML) ─────── integra T-1 + T-2 + T-4
```

---

## Estrategia de implementación

1. **Preparación**: Agregar variables globales `--flicker`, `--clip-*` en `:root` (no requieren theme)
2. **CSS Puro**: Todos los efectos visuales van en `[data-theme="pyro"]` para no contaminar tema dark
3. **HTML mínimo**: Solo agregar clases y wrappers necesarios a elementos existentes
4. **JS mínimo**: Solo temporización de animaciones, sin state management extra
5. **Sin regresiones**: No tocar estilos existentes fuera de `[data-theme="pyro"]`

---

## Orden de ejecución

1. T-3: Flicker enhancement (variables base)
2. T-5: Backdrop effects (estructura base)
3. T-4: Corner decorations (reusable)
4. T-1: Cyber buttons
5. T-6: Glitch letters (depende de T-1)
6. T-2: Modal glitch system
7. T-7: JS glitch timing
8. T-8: HTML integration
