#!/bin/bash

echo "🐉 INICIANDO INSTALACIÓN DE LUCOA-BOT MD..."
echo "---------------------------------------------------"

# 1. DETECTAR SISTEMA Y ACTUALIZAR (Solo Linux/Debian/Ubuntu)
if [ -f /etc/debian_version ]; then
    echo "📦 Detectado sistema Linux (Debian/Ubuntu). Actualizando repositorios..."
    
    # Actualizamos lista de paquetes
    sudo apt-get update -y
    sudo apt-get upgrade -y
    
    echo "🛠️ Instalando Herramientas del Sistema (FFmpeg, Python, Git)..."
    # AGREGADO: python3 y python3-pip (Necesarios para yt-dlp)
    sudo apt-get install -y ffmpeg imagemagick webp git zip unzip curl gnupg python3 python3-pip
    
    echo "🎨 Instalando dependencias para 'canvas'..."
    sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
else
    echo "⚠️ No estás en un VPS Debian/Ubuntu. Asegúrate de instalar FFmpeg y Python manualmente."
fi

echo "---------------------------------------------------"

# 2. INSTALAR MOTOR DE DESCARGAS (yt-dlp) - ¡SOLUCIÓN NUCLEAR!
echo "☢️ Instalando motor de descargas yt-dlp (Anti-Bloqueos)..."

# Descargar el binario oficial
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp

# Dar permisos de ejecución
sudo chmod a+rx /usr/local/bin/yt-dlp

if command -v yt-dlp &> /dev/null; then
    echo "✅ yt-dlp instalado correctamente: $(yt-dlp --version)"
else
    echo "❌ Error instalando yt-dlp. Revisa tu conexión."
fi

echo "---------------------------------------------------"

# 3. INSTALAR NODE.JS 22 (Requerido por tu package.json)
if ! command -v node &> /dev/null; then
    echo "🟢 Node.js no detectado. Instalando versión 22..."
    # CAMBIO: Usamos setup_22.x porque tu bot requiere Node >= 22
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js ya está instalado: $(node -v)"
fi

echo "---------------------------------------------------"

# 4. INSTALAR LIBRERÍAS DEL BOT
echo "📥 Instalando librerías del bot (incluyendo grapheme-splitter)..."
npm install

echo "---------------------------------------------------"

# 5. INSTALAR PM2 (Para mantener el bot vivo 24/7)
if ! command -v pm2 &> /dev/null; then
    echo "⚡ Instalando PM2..."
    sudo npm install -g pm2
fi

# 6. PERMISOS DE EJECUCIÓN
chmod +x index.js
chmod +x main.js

echo "✅ ¡INSTALACIÓN COMPLETADA! 🐉"
echo "---------------------------------------------------"
echo "Para iniciar el bot usa: npm start"
echo "Para dejarlo 24/7 usa: pm2 start index.js --name Lucoa"
echo "---------------------------------------------------"
