<h1 align="center">🐉 LUCOA-BOT-MD V3.5 🐉</h1>

<p align="center">
  <a href="https://github.com/MatheoDark/Lucoa-Bot-MD">
    <img src="media/lucoa-anime-waving-ql3s2yfn0dzu4e75.gif" alt="Lucoa Banner" width="100%" style="border-radius: 10px;">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Versión-3.5.0-red?style=for-the-badge&logo=github">
  <img src="https://img.shields.io/badge/Autor-MatheoDark-blue?style=for-the-badge&logo=visualstudiocode">
  <img src="https://img.shields.io/badge/Base-Baileys-green?style=for-the-badge&logo=whatsapp">
  <img src="https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs">
</p>

<p align="center">
  <a href="https://chat.whatsapp.com/BUuAq6aUBZ33pxaBUUWeFc">
    <img src="https://img.shields.io/badge/UNIRSE%20AL%20GRUPO%20OFICIAL-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Grupo WhatsApp">
  </a>
</p>

---

## 📝 Descripción

**Lucoa-Bot-MD** es un bot de WhatsApp recodificado, enfocado en la **estabilidad, velocidad y funciones avanzadas**. 
Esta versión elimina errores comunes de bots públicos, optimiza el consumo de RAM y cuenta con un sistema de instalación automatizado para VPS.

### ✨ Novedades Épicas (V3.5)

| Característica | Descripción |
| :--- | :--- |
| 🐍 **Motor Hydra** | Búsqueda inteligente en `#pinterest` y `#r34`. Si una API falla, salta a la siguiente automáticamente. |
| 🤫 **Modo Silencioso** | El bot ya no hace spam de "comando no existe". Si te equivocas, simplemente te ignora. |
| 🕵️‍♂️ **QC Detectivesco** | El comando `#qc` ahora detecta automáticamente el nombre real, apodo o número. ¡Adiós al "Sin Nombre"! |
| ⚡ **Instalador Mágico** | Nuevo script `setup.sh` que instala FFmpeg, ImageMagick y dependencias con un solo comando. |
| 🔞 **Anti-Bloqueo** | Scraping directo para comandos NSFW. Funciona incluso sin API Keys. |
| 🛡️ **Base de Datos** | Sistema `global.db` robusto que evita caídas si se reinicia el bot. |

---

## 🛠️ Instalación

### 🖥️ Opción 1: VPS / Servidor (Ubuntu/Debian) - ¡RECOMENDADO! 🚀

Olvídate de instalar cosas manualmente. Hemos creado un instalador universal.

1. **Clonar el repositorio:**
```
git clone https://github.com/MatheoDark/Lucoa-Bot-MD
cd Lucoa-Bot-MD

```

2. **Ejecutar el Instalador Maestro:**
*(Esto instalará FFmpeg, Node.js, ImageMagick y todas las librerías automáticamente)*

```bash
chmod +x setup.sh
./setup.sh

```

3. **Escanear código QR:**

```bash
npm start

```

---

### 📱 Opción 2: Termux (Android)

Si usas el bot en tu celular:

```bash
termux-setup-storage
apt update && apt upgrade -y
pkg install git nodejs ffmpeg imagemagick -y
git clone [https://github.com/MatheoDark/Lucoa-Bot-MD](https://github.com/MatheoDark/Lucoa-Bot-MD)
cd Lucoa-Bot-MD
npm install
npm start

```

---

## ⚙️ Comandos Destacados

<details>
<summary>🔎 <b>Búsquedas e Imágenes</b></summary>

* `#pinterest <texto>` - Motor Hydra (Multi-API + Scraping).
* `#imagen <texto>` - Búsqueda en Google Images.
* `#sticker` - Crea stickers (imágenes o videos).
* `#qc <texto>` - Crea stickers de texto estilo iPhone.

</details>

<details>
<summary>🔞 <b>Zona NSFW (Premium)</b></summary>

* `#r34 <tag>` - Busca packs automáticos (5 imágenes) sin censura.
* `#hentaivid` - Descarga videos aleatorios (API V3 reparada).
* `#gelbooru` - Buscador avanzado de anime.

</details>

<details>
<summary>👑 <b>Administración y Utils</b></summary>

* `#setname <nombre>` - Establece tu apodo global para el bot.
* `#delname` - Borra tu apodo.
* `#kick @tag` - Expulsar usuarios.
* `#menu` - Muestra todos los comandos disponibles.

</details>

---

## 📁 Estructura del Proyecto

```text
Lucoa-Bot-MD/
├── 📂 commands/       # Plugins y comandos (sistema modular)
├── 📂 lib/            # Funciones internas y utilidades
├── 📜 main.js         # Núcleo del bot (Manejador silencioso)
├── 📜 index.js        # Archivo de conexión (Baileys)
├── 📜 setup.sh        # 🚀 Script de instalación automática
└── 📜 settings.js     # Configuración de propietario

```

---

## 👑 Créditos & Autores

* **MatheoDark** - *Desarrollador Principal, Fixes V3, Motor Hydra & Setup Script*
* **David Chian / Megumin** - *Base Original*
* **Baileys Library** - *Conexión WhatsApp Multi-Device*

---

## 📜 Historial de Cambios

Para ver todas las actualizaciones, mejoras y correcciones de errores, consulta el archivo **[CHANGELOG.md](CHANGELOG.md)**.

---

<p align="center">
<i>Desarrollado con ❤️ y mucho café por <b>MatheoDark</b></i>


## 📜 Licencia
Este proyecto es **software libre** bajo la licencia MIT.

## 🤝 Créditos obligatorios
Si utilizas este bot, su código o partes del mismo:

- Debes mantener el archivo LICENSE
- Debes mencionar al autor original: **Matheo-Dark**
- Debes enlazar el repositorio original

Ejemplo de crédito correcto:
> Basado en Lucoa-Bot-MD por Matheo-Dark  
> https://github.com/MatheoDark/lucoa-bot-md


<i>Copyright © 2025 Lucoa-Bot-MD</i>
</p>

