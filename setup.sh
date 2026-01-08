#!/bin/bash

echo "🐉 INICIANDO INSTALACIÓN DE LUCOA-BOT MD..."
echo "---------------------------------------------------"

# 1. DETECTAR SISTEMA Y ACTUALIZAR (Solo Linux/Debian/Ubuntu)
if [ -f /etc/debian_version ]; then
    echo "📦 Detectado sistema Linux (Debian/Ubuntu). Actualizando repositorios..."
    
    # Actualizamos lista de paquetes para evitar errores 404
    sudo apt-get update -y
    sudo apt-get upgrade -y
    
    echo "🛠️ Instalando FFmpeg, ImageMagick y WebP (Vitales para Stickers)..."
    # FFmpeg: Para video/audio. ImageMagick: Para stickers. WebP: Para stickers animados.
    sudo apt-get install -y ffmpeg imagemagick webp git zip unzip curl gnupg
    
    echo "🎨 Instalando dependencias para 'canvas' (Vitales para bienvenidas)..."
    # Sin esto, 'npm install canvas' fallará siempre
    sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
else
    echo "⚠️ No estás en un VPS Debian/Ubuntu. Si estás en Windows, instala FFmpeg manualmente."
fi

echo "---------------------------------------------------"

# 2. INSTALAR NODE.JS 20 (Si no existe o es muy viejo)
# Tu package.json pide node >= 21.7.3, pero la 20 LTS es más estable para bots.
# Si prefieres la última, cambia setup_20.x por setup_current.x
if ! command -v node &> /dev/null; then
    echo "🟢 Node.js no detectado. Instalando versión LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js ya está instalado: $(node -v)"
fi

echo "---------------------------------------------------"

# 3. INSTALAR LIBRERÍAS DEL BOT (Lee tu package.json)
echo "📥 Instalando librerías del bot (npm install)..."
# Usamos --no-bin-links para evitar errores en carpetas compartidas de Windows/Linux
npm install

echo "---------------------------------------------------"

# 4. INSTALAR PM2 (Para mantener el bot vivo 24/7)
if ! command -v pm2 &> /dev/null; then
    echo "⚡ Instalando PM2..."
    sudo npm install -g pm2
fi

# 5. PERMISOS DE EJECUCIÓN
chmod +x index.js
chmod +x main.js

echo "✅ ¡INSTALACIÓN COMPLETADA! 🐉"
echo "---------------------------------------------------"
echo "Para iniciar el bot usa: npm start"
echo "Para dejarlo 24/7 usa: pm2 start index.js --name Lucoa"
echo "---------------------------------------------------"
