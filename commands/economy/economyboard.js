import { resolveLidToRealJid } from '../../lib/utils.js';

export default {
  command: ['economyboard', 'eboard', 'baltop', 'top', 'lb'],
  category: 'rpg',
  run: async ({ client, m, args, usedPrefix }) => { 
    
    // 1. Validaciones
    if (!m.isGroup) return m.reply('🐲 Solo en grupos (◕ᴗ◕✿)')

    const chatId = m.chat
    // Aseguramos que chatData exista
    const chatData = global.db.data.chats[chatId] || {}
    
    // 🔓 CAMBIO REALIZADO: 
    // Se eliminó "chatData.adminonly" para que cualquiera pueda usarlo.
    // Solo se verifica si el sistema RPG está activo (opcional, si quieres borrar esto también, avísame).
    if (chatData.rpg === false) {
      return m.reply('🐉 La economía está dormida zzZ')
    }

    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const monedas = settings.currency || 'Coins'
    
    const prefix = usedPrefix || '#'

    try {
      // 2. Obtener participantes del Grupo
      let groupMetadata
      try {
        groupMetadata = await client.groupMetadata(chatId)
      } catch (e) {
        return m.reply('🐲 No pude leer los participantes (◕︿◕)')
      }

      const participants = groupMetadata.participants.map(p => p.id)

      // 3. Mapeo Asíncrono con Resolución de JID
      const users = await Promise.all(participants.map(async (rawId) => {
          const realId = await resolveLidToRealJid(rawId, client, chatId)
          
          const user = global.db.data.users[realId] || { coins: 0, bank: 0 }
          const total = (user.coins || 0) + (user.bank || 0)

          let nombre = user.name
          if (!nombre) {
              nombre = `@${realId.split('@')[0]}`
          }

          return {
              jid: realId,
              total: total,
              name: nombre
          }
      }))

      // 4. Filtrar y Ordenar
      const sorted = users
          .filter(u => u.total > 0)
          .sort((a, b) => b.total - a.total)

      if (sorted.length === 0) {
        return m.reply(`🐲 Nadie tiene dinero aquí... ¡A trabajar! (${prefix}work) (╥﹏╥)`)
      }

      // 5. Paginación
      const pageSize = 10
      const totalPages = Math.ceil(sorted.length / pageSize)
      let page = parseInt(args[0]) || 1

      if (page < 1 || page > totalPages) page = 1

      const start = (page - 1) * pageSize
      const end = start + pageSize
      const topUsers = sorted.slice(start, end)

      // 6. Construir Mensaje
      let text = `╭─── ⋆🐉⋆ ───\n│ 📊 *TOP MONEY*\n├───────────────\n`
      text += `│ 👥 *${groupMetadata.subject}*\n`
      text += `│ 📄 Página *${page}/${totalPages}*\n│\n`
      
      const medals = ['🥇', '🥈', '🥉']

      text += topUsers.map((user, i) => {
        const rank = start + i + 1
        const icon = (rank <= 3) ? medals[rank - 1] : `*${rank}.*`
        
        return `│ ${icon} ${user.name}\n│    └─ 💰 *${user.total.toLocaleString()} ${monedas}*`
      }).join('\n')

      text += `\n│\n│ 💡 Usa *${prefix}top ${page + 1}* para más\n╰─── ⋆✨⋆ ───`

      await client.sendMessage(chatId, { 
          text: text,
          mentions: topUsers.map(u => u.jid) 
      }, { quoted: m })

    } catch (e) {
      console.error(e)
      await m.reply('🐲 Error al generar el top (╥﹏╥)')
    }
  }
}
