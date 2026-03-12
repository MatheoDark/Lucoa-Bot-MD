# Sistema de Caché NSFW Local

## 📋 Resumen

El sistema **NSFW funciona de manera automática y transparente**:

### 🔄 Funcionamiento

1. **Primera Ejecución**:
   - Usuario usa un comando NSFW (ej: `#fuck`, `#anal`)
   - Bot busca en `/media/nsfw_interactions/[comando]/` (vacío la primera vez)
   - Descarga desde: PurrBot → Rule34 (scraping) → Waifu.pics
   - **Guarda automáticamente en `/media/nsfw_interactions/[comando]/`** (local)

2. **Siguientes Ejecuciones**:
   - Bot busca en `/media/nsfw_interactions/[comando]/`
   - Encuentra archivo → Usa local (instantáneo ⚡)
   - Respuesta sin latencia

### 🔒 Privacidad (NO se versiona)

```
⚠️ IMPORTANTE: Los archivos NSFW:
✓ Se guardan SOLO en el VPS
✓ NO se suben al repositorio Git
✓ NO se comitean
✓ Están en .gitignore
✓ Cada VPS tiene su propio caché NSFW
```

### 📁 Estructura

```
/media/
└── nsfw_interactions/           ← GUARDADO LOCAL SOLO (no en repo)
    ├── /anal/
    ├── /fuck/
    ├── /blowjob/
    ├── /yuri/
    └── ... (más comandos)

/media/
└── nsfw_interactions.json       ← ÍNDICE LOCAL SOLO (no en repo)
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

### ⚙️ Características

✅ **Auto-caché**: Descarga automática se guarda localmente
✅ **Respuesta rápida**: Siguientes usos sin descargar
✅ **Privado**: No sube al repositorio
✅ **Fallback**: Si falla local, descarga remoto
✅ **Transaparente**: El usuario no hace nada especial

### 📝 Comandos NSFW Disponibles (25+)

| Comando | Alias ES | Descripción |
|---------|----------|-------------|
| `anal` | `anal` | Acción anal |
| `cum` | `venirse` | Orgasmo |
| `fuck` | `coger` | Relación sexual |
| `lickpussy` | `lamercoño` | Cunnilingus |
| `fap` | `paja` | Masturbación |
| `blowjob` | `bj`, `mamada` | Felación |
| ... y más | ... | ... |

### 🔧 Scripts de Descarga

Si quieres descargar algunos comandos NSFW manualmente:

```bash
# Script disponible (opcional):
node scripts/download-nsfw-interactions.js anal fuck yuri
```

⚠️ **NOTA**: Este script NO está incluido en setup.sh. Es completamente opcional y manual.

### 💾 Tamaño de Almacenamiento

- **Inicial**: 0 KB (sin caché)
- **Después de usar 5 comandos**: ~20-30 MB
- **Después de usar 15 comandos**: ~50-70 MB
- **Após usar 25+ comandos**: ~100-150 MB

### ✅ Ejemplo de Uso

```plaintext
Usuario escribe: #fuck @usuario2

Bot:
1. Busca en /media/nsfw_interactions/fuck/ → No hay
2. Descarga de PurrBot/Rule34/Waifu.pics
3. Guarda en /media/nsfw_interactions/fuck/1.gif
4. Envía respuesta

Usuario escribe: #fuck otro_usuario

Bot:
1. Busca en /media/nsfw_interactions/fuck/ → Encuentra 1.gif
2. Lo envía instantáneamente ⚡
```

### 🚀 Comandos Recomendados para Descargar

Si quieres pre-descargar los 5 más usados:

```bash
# Crear carpetas manualmente (opcional):
mkdir -p media/nsfw_interactions/{anal,fuck,blowjob,yuri,cum}
```

El caché se llenará automáticamente con el uso.

### 📖 Diferencia: Anime vs NSFW

| Característica | Anime | NSFW |
|---|---|---|
| **Media Descargada** | 161 archivos (197 MB committed) | 0 (crece con uso) |
| **Guardado** | En repositorio Git | Local VPS solo |
| **Distribución** | Se clona con el repo | Se crea en uso|
| **Setup.sh** | Descarga automática (paso 6) | NO se descarga (manual/automático) |
| **Actualización** | Via git pull | Automático en VPS |

### ⚡ Ventajas del Sistema

✓ **Privacidad total**: Archivos NSFW nunca llegan al repo
✓ **Respuesta rápida**: Cache local después de primera descarga
✓ **Automático**: No requiere intervención del usuario
✓ **Flexible**: Funciona con o sin caché
✓ **Escalable**: Crece bajo demanda
✓ **Fallback seguro**: Sempre tiene respaldo remoto

---

**En resumen**: El NSFW funciona de forma "set and forget" - descarga y cachea automáticamente sin que hagas nada especial. 🚀
