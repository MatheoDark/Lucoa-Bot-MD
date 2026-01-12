import { resolveLidToRealJid } from '../../lib/utils.js';

export default {
  command: ['economyboard', 'eboard', 'baltop', 'top', 'lb'],
  category: 'rpg',
  run: async ({ client, m, args }) => {
    
    // 1. Validaciones
    if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos.')

    const chatId = m.chat
    const chatData = global.db.data.chats[chatId] || {}
    
    // Verificar si RPG está activo
    if (chatData.adminonly || !chatData.rpg) {
      return m.reply(`✎ Los comandos de economía están desactivados en este grupo.`)
    }

    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const monedas = settings.currency || 'Coins'

    try {
      // 2. Obtener participantes (Solo del Metadata)
      let groupMetadata
      try {
        groupMetadata = await client.groupMetadata(chatId)
      } catch (e) {
        return m.reply('⚠️ No pude leer los participantes del grupo. Asegúrate de que soy admin o inténtalo más tarde.')
      }

      const participants = groupMetadata.participants.map(p => p.id)

      // 3. Mapear Dinero (Economía Global)
      const users = participants.map(jid => {
        // Leemos la DB Global usando el JID
        const user = global.db.data.users[jid] || { coins: 0, bank: 0 }
        const total = (user.coins || 0) + (user.bank || 0)
        
        // Intentamos obtener un nombre legible
        let nombre = user.name
        if (!nombre || nombre === 'undefined') {
             // Si no tiene nombre registrado, usamos el número oculto parcialmente
             nombre = `@${jid.split('@')[0]}` 
        }

        return {
          jid: jid,
          total: total,
          name: nombre
        }
      }).filter(u => u.total > 0) // Solo mostramos gente con dinero

      // 4. Ordenar (De mayor a menor)
      const sorted = users.sort((a, b) => b.total - a.total)

      if (sorted.length === 0) {
        return m.reply(`ꕥ Nadie tiene dinero en este grupo... ¡A trabajar! (#work)`)
      }

      // 5. Paginación
      const pageSize = 10
      const totalPages = Math.ceil(sorted.length / pageSize)
      let page = parseInt(args[0]) || 1

      if (page < 1 || page > totalPages) page = 1 // Si pone pag 999, lo manda a la 1

      const start = (page - 1) * pageSize
      const end = start + pageSize
      const topUsers = sorted.slice(start, end)

      // 6. Construir Mensaje
      let text = `*📊 TABLA DE POSICIONES (TOP MONEY)*\n`
      text += `👥 Grupo: *${groupMetadata.subject}*\n`
      text += `📄 Página: *${page}/${totalPages}*\n\n`
      
      // Top 3 con medallas
      const medals = ['🥇', '🥈', '🥉']

      text += topUsers.map((user, i) => {
        const rank = start + i + 1
        const icon = (rank <= 3) ? medals[rank - 1] : `*${rank}.*`
        
        return `${icon} ${user.name}\n   └─ 💰 *${user.total.toLocaleString()} ${monedas}*`
      }).join('\n\n')

      text += `\n\n> 💡 Usa *${globalThis.prefix || '#'}top ${page + 1}* para ver más.`

      // Enviamos el mensaje mencionando a los usuarios (para que los nombres @... funcionen)
      await client.sendMessage(chatId, { 
          text: text,
          mentions: topUsers.map(u => u.jid) 
      }, { quoted: m })

    } catch (e) {
      console.error(e)
      await m.reply('❌ Ocurrió un error al generar el top.')
    }
  }
}
