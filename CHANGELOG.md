# 📜 Historial de Cambios - Lucoa-Bot-MD

## [3.5.0] - 2026-01-08
### 🚀 Nuevas Características (Major Update)
- **Motor Hydra (Pinterest/R34):** Implementado sistema de búsqueda de 3 núcleos. Si una API falla, el bot salta automáticamente a la siguiente (Widipe -> Agatz -> Web Scraping).
- **QC Detectivesco (`#qc`):** Reescribí el comando `qc.js` para detectar nombres reales.
  - Ahora busca en: Base de datos > Contacto > Grupo > PushName.
  - **Fallback:** Si no encuentra nombre, usa el número formateado (nunca más "Sin Nombre").
- **Instalador Maestro (`setup.sh`):** Nuevo script en Bash para VPS.
  - Instala automáticamente `ffmpeg`, `imagemagick`, `libwebp` y `node.js 20.x`.
  - Configura permisos y dependencias de sistema (Canvas) con un solo comando.
- **Manejador Silencioso (`main.js`):**
  - Eliminado el spam de "El comando no existe".
  - El bot ahora ignora comandos mal escritos para mantener el chat limpio.
  - Logs de consola más ordenados y coloridos.

### 🐛 Correcciones de Errores (Bug Fixes)
- **Pinterest:** Solucionado error de API caída usando *HTML Scraping* como respaldo final.
- **Stickers:** Corregido error de `ffmpeg` en servidores nuevos mediante el script de instalación.
- **Crash Handler:** Protegido `main.js` contra caídas por `settings` indefinidos en bases de datos nuevas.

### ⚙️ Cambios Técnicos
- Actualizado `package.json` para usar `node 20.x` LTS.
- Migración de `axios` a `node-fetch` en comandos ligeros para reducir consumo de RAM (excepto QC).
- Optimización de expresiones regulares para detección de prefijos.

---

## [3.0.0] - 2025-12-20
### 🌟 Lanzamiento Inicial (Recode)
- Base portada a ESM (Modules).
- Sistema de Plugins modular.
- Base de datos JSON ligera (`lowdb` / `better-sqlite3`).
