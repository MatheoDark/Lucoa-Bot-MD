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

    if (!m.isGroup) return m.reply('Este comando solo funciona en grupos.')

    try {
      // 1. Obtenemos los participantes REALES del grupo actual
      const groupMetadata = await client.groupMetadata(chatId)
      const participants = groupMetadata.participants

      // 2. Mapeamos los participantes buscando sus datos en la DB GLOBAL
      const users = participants.map(p => {
        const userId = p.id
        const globalUser = db.users[userId] || { coins: 0, bank: 0, name: null }
        
        return {
            jid: userId,
            coins: globalUser.coins || 0,
            bank: globalUser.bank || 0,
            total: (globalUser.coins || 0) + (globalUser.bank || 0),
            name: globalUser.name || userId.split('@')[0]
        }
      })

      // 3. Filtramos los que tienen dinero y Ordenamos
      const sorted = users
        .filter(u => u.total > 0) // Opcional: mostrar solo los que tienen algo
        .sort((a, b) => b.total - a.total)

      if (sorted.length === 0)
        return m.reply(`ꕥ Nadie en este grupo tiene dinero aún.`)

      const page = parseInt(args[0]) || 1
      const pageSize = 10
      const totalPages = Math.ceil(sorted.length / pageSize)

      if (page < 1 || page > totalPages)
        return m.reply(`《✧》 La página *${page}* no existe. Hay *${totalPages}* páginas.`)

      const start = (page - 1) * pageSize
      const end = start + pageSize

      // Título cambiado para reflejar que es el Top del Grupo
      let text = `*✩ Top Economy (Grupo) ✩*\n\n`
      
      const topUsers = sorted.slice(start, end).map((user, i) => {
        return `✩ ${start + i + 1} › *${user.name}*\n     Total → *¥ ${user.total.toLocaleString()} ${monedas}*`
      })

      text += topUsers.join('\n')
      text += `\n\n> ⌦ Página *${page}* de *${totalPages}*`
      if (page < totalPages)
        text += `\n> Para ver la siguiente página › */eboard ${page + 1}*`

      await client.sendMessage(chatId, { text }, { quoted: m })

    } catch (e) {
      console.error(e)
      await m.reply('Ocurrió un error al obtener el top del grupo.')
    }
  }
}
