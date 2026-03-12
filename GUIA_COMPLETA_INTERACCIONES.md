# 🎬 Guía Completa - Sistema de Interacciones (Anime + NSFW)

## 📖 Tabla de Contenidos
1. [Resumen General](#resumen-general)
2. [Sistema Anime (SFW)](#sistema-anime-sfw)
3. [Sistema NSFW](#sistema-nsfw)
4. [Comandos para VPS](#comandos-para-vps)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Resumen General

Tu bot tiene un sistema **híbrido de interacciones** con dos componentes:

| Componente | Descripción | Storage | Git |
|---|---|---|---|
| **Anime (SFW)** | Reacciones normales (kiss, hug, dance, etc) | `/media/interactions/` | ✅ Committed |
| **NSFW** | Contenido +18 | `/media/nsfw_interactions/` | ❌ Local Only (.gitignore) |

### ⚡ Características Principales
- ✅ **Respuesta Instantánea**: Archivos cached localmente
- ✅ **Fallback Automático**: Si no hay local, descarga remoto
- ✅ **Auto-caché**: Las descargas remotas se guardan automáticamente
- ✅ **Flexible**: Funciona con o sin descargas previas
- ✅ **Privado**: NSFW nunca se sube al repositorio

---

# 📌 Sistema Anime (SFW)

## Estructura de Archivos

```
/media/
├── /interactions/                    ← Carpeta de anime descargada
│   ├── /kiss/
│   │   ├── 1.gif
│   │   ├── 2.gif
│   │   ├── 3.gif
│   │   └── ... (7 archivos por comando)
│   ├── /hug/
│   │   └── ...
│   ├── /dance/
│   │   └── ...
│   ├── /pat/
│   │   └── ...
│   └── ... (más comandos)
│
└── /interactions.json                ← Índice de medios locales (COMMITTED)
```

### Contenido de `interactions.json`

```json
{
  "kiss": {
    "local": [
      "media/interactions/kiss/1.gif",
      "media/interactions/kiss/2.gif",
      "media/interactions/kiss/3.gif",
      "media/interactions/kiss/4.gif",
      "media/interactions/kiss/5.gif",
      "media/interactions/kiss/6.gif",
      "media/interactions/kiss/7.gif"
    ],
    "fallback": true
  },
  "hug": {
    "local": [...],
    "fallback": true
  },
  ...
}
```

## Comandos Anime Disponibles

### Originales (50+ comandos)
`peek`, `stare`, `trip`, `sleep`, `sing`, `tickle`, `slap`, `kill`, `kiss`, `hug`, `pat`, `lick`, `cry`, `blush`, `smile`, `wave`, `highfive`, `dance`, `wink`, `happy`, `cuddle`, `poke`, `bite`, `angry`, `bleh`, `bored`, `bonk`, `bully`, `coffee`, `clap`, `cringe`, `drunk`, `dramatic`, `handhold`, `eat`, `love`, `pout`, `punch`, `run`, `scared`, `sad`, `smoke`, `spit`, `smug`, `think`, `walk`, `impregnate`, `confused`, `seduce`, `shy`... y más

### Nuevos Comandos (11 agregados)
- `kick` / `patada` - 👢 Le da una patada
- `splash` / `salpicar` - 💦 Le salpica agua
- `grab` / `agarrar` - 🤝 Lo agarrará
- `flick` / `coscorron` - 👊 Le da un coscorrón
- `comfort` / `consolar` - 💗 Lo consuela
- `freeze` / `congelar` - ❄️ Lo congela
- `shock` / `sorpresa` - ⚡ Lo sorprende
- `bite_head` / `morder_cabeza` - 🧠 Le muerde la cabeza
- `slurp` / `sorber` - 👅 Sorbe lentamente
- `knead` / `amasar` - 🥵 Lo amasa (como gato)
- `celebrate` / `celebrar` - 🎉 Celebra junto a él

## Cómo Usar el Sistema Anime

### Opción 1: Descargar Antes de Usar

```bash
# Descargar todos los comandos
node scripts/download-interactions.js all

# Descargar comandos específicos
node scripts/download-interactions.js kiss hug dance pat smile

# Re-descargar para actualizar
node scripts/download-interactions.js --force kiss hug
```

### Opción 2: Descarga Automática Bajo Demanda

Si no ejecutas el script, la primera vez que alguien use un comando:
1. Bot busca en `/media/interactions/[comando]/` (vacío)
2. Descarga de Waifu.pics
3. **Guarda automáticamente localmente**
4. Próximas ejecuciones usan el archivo local (⚡ instantáneo)

## 🢁 API Endpoints Utilizadas

### Script de Descarga: **PurrBot v2** (Mejorado)
```
https://api.purrbot.site/v2/img/sfw/{command}/gif
```
- **Estado**: ✅ Activo (2024+)
- **Ventajas**: Mejor mantenido, sin issues abiertos, más comandos
- **Respuesta**: JSON con URL en campo `link`

### Fallback en Tiempo Real: **Cascada de APIs**
1. **PurrBot v2** (Principal) - Mejor mantenido
2. **Waifu.pics** (Secundario) - Legacy pero funcional
3. **Local Cache** (Prioritario) - Si existe localmente

> **Nota**: Migramos de Waifu.pics (2021, 14 issues) a PurrBot v2 (2024+, activo)
   - Lee el archivo `interactions.json`
   - Cachea en variable global para performance
   - Se ejecuta automáticamente al cargar el comando

2. **`getLocalMedia(command)`**
   - Busca archivos locales para un comando
   - Elige uno aleatorio entre los disponibles
   - Retorna el buffer del archivo

3. **`saveMediaLocally(command, buffer)`**
   - Guarda archivos descargados remotamente
   - Actualiza automáticamente `interactions.json`
   - Crea carpetas según sea necesario

### Lógica de Búsqueda

1. Busca en `/media/interactions/[comando]/`
2. Si hay archivos → Usa uno aleatorio
3. Si no hay → Descarga de Waifu.pics
4. Guarda automáticamente para próximas ejecuciones

## Script de Descarga: `download-interactions.js`

### Uso Completo
```bash
node scripts/download-interactions.js [comandos] [flags]
```

### Ejemplos Prácticos
```bash
# Descargar comandos específicos
node scripts/download-interactions.js kiss hug dance

# Descargar todos los comandos (~200-300MB)
node scripts/download-interactions.js all

# Re-descargar ignorando existentes
node scripts/download-interactions.js --force kiss

# Ver progreso en tiempo real
node scripts/download-interactions.js kiss hug  # Muestra X/7 archivos
```

### Características
- ✅ Descarga 7 archivos por comando (personalizable)
- ✅ Evita duplicados con SHA256 hash
- ✅ Actualiza `interactions.json` automáticamente
- ✅ Muestra progreso en tiempo real
- ✅ Rate limit de 100ms entre descargas

## Uso de Espacio

- **Inicial**: 0 KB (carpeta vacía)
- **Después de 10 comandos**: ~50-100 MB
- **Todos los comandos (~60+)**: ~200-300 MB

Cada archivo GIF suele medir entre 500KB - 2MB

## Ventajas del Sistema Anime

✅ **Respuesta Instantánea**: Una vez descargados, sin latencia
✅ **Funciona Offline**: Después de descargar, funciona sin internet
✅ **Múltiples Variaciones**: 7 versiones diferentes por comando
✅ **Fallback Automático**: Si falla local, descarga remoto
✅ **Auto-caché**: Descarga remota se guarda automáticamente
✅ **Flexible**: Funciona sin descargar nada previamente

---

# 🔞 Sistema NSFW

## Cómo Funciona

### Primera Ejecución
```
Usuario escribe: #fuck @usuario2
      ↓
Bot busca en /media/nsfw_interactions/fuck/ → No hay
      ↓
Descarga de: PurrBot → Rule34 (scraping) → Waifu.pics
      ↓
Guarda automáticamente en /media/nsfw_interactions/fuck/ ← LOCAL
      ↓
Envía respuesta
```

### Siguientes Ejecuciones
```
Usuario escribe: #fuck otro_usuario
      ↓
Bot busca en /media/nsfw_interactions/fuck/ → Encuentra archivo
      ↓
Usa archivo local ⚡ (instantáneo)
      ↓
Respuesta sin latencia
```

## 🔒 Privacidad (NO se versiona)

```
⚠️ IMPORTANTE: Los archivos NSFW:
✓ Se guardan SOLO en el VPS
✓ NO se suben al repositorio Git
✓ NO se comitean
✓ Están en .gitignore
✓ Cada VPS tiene su propio caché NSFW
```

## Estructura de Archivos

```
/media/
└── nsfw_interactions/                ← LOCAL ONLY (no se versiona)
    ├── /anal/
    │   ├── 1.gif
    │   ├── 2.mp4
    │   └── ...
    ├── /fuck/
    │   └── ...
    ├── /blowjob/
    │   └── ...
    ├── /yuri/
    │   └── ...
    └── ... (más comandos)

/media/
└── nsfw_interactions.json             ← ÍNDICE LOCAL ONLY (no se versiona)
    {
      "fuck": {
        "local": [
          "media/nsfw_interactions/fuck/1.gif",
          "media/nsfw_interactions/fuck/2.mp4",
          ...
        ],
        "fallback": true
      },
      ...
    }
```

## Comandos NSFW Disponibles (25+)

| Comando | Alias ES | Descripción |
|---------|----------|-------------|
| `anal` | `anal` | Acción anal |
| `cum` | `venirse` | Orgasmo |
| `fuck` | `coger` | Relación sexual |
| `lickpussy` | `lamercoño` | Cunnilingus |
| `fap` | `paja` | Masturbación |
| `blowjob` | `bj`, `mamada` | Felación |
| `threesome` | `trio` | Trío |
| `yuri` | `yuri` | Contenido lésbico |
| `sixnine` | `69` | Posición |
| `undress` | `desnudar` | Quitarse ropa |
| `spank` | `azotar` | Bofetadas |
| `grope` | `tocar` | Tocamientos |
| `boobjob` | `pecho` | Con pechos |
| `footjob` | `pie` | Con pies |
| `suckboobs` | `chupar_pecho` | Chupar pechos |
| `grabboobs` | `agarrar_pecho` | Agarrar pechos |
| `tentacle` | `tentáculo` | Tentáculos |
| `fingering` | `dedos` | Penetración |
| `squirt` | `eyacular` | Eyaculación femenina |
| `deepthroat` | `garganta` | Garganta profunda |
| `bondage` | `atado` | Sujeción |
| `creampie` | `cremita` | Creampie |
| `gangbang` | `pandilla` | Múltiples personas |
| `facesitting` | `sentada` | Posición |
| `rimjob` | `lengua_culo` | Estimulación anal |

## Características NSFW

✅ **Auto-caché**: Descarga automática se guarda localmente
✅ **Respuesta Rápida**: Siguientes usos sin descargar
✅ **Privado**: No sube al repositorio
✅ **Fallback**: Si falla local, descarga remoto
✅ **Transparente**: El usuario no hace nada especial

## Tamaño de Almacenamiento

- **Inicial**: 0 KB (sin caché)
- **Después de 5 comandos**: ~20-30 MB
- **Después de 15 comandos**: ~50-70 MB
- **Todos (25+) comandos**: ~100-150 MB

(Dinámico: 5-10 MB por comando)

## Script de Descarga NSFW (Opcional)

```bash
# Descargar todos los comandos NSFW:
node scripts/download-nsfw-interactions.js

# Descargar comandos específicos:
node scripts/download-nsfw-interactions.js anal fuck yuri blowjob

# Crear carpetas manualmente (opcional):
mkdir -p media/nsfw_interactions/{anal,fuck,blowjob,yuri,cum}
```

⚠️ **NOTA**: Este script NO está incluido en `setup.sh`. Es completamente opcional y manual.

## Diferencia: Anime vs NSFW

| Característica | Anime | NSFW |
|---|---|---|
| **Media Descargada** | 161 archivos (197 MB committed) | 0 (crece con uso) |
| **Guardado** | En repositorio Git | Local VPS solo |
| **Distribución** | Se clona con el repo | Se crea en uso |
| **Setup.sh** | Descarga automática (paso 6) | NO se descarga (manual/automático) |
| **Actualización** | Via git pull | Automático en VPS |

---

# 🖥️ Comandos para VPS

## Resumen Rápido

Tu bot tiene dos sistemas que necesitan ser **descargados manualmente en el VPS**:

1. **Anime** (Reacciones SFW)
2. **NSFW** (Contenido +18)

Ambos se cachean localmente después de la primera descarga.

## Comandos Anime

### Descargar todo
```bash
node scripts/download-interactions.js all
```
- **Tiempo**: ~10-15 minutos
- **Espacio**: ~200 MB

### Descargar específicos
```bash
node scripts/download-interactions.js kiss hug dance pat
```

### Re-descargar (actualizar)
```bash
node scripts/download-interactions.js --force smile wave
```

## Comandos NSFW

### Descargar todos
```bash
node scripts/download-nsfw-interactions.js
```
- **Tiempo**: ~15-30 minutos
- **Espacio**: ~100+ MB

### Descargar específicos
```bash
node scripts/download-nsfw-interactions.js anal fuck yuri blowjob
```
- **Tiempo**: ~30-45 segundos por comando
- **Espacio**: ~5-10 MB por comando

## Instrucciones Paso a Paso (VPS)

### 1️⃣ Conectar y Navegar
```bash
ssh usuario@ip_del_vps
cd /ruta/del/bot
```

### 2️⃣ Opción A: Descargar SOLO Anime (Recomendado)
```bash
node scripts/download-interactions.js all
npm start
# o con PM2:
pm2 start ecosystem.config.cjs
```

### 3️⃣ Opción B: Descargar Anime + Algunos NSFW
```bash
node scripts/download-interactions.js all
node scripts/download-nsfw-interactions.js anal fuck yuri
npm start
```

### 4️⃣ Opción C: Ejecutar Setup.sh (Incluye Anime Automático)
```bash
bash setup.sh  # Descarga anime en paso 6
```

## Tabla Comparativa de Comandos

| Comando | Qué Descarga | Dónde | Tamaño | Tiempo |
|---------|------|-------|--------|--------|
| `download-interactions.js all` | Anime (SFW) completo | `/media/interactions/` | ~200 MB | ~15 min |
| `download-interactions.js kiss hug` | Anime selectivo | `/media/interactions/` | ~20-30 MB | ~2 min |
| `download-nsfw-interactions.js` | NSFW todos (R34) | `/media/nsfw_interactions/` | ~100+ MB | ~15 min |
| `download-nsfw-interactions.js anal` | NSFW selectivo (R34) | `/media/nsfw_interactions/` | ~5-10 MB | ~30 seg |

## Actualizar Archivos

### Re-descargar anime (reemplazar)
```bash
node scripts/download-interactions.js --force kiss hug dance
```

### Actualizar NSFW (agrega más)
```bash
# El script agrega nuevos archivos sin eliminar los anteriores
node scripts/download-nsfw-interactions.js fuck yuri
```

## Notas Importantes

✅ **Anime** se descarga con `setup.sh` automáticamente (paso 6)
⚠️ **NSFW** NO se descarga automáticamente (manual)
✓ Ambos sistemas cachean localmente después
✓ El bot funciona sin estos archivos (fallback remoto)
✓ Los archivos NO se suben al repositorio (privado VPS)

## Comandos Más Útiles

### Descargar todo (recomendado inicial):
```bash
node scripts/download-interactions.js all && node scripts/download-nsfw-interactions.js
```

### Descargar rápido (solo anime):
```bash
node scripts/download-interactions.js all
```

### Descargar selectivo (haz tu mix):
```bash
node scripts/download-interactions.js kiss hug dance
node scripts/download-nsfw-interactions.js fuck yuri anal
```

---

# 🆘 Troubleshooting

## ❌ Problema: Anime no descarga

**Síntomas**: El script de anime falla o deja carpetas vacías

**Soluciones**:
```bash
# Intenta de nuevo
node scripts/download-interactions.js all

# Si sigue fallando, verifica logs
npm start
# Busca errores en consola

# Intenta con comandos específicos
node scripts/download-interactions.js kiss hug
```

## ❌ Problema: NSFW lento

**Síntomas**: R34 tarda mucho o no descarga

**Soluciones**:
```bash
# R34 puede ser lento, espera o intenta después
node scripts/download-nsfw-interactions.js fuck

# Intenta con menos comandos
node scripts/download-nsfw-interactions.js fuck yuri
```

## ❌ Problema: Los archivos son muy grandes

**Síntomas**: Espacio insuficiente en VPS

**Soluciones**:
- Reducir cantidad de descargas: `download-interactions.js kiss hug` (en lugar de `all`)
- Crear un script personalizado cambiando `DOWNLOADS_PER_COMMAND = 3` (en lugar de 7)
- Usar herramientas como `giflossy` para comprimir GIFs

## ❌ Problema: El comando dice "No se pudo cargar la reacción"

**Síntomas**: Comando falla al ejecutar

**Soluciones**:
```bash
# Descargar el comando específico
node scripts/download-interactions.js [comando]

# O espera a que descargue automáticamente la primera vez
# (tardará más pero después será instantáneo)
```

## ❌ Problema: Quiero limpiar todo y re-descargar

**Síntomas**: Quieres empezar de cero

**Soluciones**:
```bash
# Limpiar anime
rm -rf media/interactions/*/

# Limpiar NSFW (local)
rm -rf media/nsfw_interactions/*/

# Limpiar índices
rm media/interactions.json
rm media/nsfw_interactions.json

# Re-descargar
node scripts/download-interactions.js all
```

## ❌ Problema: El index se corrompió

**Síntomas**: `interactions.json` o `nsfw_interactions.json` no funciona

**Soluciones**:
```bash
# Eliminar archivos corruptos
rm media/interactions.json
rm media/nsfw_interactions.json

# Los archivos se recrearán automáticamente con el siguiente uso
node scripts/download-interactions.js kiss
```

---

## ✨ Resumen Final

**Tu bot tiene dos sistemas de interacciones:**

1. **Anime (SFW)**: Descarga proactiva recomendada (`node scripts/download-interactions.js all`)
2. **NSFW**: Descarga bajo demanda automática (cachea en primer uso)

**Ambos te dan:**
- ⚡ Respuestas instantáneas después de la primera descarga
- 🛡️ Fallback automático a APIs remotas
- 📦 Crecimiento dinámico sin comprometer el repositorio
- 🔒 Privacidad para contenido NSFW

**¡Listo para usar!** 🚀
