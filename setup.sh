#!/bin/bash

# COLORES PARA QUE SE VEA PRO
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}   🐉 INSTALADOR DEFINITIVO LUCOA-BOT MD 🐉   ${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 1. MEMORIA SWAP (Anti-Crash para VPS de 1GB/2GB RAM)
# npm install canvas suele explotar la RAM. Esto crea 2GB de RAM falsa en disco.
if [ ! -f /swapfile ]; then
    echo -e "${YELLOW}💾 Creando memoria SWAP de 2GB para evitar crashes...${NC}"
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo -e "${GREEN}✅ SWAP creada correctamente.${NC}"
else
    echo -e "${GREEN}✅ Memoria SWAP ya existe.${NC}"
fi

echo -e "${CYAN}---------------------------------------------------${NC}"

# 2. SISTEMA Y DEPENDENCIAS
if [ -f /etc/debian_version ]; then
    echo -e "${YELLOW}📦 Actualizando sistema y librerías gráficas...${NC}"
    sudo apt-get update -y
    # Instalamos todo lo necesario para Canvas, Audio y Python
    sudo apt-get install -y ffmpeg imagemagick webp git zip unzip curl gnupg python3 python3-pip build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
else
    echo -e "${RED}⚠️ No estás en Debian/Ubuntu. Instala dependencias manualmente.${NC}"
fi

echo -e "${CYAN}---------------------------------------------------${NC}"

# 3. NODE.JS 22 (Instalación/Actualización Forzada)
echo -e "${YELLOW}🟢 Verificando Node.js...${NC}"
# Siempre ejecutamos el setup para asegurar que los repositorios apunten a la v22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
echo -e "${GREEN}✅ Node.js instalado: $(node -v)${NC}"

echo -e "${CYAN}---------------------------------------------------${NC}"

# 4. YT-DLP (VERSIÓN NIGHTLY OBLIGATORIA)
# La versión 'stable' ya no sirve para VPS. Usamos Nightly.
echo -e "${YELLOW}☢️ Instalando yt-dlp (Versión Nightly Anti-Bloqueos)...${NC}"
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
# Forzamos actualización a la versión de desarrollo
sudo /usr/local/bin/yt-dlp --update-to nightly

if command -v yt-dlp &> /dev/null; then
    echo -e "${GREEN}✅ yt-dlp instalado y actualizado.${NC}"
else
    echo -e "${RED}❌ Error instalando yt-dlp.${NC}"
fi

echo -e "${CYAN}---------------------------------------------------${NC}"

# 5. INSTALACIÓN DE BOT
echo -e "${YELLOW}📥 Instalando módulos de NPM...${NC}"
npm install --no-audit

echo -e "${CYAN}---------------------------------------------------${NC}"

# 6. CONFIGURAR LIMPIEZA AUTOMÁTICA (CRON)
# Agrega la tarea de borrar tmp los domingos si no existe ya
CRON_JOB="0 0 * * 0 rm -rf $(pwd)/tmp/*"
(crontab -l 2>/dev/null | grep -F "$CRON_JOB") || (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
echo -e "${GREEN}✅ Limpieza automática de /tmp configurada (Domingos 00:00).${NC}"

# 7. GESTIÓN DE PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚡ Instalando PM2...${NC}"
    sudo npm install -g pm2
fi

# Permisos
chmod +x index.js
chmod +x main.js

echo -e "${YELLOW}🔄 Configurando proceso del bot...${NC}"
# Si el bot ya corre, lo reinicia. Si no, lo inicia.
if pm2 list | grep -q "Lucoa"; then
    pm2 restart Lucoa
    echo -e "${GREEN}♻️ Bot reiniciado.${NC}"
else
    pm2 start index.js --name Lucoa
    echo -e "${GREEN}🚀 Bot iniciado.${NC}"
fi

# Guardar configuración para que inicie al prender el VPS
pm2 save
pm2 startup | tail -n 1 > /dev/null

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ ¡INSTALACIÓN COMPLETADA EXITOSAMENTE! 🐉${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
