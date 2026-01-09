export default {
  command: ['waifusboard', 'waifustop', 'topwaifus'],
  category: 'gacha',
  use: '[página]',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const chatData = db.chats[chatId] || {}

    if (chatData.adminonly || !chatData.gacha)
      return m.reply(`✎ Desactivado.`)

    // Iteramos usuarios LOCALES (del grupo)
    const users = Object.entries(chatData.users || {})
      .filter(([_, u]) => (u.characters?.length || 0) > 5)
      .map(([id, u]) => ({
        ...u,
        name: db.users[id]?.name || id.split('@')[0]
      }))

    if (users.length === 0)
      return m.reply('ꕥ Nadie tiene más de 5 waifus en este grupo.')

    const sorted = users.sort((a, b) => (b.characters?.length || 0) - (a.characters?.length || 0))
    const page = parseInt(args[0]) || 1
    const pageSize = 10
    const totalPages = Math.ceil(sorted.length / pageSize)

    if (isNaN(page) || page < 1 || page > totalPages)
      return m.reply(`ꕥ Página inválida.`)

    const startIndex = (page - 1) * pageSize
    const list = sorted.slice(startIndex, startIndex + pageSize)

    let message = `ꕥ Top Coleccionistas (Grupo)\n\n`
    message += list.map((u, i) =>
      `✩ ${startIndex + i + 1} › *${u.name}*\n     Waifus → *${u.characters.length}*`
    ).join('\n\n')

    message += `\n\n> ⌦ Página *${page}* de *${totalPages}*`
    await client.sendMessage(chatId, { text: message.trim() }, { quoted: m })
  }
};
