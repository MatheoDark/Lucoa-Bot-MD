# Sistema de Interacciones Descargadas - Guía Completa

## 📋 Resumen de Cambios

Se ha implementado un sistema **híbrido** para las interacciones de anime (`#kiss`, `#hug`, `#dance`, etc):

1. **Almacenamiento Local**: Archivos GIF/MP4 descargados localmente en `/media/interactions/`
2. **Caché Automático**: Los archivos descargados se guardan automáticamente para futuras ejecuciones
3. **Fallback Remoto**: Si no hay archivos locales, descarga de Waifu.pics en tiempo real
4. **10+ Comandos Nuevos**: Se agregaron 11 nuevos comandos de interacción

---

## 🚀 Cómo Usar

### Opción 1: Descargar Comandos Específicos

```bash
# Descargar algunos comandos populares
node scripts/download-interactions.js kiss hug dance pat smile

# O descargar todos de una vez (requiere ~200-300MB)
node scripts/download-interactions.js all

# Re-descargar un comando (para actualizar archivos)
node scripts/download-interactions.js --force kiss
```

### Opción 2: Dejar que se Descarguen Automáticamente

Si no ejecutas el script, la primera vez que alguien use un comando:
1. Buscará en la carpeta local (no encontrará nada)
2. Descargará de Waifu.pics
3. **Guardará el archivo localmente automáticamente**
4. Próximas ejecuciones usarán el archivo local (respuesta instantánea)

---

## 📁 Estructura de Archivos

```
/media/
├── /interactions/              ← NUEVA CARPETA
│   ├── /kiss/
│   │   ├── 1.gif
│   │   ├── 2.gif
│   │   ├── 3.gif
│   │   └── ...
│   ├── /hug/
│   ├── /dance/
│   ├── /pat/
│   └── ... (más comandos)
│
└── /interactions.json          ← NUEVO FILE (índice de medios locales)
    Ejemplos:
    {
      "kiss": {
        "local": ["media/interactions/kiss/1.gif", "media/interactions/kiss/2.gif", ...],
        "fallback": true
      },
      ...
    }
```

---

## ✅ Comandos Implementados

### Originales (70+ comandos)
`peek`, `stare`, `trip`, `sleep`, `sing`, `tickle`, `slap`, `kill`, `kiss`, `hug`, `pat`, `lick`, `cry`, `blush`, `smile`, `wave`, `highfive`, `dance`, `wink`, `happy`, `cuddle`, `poke`, `bite`, `angry`, `bleh`, `bored`, `bonk`, `bully`, `coffee`, `clap`, `cringe`, `drunk`, `dramatic`, `handhold`, `eat`, `love`, `pout`, `punch`, `run`, `scared`, `sad`, `smoke`, `spit`, `smug`, `think`, `walk`, `impregnate`, `confused`, `seduce`, `shy`... y más

### Nuevos Comandos (11 comandos)
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

---

## 📊 Uso de Espacio

Por defecto (Opción de descarga gradual):
- **Inicial**: 0 KB (carpeta vacía)
- **Después de descargar 10 comandos**: ~50-100 MB
- **Todos los comandos (~60+)**: ~200-300 MB

Cada archivo GIF suele medir entre 500KB - 2MB

---

## ⚙️ Detalles Técnicos

### Funciones Nuevas en `/commands/anime/inter.js`:

1. **`loadLocalInteractions()`**
   - Lee el archivo `interactions.json`
   - Cachea en variable global para performance
   - Se ejecuta automáticamente

2. **`getLocalMedia(command)`**
   - Busca archivos locales para un comando
   - Elige uno aleatorio entre los disponibles
   - Retorna el buffer del archivo

3. **`saveMediaLocally(command, buffer)`**
   - Guarda archivos descargados remotamente
   - Actualiza automáticamente `interactions.json`
   - Crea carpetas según sea necesario

4. **Lógica de búsqueda (en función `run()`)**:
   1. Busca en `/media/interactions/[comando]/`
   2. Si no hay, descarga de Waifu.pics
   3. Guarda automáticamente para próximas ejecuciones

---

## 🔧 Script de Descarga: `download-interactions.js`

**Uso completo**:
```bash
node scripts/download-interactions.js [comandos] [flags]
```

**Ejemplos**:
```bash
# Descargar comandos específicos
node scripts/download-interactions.js kiss hug dance

# Descargar todos los comandos
node scripts/download-interactions.js all

# Re-descargar ignorando archivos existentes
node scripts/download-interactions.js --force kiss

# Ver progreso
node scripts/download-interactions.js kiss hug # Muestra X/7 archivos
```

**Características**:
- Descarga 7 archivos por comando (personalizable en código)
- Evita duplicados por SHA256 hash
- Actualiza `interactions.json` automáticamente
- Muestra progreso en tiempo real
- Rate limit de 100ms entre descargas

---

## 🎯 Ventajas del Sistema

✅ **Respuesta Instantánea**: Una vez descargados, los comando responden sin latencia
✅ **Funciona Sin Internet**: Después de descargar, funciona offline
✅ **Múltiples Variaciones**: 7 archivos diferentes por comando (no repite)
✅ **Fallback Automático**: Si falla local, descarga remoto
✅ **Auto-Caché**: Descarga remota se guarda automáticamente
✅ **Flexible**: Puede ejecutar comandos sin descargar nada previamente

---

## 🚨 Cambios en el Código

### Archivos Modificados:
- `/commands/anime/inter.js`: Agregadas funciones de caché local y 11 nuevos comandos

### Archivos Creados:
- `/media/interactions.json`: Índice de archivos locales
- `/scripts/download-interactions.js`: Script de bulk-download
- `/media/interactions/`: Carpeta para almacenar GIFs/MP4s

### Sin cambios:
- Captions, símbolos, y toda la lógica de detección de tipos
- Funciones de ffmpeg (GIF→MP4)
- Formato de mensajes
- Compatibilidad total con comandos anteriores

---

## 📝 Ejemplo de Contenido de `interactions.json`

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
    "local": [
      "media/interactions/hug/1.gif",
      ...
    ],
    "fallback": true
  },
  ...
}
```

---

## 🔄 Próximos Pasos (Opcionales)

1. **Ejecutar el script**: `node scripts/download-interactions.js all`
2. **Probar comandos**: `#kiss`, `#hug`, `#dance`, etc.
3. **Ajustar cantidad**: Cambiar `DOWNLOADS_PER_COMMAND = 7` en el script
4. **Comprimir**: Usar herramientas de optimización de GIFs para reducir tamaño

---

## ❌ Troubleshooting

**Problema**: El comando dice "No se pudo cargar la reacción"
- **Solución**: Ejecuta `node scripts/download-interactions.js [comando]` para descargar
- **Alternativa**: Espera a que descargue automáticamente la primera vez

**Problema**: Los archivos son muy grandes
- **Solución**: Reducir `DOWNLOADS_PER_COMMAND` a 3-4 en el script
- **Solución**: Usar herramientas como `giflossy` para comprimir GIFs

**Problema**: Quiero actualizar los archivos
- **Solución**: `node scripts/download-interactions.js --force [comando]`

---

## ✨ Conclusión

Ahora tus comandos de interacción:
- ⚡ **Son instantáneos** (responden sin descargar cada vez)
- 🎨 **Tienen variedad** (7 versiones diferentes por comando)
- 🛡️ **Son resilientes** (fallan a remoto si es necesario)
- 📦 **Crecen gradualmente** (descarga bajo demanda)
