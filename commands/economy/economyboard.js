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
      // 2. Obtener participantes del Grupo
      let groupMetadata
      try {
        groupMetadata = await client.groupMetadata(chatId)
      } catch (e) {
        return m.reply('⚠️ No pude leer los participantes del grupo. Asegúrate de que soy admin.')
      }

      const participants = groupMetadata.participants.map(p => p.id)

      // 3. Mapeo Asíncrono con Resolución de JID (LA SOLUCIÓN)
      // Usamos Promise.all para resolver todos los IDs (LID -> JID) en paralelo
      const users = await Promise.all(participants.map(async (rawId) => {
          // Resolvemos el ID real igual que en el comando bal
          const realId = await resolveLidToRealJid(rawId, client, chatId)
          
          // Buscamos en la DB usando el ID resuelto
          const user = global.db.data.users[realId] || { coins: 0, bank: 0 }
          const total = (user.coins || 0) + (user.bank || 0)

          // Nombre legible
          let nombre = user.name
          if (!nombre) {
              // Si no tiene nombre, usamos el número del ID Real
              nombre = `@${realId.split('@')[0]}`
          }

          return {
              jid: realId, // Guardamos el ID real para las menciones
              total: total,
              name: nombre
          }
      }))

      // 4. Filtrar y Ordenar (De mayor a menor)
      const sorted = users
          .filter(u => u.total > 0) // Solo mostramos gente con dinero
          .sort((a, b) => b.total - a.total)

      if (sorted.length === 0) {
        return m.reply(`ꕥ Nadie tiene dinero en este grupo... ¡A trabajar! (#work)`)
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
      let text = `*📊 TABLA DE POSICIONES (TOP MONEY)*\n`
      text += `👥 Grupo: *${groupMetadata.subject}*\n`
      text += `📄 Página: *${page}/${totalPages}*\n\n`
      
      const medals = ['🥇', '🥈', '🥉']

      text += topUsers.map((user, i) => {
        const rank = start + i + 1
        const icon = (rank <= 3) ? medals[rank - 1] : `*${rank}.*`
        
        return `${icon} ${user.name}\n   └─ 💰 *${user.total.toLocaleString()} ${monedas}*`
      }).join('\n\n')

      text += `\n\n> 💡 Usa *${globalThis.prefix || '#'}top ${page + 1}* para ver más.`

      // Enviamos el mensaje mencionando a los usuarios reales
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
