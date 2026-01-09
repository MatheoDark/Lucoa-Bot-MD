import fs from 'fs';
import { resolveLidToRealJid } from "../../lib/utils.js"

async function loadCharacters() {
  try {
    return JSON.parse(fs.readFileSync('./lib/characters.json', 'utf-8'))
  } catch {
    return {}
  }
}

export default {
  command: ['harem', 'miswaifus', 'claims'],
  category: 'gacha',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : (m.quoted ? m.quoted.sender : m.sender)
    const userId = await resolveLidToRealJid(who2, client, m.chat);

    const name = db.users[userId]?.name || userId.split('@')[0]
    const chatConfig = db.chats[chatId] || {}
    
    // --- MODELO HÍBRIDO: Personajes LOCALES ---
    // Usamos chatConfig.users (local) para ver las waifus de ESTE grupo
    const localUser = chatConfig.users?.[userId]

    if (chatConfig.adminonly || !chatConfig.gacha)
      return m.reply(`✎ Estos comandos estan desactivados en este grupo.`)

    if (!localUser?.characters?.length) {
      return m.reply(
        userId === m.sender
          ? `ꕥ No tienes personajes en este grupo.`
          : `ꕥ *${name}* no tiene personajes en este grupo.`
      )
    }

    const charactersData = await loadCharacters()
    const total = localUser.characters.length
    const perPage = 20
    const page = Math.max(1, parseInt(args[0]) || 1)
    const pages = Math.ceil(total / perPage)

    if (page > pages)
      return m.reply(`ꕥ Página inválida. Hay un total de *${pages}* página${pages > 1 ? 's' : ''}`)

    const start = (page - 1) * perPage
    const end = Math.min(start + perPage, total)
    const charactersOnPage = localUser.characters.slice(start, end)

    let message = `❀ Harén del Grupo ❀
⌦ Usuario: *${name}*
♡ Personajes: *(${total}):*\n\n`

    charactersOnPage.forEach((char, i) => {
      const match = charactersData.find(c => c.name === char.name)
      const value = match?.value?.toLocaleString() || char.value?.toLocaleString() || '?'
      const label = match?.name || char.name || '?'
      message += `> ${start + i + 1}. *${label}* (${value})\n`
    })

    message += `\n➮ Página *${page}* de *${pages}*`

    await client.sendMessage(chatId, { text: message }, { quoted: m })
  }
};
