import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['giveallharem'],
  category: 'gacha',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const senderId = m.sender
    const chatData = db.chats[chatId]

    if (chatData.adminonly || !chatData.gacha)
      return m.reply(`✎ Estos comandos estan desactivados en este grupo.`)

    const texto = m.mentionedJid
    const who2 = texto.length > 0 ? texto[0] : m.quoted ? m.quoted.sender : false
    const mentionedJid = await resolveLidToRealJid(who2, client, m.chat);

    if (!who2 || mentionedJid === senderId)
      return m.reply('✎ Menciona al usuario al que deseas regalar todos tus personajes.')

    // --- MODELO HÍBRIDO (Personajes Locales) ---
    const fromUser = chatData.users[senderId]
    
    if (!fromUser?.characters?.length)
      return m.reply('《✧》 No tienes personajes en tu inventario de este grupo.')

    // Inicializar receptor si no existe
    if (!chatData.users[mentionedJid]) {
       chatData.users[mentionedJid] = { characters: [], coins: 0 }
    }
    const toUser = chatData.users[mentionedJid]
    if (!toUser.characters) toUser.characters = []

    // Mover personajes
    fromUser.characters.forEach((c) => {
      toUser.characters.push(c)
      // toUser.characterCount++ (si usas contadores, actúalizalos, pero length es más seguro)
    })

    // Vaciar emisor
    fromUser.characters = []

    const nameReceiver = db.users[mentionedJid]?.name || mentionedJid.split('@')[0]
    const message = `✎ Regalaste todos tus personajes de este grupo al usuario *${nameReceiver}*.`

    await client.sendMessage(chatId, { text: message }, { quoted: m })
  },
};
