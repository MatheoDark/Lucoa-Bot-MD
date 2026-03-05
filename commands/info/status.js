import fs from 'fs';
import os from 'os';

function getDefaultHostId() {
  if (process.env.HOSTNAME) {
    return process.env.HOSTNAME.split('-')[0]
  }
  return 'default_host_id'
}

function formatUptime(seconds) {
  const dias = Math.floor(seconds / 86400)
  const horas = Math.floor((seconds % 86400) / 3600)
  const minutos = Math.floor((seconds % 3600) / 60)
  const segs = Math.floor(seconds % 60)
  const partes = []
  if (dias > 0) partes.push(`${dias}d`)
  if (horas > 0) partes.push(`${horas}h`)
  if (minutos > 0) partes.push(`${minutos}m`)
  partes.push(`${segs}s`)
  return partes.join(' ')
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
    const uptime = formatUptime(process.uptime())

    const kaos = ['(◕ᴗ◕✿)', '(●\'◡\'●)', '(˶ᵔ ᵕ ᵔ˶)', '(≧◡≦)', '(✿◠‿◠)', '₍ᐢ..ᐢ₎♡']
    const kao = kaos[Math.floor(Math.random() * kaos.length)]

    const sistema = os.type()
    const cpu = os.cpus().length
    const ramTotal = (os.totalmem() / 1024 ** 3).toFixed(2)
    const ramUsada = ((os.totalmem() - os.freemem()) / 1024 ** 3).toFixed(2)
    const ramPorcentaje = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1)
    const arquitectura = os.arch()

    const mensajeEstado =
`╭─── ⋆🐉⋆ ───────────╮
│  *𝐋𝐔𝐂𝐎𝐀 𝐁𝐎𝐓* ${kao}
│  _Estado del sistema_
├─── ⋆✨⋆ ───────────╯

╭── 🐲 *Conexión* ──
│ ⏱️ *Uptime ›* ${uptime}
│ 👤 *Usuarios ›* ${userCount.toLocaleString()}
│ 👥 *Grupos ›* ${registeredGroups.toLocaleString()}
╰──────────⋆✦⋆

╭── 🖥️ *Servidor* ──
│ 💻 *Sistema ›* ${sistema}
│ ⚙️ *CPU ›* ${cpu} cores
│ 📊 *RAM ›* ${ramUsada}/${ramTotal} GB (${ramPorcentaje}%)
│ 🔧 *Arch ›* ${arquitectura}
│ 🏷️ *Host ›* ${hostId}
╰──────────⋆✦⋆

> 🐉 *${botname}* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`

    await client.reply(m.chat, mensajeEstado, m)
  }
};