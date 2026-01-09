# 📜 Historial de Cambios - Lucoa-Bot-MD

Todas las modificaciones notables de este proyecto serán documentadas en este archivo.

## [3.5.0] - 2026-01-08 (Versión Actual)
### 🚀 Novedades Principales (New Features)
- **Motor Hydra (Pinterest/R34):** Nuevo sistema de búsqueda inteligente de 3 núcleos. Si una API falla, el bot salta automáticamente a la siguiente (Widipe -> Agatz -> Web Scraping) para evitar caídas.
- **QC Detectivesco (`#qc`):** El comando de sticker de texto ahora detecta automáticamente el nombre real del usuario.
  - Busca en: Base de Datos > Contacto > Grupo > PushName.
  - *Fallback:* Si no encuentra nombre, usa el número de teléfono formateado (nunca más "Sin Nombre").
- **Instalador Maestro (`setup.sh`):** Nuevo script automático para VPS.
  - Se ejecuta solo al hacer `npm install`.
  - Instala `ffmpeg`, `imagemagick` y librerías de sistema (`canvas`) sin intervención manual.
- **Manejador Silencioso (`main.js`):**
  - Eliminado el spam de "El comando no existe".
  - El bot ahora ignora mensajes mal escritos para mantener el chat limpio.
  - Logs de consola optimizados y con colores.

### 🛠️ Mejoras Técnicas (Improvements)
- **Modo Pack Automático:** El comando `#r34` ahora envía packs de 5 imágenes/videos automáticamente en lugar de una sola.
- **Node-Fetch:** Migración de `axios` a `node-fetch` en comandos ligeros para reducir el consumo de memoria RAM.
- **Estabilidad:** Se agregó un bloque `try-catch` global en `main.js` para evitar que el bot se apague si la base de datos está corrupta o incompleta.

### 🐛 Correcciones de Errores (Bug Fixes)
- **Pinterest:** Solucionado el error "API Key inválida" mediante el uso de Scraping HTML directo como respaldo.
- **Stickers en VPS:** Corregido el error de `ffmpeg not found` gracias al nuevo script de instalación.
- **Crash Loop:** Solucionado el reinicio infinito cuando `global.db` no tenía la configuración de `settings` inicializada.

---

## [3.0.0] - 2025-12-20
### 🌟 Lanzamiento Inicial (Recode)
- Base portada completamente a ESM (ECMAScript Modules).
- Sistema de Plugins modular.
- Base de datos JSON ligera.

---

## [3.5.1] - 2026-01-09
### 🛠️ Mejoras de Estabilidad y Seguridad

#### 🔧 Correcciones de Código
- **antilink.js:** Eliminado código duplicado en la eliminación de mensajes con enlaces.
- **sticker.js:** Mejorado el manejo de archivos temporales con validación `fs.existsSync()` antes de eliminar.
- **sticker.js:** Añadidas validaciones null-safe para `botSettings`, `user` y `chatUsers` evitando crashes.
- **ping.js:** Añadido acceso null-safe a `global.db.data.settings` con fallback a 'Lucoa-Bot'.
- **events.js:** Mejorada la obtención de configuración del bot con operador optional chaining (`?.`).
- **events.js:** Corregido el acceso a `jid` de participantes para evitar errores cuando `phoneNumber` es undefined.

#### 🛡️ Prevención de Memory Leaks
- **lib/utils.js:** Añadido sistema de límite de cache (`MAX_CACHE_SIZE = 2000`) para `groupMetadataCache` y `lidCache`.
- **lib/utils.js:** Nueva función `limitCacheSize()` que elimina entradas antiguas cuando el cache excede el límite.

#### 🔒 Validaciones de Base de Datos
- **lib/system/initDB.js:** Añadida validación para `m.sender` y `m.chat` antes de inicializar.
- **lib/system/initDB.js:** Asegurada la existencia de `global.db.data.settings`, `users` y `chats` antes de acceder.
