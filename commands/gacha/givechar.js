import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['givechar', 'givewaifu', 'regalar'],
  category: 'gacha',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const senderId = m.sender
    const chatData = db.chats[chatId] || {}
    
    // --- MODELO HÍBRIDO: Waifus LOCALES ---
    const senderLocal = chatData.users[senderId] || {}
    
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : m.quoted ? m.quoted.sender : false
    const mentionedJid = await resolveLidToRealJid(who2, client, m.chat);

    if (chatData.adminonly || !chatData.gacha)
      return m.reply(`🐲 Estos comandos están desactivados en este grupo. (◕︿◕)`)

    if (!senderLocal.characters?.length) return m.reply('🐲 No tienes personajes en este grupo. (◕︿◕)')

    // Usuario receptor LOCAL
    let receiverLocal = chatData.users[mentionedJid]
    if (!receiverLocal) {
       chatData.users[mentionedJid] = { characters: [] }
       receiverLocal = chatData.users[mentionedJid]
    }

    const characterName = args.filter((arg) => !arg.includes('@')).join(' ').toLowerCase().trim()
    const characterIndex = senderLocal.characters.findIndex((c) => c.name?.toLowerCase() === characterName)

    if (characterIndex === -1)
      return m.reply(`🐲 No tienes a *${characterName}* aquí. (◕︿◕)`)

    const character = senderLocal.characters[characterIndex]
    
    // Mover personaje
    if (!receiverLocal.characters) receiverLocal.characters = []
    receiverLocal.characters.push(character)
    
    senderLocal.characters.splice(characterIndex, 1)

    const receiverName = db.users[mentionedJid]?.name || mentionedJid.split('@')[0]
    await client.sendMessage(chatId, { text: `🐉 *${character.name}* regalado a *${receiverName}*. (≧◡≦)` }, { quoted: m })
  },
};
