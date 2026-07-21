# Plan: Star Citizen Database para Web (SCDB)

## Objetivo
Extraer y estructurar todos los datos de Star Citizen desde StarBreaker + traducción LetalDark ES para alimentar una base de datos web con información precisa y en español.

## Datos a extraer

### 🚀 Naves (spaceships/)
- Nombre, fabricante, tamaño, precio
- Salud (hull HP), escudos (shield HP/regen)
- Velocidad (SCM, max, retro, pitch/yaw/roll)
- Quantum drive (tipo, rango)
- Componentes equipables ranuras (tamaño por tipo)
- Carga (SCU), tripulación mín/máx

### ⚙️ Componentes (haulingentityclass/ + scitem/ships/)
- Shields: tamaño, grado, HP, regen, absorción
- Power Plants: tamaño, grado, potencia, calor
- Coolers: tamaño, grado, enfriamiento
- Quantum Drives: tamaño, grado, velocidad, rango
- Todos: vida, firma EM/IR, calor generado

### 🔫 Armas (scitem/weapons/ + weaponmounts/)
- DPS, daño por tipo (físico, energía, distorsión)
- Alcance, velocidad de proyectil
- Tamaño, tipo (láser, balística, etc.)
- Munición, recarga

### 🛡️ Armaduras y Gear (scitem/characters/)
- Peso, protección por zona
- Daño que absorbe

### 📋 Misiones (missiondata/)
- Nombre, descripción
- Qué pide (items, destruir, transportar)
- Cantidad exacta
- Pago (aUEC)
- Reputación necesaria (facción, nivel)
- Sistema y ubicación
- Recompensas (items, reputación)

### 📦 Economía (commodities/)
- Precios de compra/venta por estación
- Ubicaciones de venta
- Rutas de crafteo

### 🔧 Crafting (crafting/)
- Qué materiales pide (cantidad exacta)
- Qué produce
- Dónde se fabrica

## Stack de extracción
- PowerShell + StarBreaker CLI en Windows del usuario
- Parseo directo de JSON de StarBreaker (formato DataCore)
- Traducción ES desde LetalDark global.ini
- Salida: JSON estructurado por categoría

## Orden de implementación
1. Fase 1: Script base - extraer naves con stats básicas + traducción
2. Fase 2: Componentes (shields, power, coolers, QT)
3. Fase 3: Armas (nave + FPS)
4. Fase 4: Misiones (requisitos, pagos, reputación)
5. Fase 5: Economía y crafting
6. Fase 6: Gear y armaduras
7. Fase 7: Generar SQL/API endpoints para web
