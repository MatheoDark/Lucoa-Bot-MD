import fs from 'fs';
import os from 'os';

function getDefaultHostId() {
  if (process.env.HOSTNAME) {
    return process.env.HOSTNAME.split('-')[0]
  }
  return 'default_host_id'
}

export default {
  command: ['status'],
  description: 'Muestra el estado del bot y del servidor.',
  category: 'info',
  run: async ({client, m}) => {

    const hostId = getDefaultHostId()
    const registeredGroups = global.db.data.chats ? Object.keys(global.db.data.chats).length : 0
    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net" || false
    const botSettings = global.db.data.settings[botId] || {}

    const botname = botSettings.namebot || 'Lucoa Bot'
    const botname2 = botSettings.namebot2 || 'Lucoa'
    const userCount = Object.keys(global.db.data.users).length || '0'

    const estadoBot = 
`╭─── ⋆🐉⋆ ───
│  *𝐄𝐒𝐓𝐀𝐃𝐎 𝐃𝐄 ${botname2.toUpperCase()}* (●'◡'●)
├───────────────
│ 👤 *Usuarios ›* ${userCount.toLocaleString()}
│ 👥 *Grupos ›* ${registeredGroups.toLocaleString()}
╰─── ⋆✨⋆ ───`

    const sistema = os.type()
    const cpu = os.cpus().length
    const ramTotal = (os.totalmem() / 1024 ** 3).toFixed(2)
    const ramUsada = ((os.totalmem() - os.freemem()) / 1024 ** 3).toFixed(2)
    const arquitectura = os.arch()

    const estadoServidor = 
`╭── 🐲 Servidor ──
│ 💻 *Sistema ›* ${sistema}
│ ⚙️ *CPU ›* ${cpu} cores
│ 📊 *RAM ›* ${ramUsada}/${ramTotal} GB
│ 🔧 *Arch ›* ${arquitectura}
│ 🏷️ *Host ›* ${hostId}
╰──────────⋆✦⋆`

    const mensajeEstado = `${estadoBot}\n\n${estadoServidor}`

    await client.reply(m.chat, mensajeEstado, m)
  }
};