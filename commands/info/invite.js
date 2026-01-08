import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

// Leer versión manualmente o definirla para evitar errores
let version = '3.5.0'

function msToTime(duration) {
  const milliseconds = parseInt((duration % 1000) / 100)
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
}

const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i

export default {
  command: ['invite', 'invitar'],
  category: 'info',
  run: async ({ client, m, args }) => {
    // 1. CORRECCIÓN DE RUTA DE USUARIO
    // Usamos global.db.data.users, no chats...users
    const user = global.db.data.users[m.sender] || {}
    if (!user.jointime) user.jointime = 0

    // 2. Cooldown
    const cooldown = 600000 // 10 min
    const nextTime = user.jointime + cooldown
    if (new Date() - user.jointime < cooldown) {
      return m.reply(`⏳ Espera *${msToTime(nextTime - new Date())}* para enviar otra invitación.`)
    }

    // 3. Validar Link
    const link = args.join(' ')
    if (!link || !link.match(linkRegex)) {
      return m.reply('❌ *Falta el enlace válido.*\n\nDebes escribir el comando junto al link de tu grupo.\nEjemplo: `#invite https://chat.whatsapp.com/ABCD123...`')
    }

    // Datos del bot
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId] || {}
    const botname = botSettings.namebot2 || 'Lucoa Bot'

    // Obtener destinatarios (Dueños y Mods)
    const owners = global.owner?.map(o => o[0]) || []
    const mods = global.mods || []
    const recipients = [...new Set([...owners, ...mods])] // Eliminar duplicados

    if (recipients.length === 0) {
        return m.reply('⚠️ No hay dueños configurados para recibir la invitación.')
    }

    // Nombre del grupo origen
    let grupo = 'Chat Privado'
    if (m.isGroup) {
        try {
            const metadata = await client.groupMetadata(m.chat)
            grupo = metadata.subject
        } catch {}
    }

    const userName = m.pushName || 'Usuario'

    const sugg = `❀ 𝗦𝗢𝗟𝗜𝗖𝗜𝗧𝗨𝗗 𝗥𝗘𝗖𝗜𝗕𝗜𝗗𝗔

✩ *Usuario ›* ${userName}
✿ *Enlace ›* ${link}
✿ *Origen ›* ${grupo}

➤ 𝗜𝗡𝗙𝗢 𝗕𝗢𝗧
★ *Nombre ›* ${botname}
❐ *Versión ›* ${version}`

    // Enviar a los dueños
    let enviados = 0
    for (const num of recipients) {
      const jid = `${num}@s.whatsapp.net`
      try {
        await client.sendMessage(jid, { text: sugg, mentions: [m.sender] })
        enviados++
      } catch (e) {
        // Error silencioso al enviar a un admin específico
      }
    }

    if (enviados > 0) {
        await m.reply('ꕥ Enlace de invitación enviado con éxito a los Desarrolladores.')
        user.jointime = new Date() * 1 // Activar cooldown
    } else {
        m.reply('❌ Hubo un error al contactar a los desarrolladores.')
    }
  },
};
