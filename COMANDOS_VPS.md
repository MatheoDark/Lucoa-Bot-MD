# Comandos para Usar en el VPS

## 📋 Resumen Rápido

Tu bot tiene dos sistemas de interacciones que necesitan ser descargados **MANUALMENTE** en el VPS:

1. **Anime** (Reacciones SFW)
2. **NSFW** (Contenido +18)

Ambos se cachean localmente después de la primera descarga.

---

## 🎬 COMANDOS ANIME (SFW)

### Descargar todos los comandos anime:
```bash
node scripts/download-interactions.js all
```

### Descargar comandos específicos:
```bash
node scripts/download-interactions.js kiss hug dance pat
```

### Re-descargar (actualizar):
```bash
node scripts/download-interactions.js --force smile wave
```

**Tiempo estimado**: ~10-15 minutos (descarga 7 archivos por comando)
**Espacio**: ~200 MB para todos los comandos

---

## 🔞 COMANDOS NSFW (+18 desde R34)

### Descargar todos los comandos NSFW:
```bash
node scripts/download-nsfw-interactions.js
```

### Descargar comandos específicos:
```bash
node scripts/download-nsfw-interactions.js anal fuck yuri blowjob
```

### Comandos NSFW disponibles:
```
anal, cum, fuck, lickpussy, fap, blowjob, threesome, yuri,
sixnine, undress, spank, grope, boobjob, footjob, suckboobs,
grabboobs, tentacle, fingering, squirt, deepthroat, bondage,
creampie, gangbang, facesitting, rimjob
```

**Tiempo estimado**: ~30-45 segundos por comando (5 archivos cada uno)
**Espacio**: Dinámico (crece con uso, ~5-10 MB por comando)

---

## 🚀 SECCIÓN PARA EN TU VPS

### 1️⃣ Después de clonar el repositorio:
```bash
# Descargar todo en el VPS
cd /path/to/Lucoa-Bot-MD

# Opción A: Descargar SOLO anime (recomendado)
node scripts/download-interactions.js all

# Opción B: Descargar anime + algunos NSFW
node scripts/download-interactions.js all
node scripts/download-nsfw-interactions.js anal fuck yuri

# Opción C: Ejecutar setup.sh (incluye anime automático)
bash setup.sh  # Descarga anime en paso 6
```

### 2️⃣ Durante ejecución (si quieres más NSFW):
```bash
# Agregar más comandos NSFW mientras el bot corre
node scripts/download-nsfw-interactions.js blowjob threesome

# El bot los cachea automáticamente
```

---

## 📝 INSTRUCCIONES PASO A PASO EN VPS

```bash
# 1. Conectar a VPS
ssh usuario@ip_del_vps
cd /ruta/del/bot

# 2. Descargar anime (recomendado, ~200MB)
node scripts/download-interactions.js all

# 3. (OPCIONAL) Descargar algunos NSFW
node scripts/download-nsfw-interactions.js fuck anal yuri

# 4. Iniciar bot
npm start
# o si usas PM2:
pm2 start ecosystem.config.cjs
```

---

## ⚡ DIFERENCIA ENTRE COMANDOS

| Comando | Qué descarga | Dónde | Tamaño | Tiempo |
|---------|------|-------|--------|--------|
| `download-interactions.js all` | Anime (SFW) | `/media/interactions/` | ~200 MB | ~15 min |
| `download-interactions.js kiss hug` | Anime selectivo | `/media/interactions/` | ~20-30 MB | ~2 min |
| `download-nsfw-interactions.js` | NSFW todos (R34) | `/media/nsfw_interactions/` | ~100+ MB | ~15 min |
| `download-nsfw-interactions.js anal` | NSFW selectivo (R34) | `/media/nsfw_interactions/` | ~5-10 MB | ~30 seg |

---

## 🔄 ACTUALIZAR ARCHIVOS DESCARGADOS

### Re-descargar anime (reemplazar):
```bash
node scripts/download-interactions.js --force kiss hug dance
```

### Actualizar NSFW (agrega más):
```bash
# El script agrega nuevos archivos sin eliminar los anteriores
node scripts/download-nsfw-interactions.js fuck yuri
```

---

## ⚠️ NOTAS IMPORTANTES

✅ **Anime** se descarga con `setup.sh` automáticamente (paso 6)
⚠️ **NSFW** NO se descarga automáticamente (manual)
✓ Ambos sistemas cachean localmente después
✓ El bot funciona sin estos archivos (fallback remoto)
✓ Los archivos NO se suben al repositorio (privado VPS)

---

## 🎯 RECOMENDACIÓN

**Ejecuta esto en tu VPS la primera vez:**

```bash
node scripts/download-interactions.js all
```

Luego el bot funcionará con respuestas instantáneas. El NSFW se cachea automáticamente en primer uso.

---

## 🆘 TROUBLESHOOTING

**P: Anime no descarga**
```bash
# Revisa log
npm start
# Si hay error, intenta de nuevo
node scripts/download-interactions.js all
```

**P: NSFW lento**
```bash
# R34 puede ser lento, espera o intenta después
node scripts/download-nsfw-interactions.js fuck
```

**P: Quiero limpiar todo y re-descargar**
```bash
# Limpiar anime
rm -rf media/interactions/*/

# Limpiar NSFW (local)
rm -rf media/nsfw_interactions/*/

# Re-descargar
node scripts/download-interactions.js all
```

---

## ✨ COMANDOS MÁS ÚTILES

**Descargar todo (recomendado inicial):**
```bash
node scripts/download-interactions.js all && node scripts/download-nsfw-interactions.js
```

**Descargar rápido (anime solo):**
```bash
node scripts/download-interactions.js all
```

**Descargar selectivo (haz tu mix):**
```bash
node scripts/download-interactions.js kiss hug dance
node scripts/download-nsfw-interactions.js fuck yuri anal
```

---

**¡Eso es todo! El bot estará completamente funcional después.** 🚀
