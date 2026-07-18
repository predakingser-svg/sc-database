# Plan: Extracción completa del global.ini

## Archivo: 90,344 líneas, 513 grupos únicos

## Categorías encontradas

### 🗺️ Sistemas y ubicaciones
| Grupo | Entradas | Contenido |
|-------|----------|-----------|
| Stanton | 960 | Planetas, lunas, estaciones, POIs de todo Stanton |
| Pyro | 708 | Planetas Pyro I-V, lunas, estaciones, descripciones con minería |
| ArcCorp | 8 | Locaciones de ArcCorp |
| Crusader | 45 | Locaciones de Crusader |
| Hurston | 62 | Locaciones de Hurston |
| microTech | 7 | Locaciones de microTech |
| Nyx | ~20 | Sistema Nyx, planetas, descripciones |

### 🏛️ Facciones y misioneros
| Grupo | Entradas | Contenido |
|-------|----------|-----------|
| Headhunters | 190 | Misiones, descripciones, reputación |
| CFP | 220 | Citizens for Prosperity, misiones, textos |
| XenoThreat | 12 | Eventos, misiones |
| Battaglia | 99 | Misiones Recco Battaglia con planos |
| Hockrow | 174 | Misiones Hockrow |
| Covalex | 151 | Misiones de entrega |
| Eckhart | 129 | Misiones Eckhart |
| Foxwell | 149 | Misiones Foxwell |
| Ling | 108 | Ling Family Hauling |
| BlacJac | 57 | Misiones BlacJac |
| Wikelo | 7 | Textos de Wikelo |
| Shubin | 124 | Misiones de minería Shubin |

### 📋 Misiones
| Grupo | Entradas | Contenido |
|-------|----------|-----------|
| PU | 19,870 | Todas las misiones del juego |
| MiningClaim | 193 | Misiones de reclamos mineros |
| DataHeist | 144 | Misiones de robo de datos |
| Mission | 189 | Varias misiones |
| Event | 187 | Misiones de eventos |

### ⛏️ Minería y recursos
| Grupo | Entradas | Contenido |
|-------|----------|-----------|
| MiningClaim | 193 | Claims mineros |
| Mining | varias | Láseres mineros, módulos, gadets |
| Planos de minería | ~20 | Arbor, Helix, Hofstede, Klein, Impact, etc. |

### 🚀 Naves y componentes
- Nombres de naves traducidos (varios grupos)
- Componentes como FR-66, JS-300, VaporBlock, etc.
- Armaduras, armas, items

### 🌐 UI y sistema
| Grupo | Entradas | Contenido |
|-------|----------|-----------|
| UI | 375 | Textos de interfaz |
| RepStanding | 123 | Textos de reputación |
| Frontend | 129 | Textos del frontend del juego |

## Plan de extracción

### Fase A — Categorizar todo (completado ✅)
- Escaneo completo del archivo
- Identificadas 513 categorías
- Principales: PU (19,870), Stanton (960), Pyro (708), CFP (220), Headhunters (190)

### Fase B — Extraer datos relevantes para la web
1. **Traducciones de UI** — botones, títulos, mensajes del frontend del juego
2. **Minerales y minería** — ubicaciones de Pyro, nuevos minerales, láseres
3. **Facciones** — nombres traducidos, descripciones
4. **Estaciones/lugares** — nombres traducidos de todas las estaciones
5. **Componentes** — nombres de shields, plants, coolers, QD, radares
6. **Items** — armas, armaduras, equipamiento

### Fase C — Aplicar a la web
- Sistema de traducción en app.js
- Actualizar minerals.json con ubicaciones de Pyro
- Completar datos de componentes
- Traducir UI completa

### Fase D — Verificar
- Revisar que todas las páginas tengan traducciones
- Confirmar datos nuevos correctos
- Testear que no se rompa nada
