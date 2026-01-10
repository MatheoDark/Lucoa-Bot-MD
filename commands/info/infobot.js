import os from 'os';

function rTime(seconds) {
  seconds = Number(seconds)
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return (d > 0 ? d + (d === 1 ? " día, " : " días, ") : "") +
         (h > 0 ? h + (h === 1 ? " hora, " : " horas, ") : "") +
         (m > 0 ? m + (m === 1 ? " minuto, " : " minutos, ") : "") +
         (s > 0 ? s + (s === 1 ? " segundo" : " segundos") : "")
}

export default {
  command: ['infobot', 'infosocket'],
  category: 'info',
  run: async ({ client, m }) => {
    // 1. Carga segura de configuración
    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
    const botSettings = global.db.data.settings[botId] || {}
    
    // Valores por defecto para evitar CRASH
    const botname = botSettings.namebot || 'Lucoa Bot'
    const botname2 = botSettings.namebot2 || 'Lucoa'
    const monedas = botSettings.currency || 'BitCoins'
    const banner = botSettings.banner || 'https://github.com/MatheoDark/Lucoa-Bot-MD/blob/main/media/banner2.jpg?raw=true'
    const prefijo = botSettings.prefijo || '#'
    
    // Detectar dueño de forma segura
    const owners = global.owner || []
    const firstOwner = owners[0] ? owners[0][0] + '@s.whatsapp.net' : ''
    const owner = botSettings.owner || firstOwner || ''
    
    const link = botSettings.link || 'https://github.com/MatheoDark/Lucoa-Bot-MD'
    
    // 🔥 AQUÍ FALTABA ESTA VARIABLE:
    const dev = 'MatheoDark' 

    // 2. Info del Sistema
    const platform = os.type()
    const sistemaUptime = rTime(os.uptime())
    const nodeVersion = process.version
    
    const isOficialBot = botId === (global.client?.user?.id?.split(':')[0] + "@s.whatsapp.net")
    const botType = isOficialBot ? 'Principal 👑' : 'Sub-Bot 🤖'

    try {
      const message = `🔥 *INFORMACIÓN DEL SISTEMA*

👤 *Nombre:* ${botname2}
🤖 *Tipo:* ${botType}
🪙 *Moneda:* ${monedas}
🔧 *Prefijo:* [ ${prefijo} ]

💻 *Plataforma:* ${platform}
📦 *NodeJS:* ${nodeVersion}
⏳ *Tiempo Activo:* ${sistemaUptime}
👑 *Dueño:* ${owner ? `@${owner.split('@')[0]}` : 'Desconocido'}

🔗 *Enlace:* ${link}`.trim()

      // 3. Enviar mensaje
      // Verificamos si es video/gif
      if (String(banner).match(/\.(mp4|gif|webm)$/i)) {
        await client.sendMessage(m.chat, { 
            video: { url: banner }, 
            caption: message,
            gifPlayback: true,
            contextInfo: { mentionedJid: [owner, m.sender] }
        }, { quoted: m })
      } else {
        // Si es imagen, usamos el adReply
        await client.sendMessage(m.chat, { 
            text: message,
            contextInfo: {
              mentionedJid: [owner, m.sender],
              externalAdReply: {
                title: botname,
                body: `Powered by ${dev}`, // Ahora 'dev' sí existe
                thumbnailUrl: banner,
                sourceUrl: link,
                mediaType: 1,
                renderLargerThumbnail: true
              }
            }
        }, { quoted: m })
      }

    } catch (e) {
      console.error("Error en infobot:", e)
      m.reply('❌ Ocurrió un error al obtener la información.')
    }
  }
};
