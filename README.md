<h1 align="center">🐉 LUCOA-BOT-MD 🐉</h1>

<p align="center">
  <a href="https://github.com/MatheoDark/Lucoa-Bot-MD">
    <img src="media/lucoa-anime-waving-ql3s2yfn0dzu4e75.gif" alt="Lucoa Banner" width="100%">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Versión-3.5.0-red?style=for-the-badge&logo=github">
  <img src="https://img.shields.io/badge/Autor-MatheoDark-blue?style=for-the-badge&logo=whatsapp">
  <img src="https://img.shields.io/badge/Base-Baileys-green?style=for-the-badge&logo=node.js">
</p>

<p align="center">
  <a href="https://chat.whatsapp.com/BUuAq6aUBZ33pxaBUUWeFc">
    <img src="https://img.shields.io/badge/UNIRSE%20AL%20GRUPO%20OFICIAL-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Grupo WhatsApp">
  </a>
</p>

---

---

## 📝 Descripción

**Lucoa-Bot-MD** es una versión recodificada, estable y optimizada del bot de WhatsApp. Esta versión (V3.5) se centra en la estabilidad 24/7, la corrección de errores de API y la implementación de **Web Scraping** para comandos NSFW, garantizando funcionamiento sin bloqueos.

### ✨ Novedades de esta versión (V3.5)
* 🛠️ **Estructura V3:** Migración completa de comandos a formato `export default { run: ... }`.
* 🔞 **R34 Mejorado:** Sistema *Anti-Bloqueo* que usa Web Scraping (sin API Key) para saltar restricciones.
* 📦 **Modo Pack:** El comando `#r34` ahora envía automáticamente packs de 5 fotos/videos.
* 🎥 **HentaiVid Fix:** Reparado el descargador de videos aleatorios con `node-fetch`.
* 🛡️ **Seguridad:** Eliminación de archivos inestables (Hangman) y dependencias rotas.
* 🚀 **PM2 Ready:** Optimizado para correr 24/7 en servidores VPS sin apagarse.

---

## 🛠️ Instalación

### 💻 Termux (Android)

```bash
termux-setup-storage
apt update && apt upgrade -y
pkg install git nodejs ffmpeg imagemagick -y
git clone [https://github.com/MatheoDark/Lucoa-Bot-MD](https://github.com/MatheoDark/Lucoa-Bot-MD)
cd Lucoa-Bot-MD
npm install
npm start
```
### 🖥️ VPS / Servidor (Ubuntu/Debian)

1. **Instalar dependencias:**

```bash
sudo apt update
sudo apt install nodejs git ffmpeg libwebp -y

```

2. **Clonar e instalar:**

```bash
git clone [https://github.com/MatheoDark/Lucoa-Bot-MD](https://github.com/MatheoDark/Lucoa-Bot-MD)
cd Lucoa-Bot-MD
npm install

```

3. **Ejecutar con PM2 (Recomendado para 24/7):**

```bash
npm install -g pm2
pm2 start index.js --name "Lucoa"
pm2 save
pm2 startup

```

---

## ⚙️ Comandos Destacados

| Comando | Descripción | Categoría |
| --- | --- | --- |
| `#menu` | Muestra la lista completa de comandos. | Principal |
| `#r34 <tag>` | Busca packs (5) de imágenes/videos en Rule34 (Anti-Ban). | NSFW |
| `#hentaivid` | Descarga un video Hentai aleatorio (API V3). | NSFW |
| `#s` | Convierte imagen/video a Sticker. | Maker |

---

## 👑 Créditos & Autores

* **MatheoDark** - *Desarrollador Principal, Fixes V3, Web Scraping R34*
* **David Chian / Megumin** - *Base Original*
* **Baileys Library** - *Conexión WhatsApp*

---

<p align="center">
<i>Desarrollado con ❤️ por MatheoDark</i>
</p>

```

```
