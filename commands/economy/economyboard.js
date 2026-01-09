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
      // CORRECCIÓN CRÍTICA: Iteramos sobre los usuarios GLOBALES, no los del grupo
      const allUsers = db.users || {}

      const users = Object.entries(allUsers)
        .filter(([_, data]) => {
          const total = (data.coins || 0) + (data.bank || 0)
          return total >= 100 // Filtramos los que tengan algo de dinero
        })
        .map(([key, data]) => ({
          jid: key,
          coins: data.coins || 0,
          bank: data.bank || 0,
          name: data.name
        }))

      if (users.length === 0)
        return m.reply(`ꕥ No hay usuarios en el sistema con dinero.`)

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

      let text = `*✩ Top Global Economy (✿◡‿◡)*\n\n`
      
      const topUsers = sorted.slice(start, end).map((user, i) => {
        const total = user.coins + user.bank
        const name = user.name || user.jid.split('@')[0]
        return `✩ ${start + i + 1} › *${name}*\n     Total → *¥ ${total.toLocaleString()} ${monedas}*`
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
