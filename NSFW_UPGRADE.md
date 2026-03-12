# 🔞 Actualización NSFW: Cascada PurrBot v2 + R34

## ✨ Cambios Realizados

El sistema NSFW ahora usa una **cascada inteligente** que combina lo mejor de dos mundos:

### Antes vs Después

| Aspecto | Antes (R34 Solo) | Después (PurrBot v2 + R34) |
|--------|-----------------|--------------------------|
| **Fuente Principal** | Rule34 scraping | PurrBot v2 NSFW |
| **Velocidad** | ⚠️ Lenta (scraping) | ✅ Rápida (API) |
| **Fallback** | Nada | R34 scraping (contenido actualizado) |
| **Comandos Rápidos** | 0 | 8 (PurrBot) |
| **Comandos Actualizados** | 25+ | 25+ (con R34) |
| **Estabilidad** | Media (bot detection) | Alta (API + fallback) |

## 📊 Nueva Estrategia de Descarga

```
Script: download-nsfw-interactions.js

Para cada comando:
  1️⃣ Intenta PurrBot v2 NSFW (si existe mapping)
     - anal, cum, fuck, lickpussy, fap, blowjob, threesome, yuri
     - ✅ Rápido, confiable, estable

  2️⃣ Fallback a Rule34 scraping (todos los comandos)
     - Contenido constantemente actualizado
     - ✅ Siempre hay nuevas variaciones

  3️⃣ Resultado
     - ⚡ Respuestas instantáneas después de caché
     - 🔄 Contenido fresco desde R34
```

## 🚀 Cómo Usa el Bot

```
Primera vez: #fuck @usuario
  ↓
1. Cache local? ❌ → Intenta PurrBot v2 ✅ → Descarga + cachea

Segunda vez: #fuck otro_usuario
  ↓
1. Cache local? ✅ → Envía (⚡ instantáneo)

Cuando PurrBot falla: #anal @usuario
  ↓
1. Cache local? ❌ → Intenta PurrBot v2 ❌ → R34 scraping ✅ → Descarga + cachea
```

## 📝 Cambios en Archivos

### `/commands/nsfw/inter.js`
```javascript
// Antes
const res = await fetch(`https://purrbot.site/api/img/nsfw/...`)

// Después (v2)
const res = await fetch(`https://api.purrbot.site/v2/img/nsfw/...`)
```

### `/scripts/download-nsfw-interactions.js`
```javascript
// Antes
- Solo usaba R34 scraping
- Lento por scraping

// Después
- PurrBot v2 como principal (rápido)
- R34 como fallback (actualizado)
- Cascada inteligente
```

## ✅ Beneficios

✅ **Más rápido** - PurrBot v2 API vs R34 scraping
✅ **Más confiable** - Cascada de dos fuentes
✅ **Contenido actualizado** - R34 se actualiza constantemente
✅ **Sin bot detection** - PurrBot no tiene restricciones
✅ **Mejor caché** - Menos re-descargas por fallback
✅ **Usuarios no notan cambios** - Mismo comando `#fuck @usuario`

## 🎯 PurrBot v2 NSFW Soportados

| Comando | Soporte | Fuente |
|---------|---------|--------|
| `anal` | ✅ | PurrBot v2 |
| `cum` | ✅ | PurrBot v2 |
| `fuck` | ✅ | PurrBot v2 |
| `lickpussy` | ✅ | PurrBot v2 |
| `fap` | ✅ | PurrBot v2 |
| `blowjob` | ✅ | PurrBot v2 |
| `threesome` | ✅ | PurrBot v2 |
| `yuri` | ✅ | PurrBot v2 |
| `sixnine` | ⚠️ | R34 Fallback |
| `undress` | ⚠️ | R34 Fallback |
| `spank` | ⚠️ | R34 Fallback |
| ... (+14 más) | ⚠️ | R34 Fallback |

## 🧪 Cómo Verificar

### Test local
```bash
# Descargar con nueva cascada
node scripts/download-nsfw-interactions.js fuck anal yuri

# Ver en consola
[NSFW] Descargando fuck...
  (intenta PurrBot v2 primero)
  (fallback a R34 si es necesario)
```

### Ver en ejecución
```
Usuario: #fuck @usuario
Bot:
  1. Cache local? No → PurrBot v2? Sí ✅
  2. Descarga y cachea
  3. Envía respuesta
```

## 💡 Notas Importantes

- El comando sigue siendo `#fuck @usuario` (sin cambios para usuarios)
- Los archivos descargados anteriormente siguen funcionando
- Si re-descargas, algunos comandos vendrán de PurrBot v2 (más rápido)
- R34 sigue siendo el fallback para comandos sin soporte en PurrBot
- La privacidad se mantiene: NSFW local, no committed

## 📌 Próximos Pasos (Opcional)

1. **Limpiar caché viejo** (opcional):
   ```bash
   rm -rf media/nsfw_interactions/*/
   rm media/nsfw_interactions.json
   ```

2. **Re-descargar con nueva cascada** (opcional):
   ```bash
   node scripts/download-nsfw-interactions.js
   ```

3. **Monitorear** - Verificar que todo funcione correctamente

---

**Resumen**: NSFW ahora es más rápido (PurrBot v2) + siempre fresco (R34). Lo mejor de ambos mundos. 🚀
