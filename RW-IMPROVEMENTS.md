# 🐉 RW Command - Mejoras Implementadas

## ✨ 3 Características Nuevas Agregadas

### 1️⃣ **Búsqueda Inteligente Mejorada** 
La búsqueda ahora genera 6 variantes de tags diferentes + 4 niveles de fallback inteligente:

```
Nivel 1 - Tags específicos:
├─ Keyword exacto (si existe)
├─ Nombre + Fuente completa
├─ Nombre + palabras clave de fuente
├─ Solo nombre
├─ Primera palabra del nombre + fuente
└─ Primera palabra nombre + primera palabra fuente

Nivel 2 - Fallbacks inteligentes:
├─ Fallback 1: Solo nombre (ej: "Minori")
├─ Fallback 2: Nombre + serie (ej: "Minori Toradora")
├─ Fallback 3: Solo serie (ej: "Toradora" → cualquier chica de Toradora)
└─ Fallback 4: Tipo genérico + serie (ej: "anime girl Toradora")
```

**Ejemplo con Minori Kushieda (Toradora):**
```
1. minori_kushieda (0)
2. minori kushieda (0)
3. minori_kushieda_toradora (0)
4. minori kushieda toradora (0)
5. minori_toradora (0)
6. minori toradora (0)
├─ Fallback 1: minori (0)
├─ Fallback 2: minori toradora (0)
├─ Fallback 3: toradora ✅ (encontró imágenes)
└─ Fallback 4: anime girl toradora (no necesitó)
```

**Ventaja:** Si un personaje no tiene imágenes, intenta encontrar de su misma serie. Nunca falla completamente si la serie existe.

---

### 2️⃣ **Timeout Adaptativo** ⏱️
El timeout se ajusta automáticamente según el tamaño de la imagen:

```javascript
TIMEOUT_CONFIG = {
  small:  8000ms   // < 500KB
  medium: 12000ms  // 500KB - 3MB
  large:  20000ms  // > 3MB
}
```

**Proceso:**
1. HEAD request → obtiene `Content-Length`
2. Calcula timeout adaptativo
3. Descarga con timeout óptimo

**Ventaja:** No hay timeouts en imágenes grandes, pero tampoco esperas innecesariamente por imágenes pequeñas.

---

### 3️⃣ **Sistema de Estadísticas** 📊
Cada personaje ahora se rastrea con:

- 🎲 **Rolls**: Cuántas veces se sacó
- ✅ **Éxitos**: Cuántas veces se obtuvo imagen
- ❌ **Fallos**: Cuántas veces no se consiguió
- 📥 **Datos descargados**: MB totales por personaje
- ⏰ **Último roll**: Fecha/hora

**Archivo:** `./lib/rw-stats.json`

**Comando:** `/rwstats` o `/rwestats`

```
Ejemplo de output:
┌─ 📊 RW ESTADÍSTICAS ⋆✨⋆
│
│ 1. Alisa Mikhailovna Kujou
│    🎲 Rolls: 5 | ✅ Éxito: 100%
│    📥 Datos: 0.88 MB
│    ⏰ Último: 15/04/2026
│
│ 2. Mitsuri Kanroji
│    🎲 Rolls: 3 | ✅ Éxito: 100%
│    📥 Datos: 0.45 MB
│    ⏰ Último: 15/04/2026
│
├─ 📈 ESTADÍSTICAS GLOBALES:
│ 🎲 Total Rolls: 8
│ ✅ Éxitos: 8 (100%)
│ ❌ Fallos: 0
│ 📊 Datos descargados: 1.33 MB
└─ 🐉 Powered by MatheoDark
```

---

## 📈 Cambios Técnicos

### rw.js
- ✅ `buildTagCandidates()` → 6 variantes de tags (antes 4)
- ✅ `getAdaptiveTimeout()` → Calcula timeout según tamaño
- ✅ `loadStats()` / `saveStats()` → Gestión de estadísticas
- ✅ `updateStats()` → Registra éxitos/fallos después de cada roll
- ✅ HEAD request para estimar tamaño antes de descargar
- ✅ Logs mejorados mostrando timeout adaptativo

### rwstats.js (NUEVO)
- ✅ Comando `/rwstats` para ver estadísticas
- ✅ Top 20 personajes más rolleados
- ✅ Tasa de éxito por personaje
- ✅ Total de datos descargados
- ✅ Estadísticas globales del servidor

---

## 🎯 Casos de Uso

### "¿Por qué Alisa funciona pero Venus no?"
```
/rwstats te muestra:
- Venus: 10 rolls, 40% éxito (=4 images)
- Alisa: 5 rolls, 100% éxito (=5 images)
→ Venus necesita mejor keyword en characters.json
```

### "¿Cuánto datos usamos en RW?"
```
Ves: 📊 Datos descargados: 125.4 MB
→ Sabes exactamente cuánto BW se usa
```

### Imágenes muy grandes
```
Sistema detecta: 5.2 MB
Usa timeout: 20000ms (20s)
✅ No falla por timeout
```

---

## 🔧 Configuración (Opcional)

Puedes ajustar los timeouts en `rw.js`:

```javascript
const TIMEOUT_CONFIG = {
  small: 8000,    // Tu valor
  medium: 12000,  // Tu valor
  large: 20000    // Tu valor
}
```

---

## 📝 Próximas Mejoras Posibles

1. **Caché de imágenes** - Guardar URLs por 24h para no re-buscar
2. **Sincronización cruzada** - Compartir stats entre bots
3. **Reportes semanales** - "Personaje más rolleado de la semana"
4. **Predicciones** - "Este personaje está trending ↑"

---

**¡Disfruta del nuevo sistema mejorado! 🚀**
