import { resolveLidToRealJid } from '../../lib/utils.js';

export default {
  command: ['economyboard', 'eboard', 'baltop'],
  category: 'rpg',
  run: async ({ client, m, args }) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId] || {}
    const monedas = botSettings.currency || 'Coins'

    const chatData = db.chats[chatId] || {}
    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`✎ Estos comandos están desactivados en este grupo.`)

    try {
      // 1. Obtener participantes del GRUPO ACTUAL
      let participants = []
      try {
        const groupMetadata = await client.groupMetadata(chatId)
        participants = groupMetadata.participants.map(p => p.id)
      } catch (e) {
        // Fallback: Si falla (no es grupo o bot no admin), usamos la lista local de chats
        participants = Object.keys(chatData.users || {})
      }

      // 2. Mapear participantes con su dinero GLOBAL
      const users = participants.map(jid => {
        const globalUser = db.users[jid] || { coins: 0, bank: 0 } // Leemos DB Global
        return {
          jid: jid,
          coins: globalUser.coins || 0,
          bank: globalUser.bank || 0,
          name: globalUser.name || jid.split('@')[0]
        }
      }).filter(u => (u.coins + u.bank) > 0) // Filtramos gente sin dinero

      if (users.length === 0)
        return m.reply(`ꕥ No hay usuarios con dinero en este grupo.`)

      const sorted = users.sort(
        (a, b) => (b.coins + b.bank) - (a.coins + a.bank)
      )

      const page = parseInt(args[0]) || 1
      const pageSize = 10
      const totalPages = Math.ceil(sorted.length / pageSize)

      if (page < 1 || page > totalPages)
        return m.reply(`《✧》 La página *${page}* no existe. Hay *${totalPages}* páginas.`)

      const start = (page - 1) * pageSize
      const end = start + pageSize

      let text = `*✩ EconomyBoard (Grupo) (✿◡‿◡)*\n\n`
      
      const topUsers = sorted.slice(start, end).map((user, i) => {
        const total = user.coins + user.bank
        return `✩ ${start + i + 1} › *${user.name}*\n     Total → *¥ ${total.toLocaleString()} ${monedas}*`
      })

      text += topUsers.join('\n')
      text += `\n\n> ⌦ Página *${page}* de *${totalPages}*`
      if (page < totalPages)
        text += `\n> Para ver la siguiente página › */eboard ${page + 1}*`

      await client.sendMessage(chatId, { text }, { quoted: m })

    } catch (e) {
      console.error(e)
      await m.reply('Ocurrió un error al obtener el top.')
    }
  }
}
