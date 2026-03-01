const findCharacterByName = (name, characters) => {
  return characters.find((p) => p.name?.toLowerCase() === name.toLowerCase())
}

export default {
  command: ['trade', 'cambiar'],
  category: 'gacha',
  run: async ({client, m, args, usedPrefix}) => {
    const prefa = usedPrefix || '/'
    const db = global.db.data
    const chatId = m.chat
    const userId = m.sender
    const chatData = db.chats[chatId]

    if (chatData.adminonly || !chatData.gacha)
      return m.reply(`🐲 Estos comandos están desactivados en este grupo. (◕︿◕)`)

    if (chatData.timeTrade && chatData.timeTrade - Date.now() > 0)
      return m.reply('🐲 Ya hay un intercambio en curso. Espera. (◕︿◕)')

    const partes = args.join(' ').split('/').map((s) => s.trim())
    if (partes.length !== 2)
      return m.reply(`🐲 Formato: *${prefa}trade Tu personaje / Personaje de otro* (◕︿◕)`)

    const [personaje1Nombre, personaje2Nombre] = partes
    
    // --- MODELO HÍBRIDO (Personajes Locales) ---
    const userData = chatData.users[userId]?.characters || []
    const personaje1 = findCharacterByName(personaje1Nombre, userData)

    // Buscar personaje 2 en usuarios del grupo
    const personaje2UserEntry = Object.entries(chatData.users || {}).find(([_, u]) =>
      u.characters?.some((c) => c.name?.toLowerCase() === personaje2Nombre.toLowerCase()),
    )
    const personaje2UserId = personaje2UserEntry?.[0]
    const personaje2UserData = personaje2UserEntry?.[1]?.characters || []
    const personaje2 = findCharacterByName(personaje2Nombre, personaje2UserData)

    if (!personaje1) return m.reply(`🐲 No tienes a *${personaje1Nombre}* aquí. (◕︿◕)`)
    if (!personaje2) return m.reply(`🐲 *${personaje2Nombre}* no está en este grupo. (◕︿◕)`)
    if (userId === personaje2UserId) return m.reply("🐲 No puedes intercambiar contigo mismo. (◕︿◕)")

    if (!chatData.intercambios) chatData.intercambios = []
    
    chatData.intercambios.push({
      solicitante: userId,
      personaje1,
      personaje2,
      destinatario: personaje2UserId,
      expiracion: Date.now() + 60000,
    })

    chatData.timeTrade = Date.now() + 60000

    const solicitudMessage = `╭─── ⋆🐉⋆ ───\n│ Solicitud de Intercambio (◕ᴗ◕✿)\n├───────────────\n│ ❀ @${personaje2UserId.split('@')[0]}, @${userId.split('@')[0]} quiere intercambiar:\n│ ❀ *${personaje2.name}* ⇄ *${personaje1.name}*\n╰─── ⋆✨⋆ ───\n> 🐉 Usa › *${prefa}accepttrade* para aceptar.`
    
    await client.sendMessage(chatId, { text: solicitudMessage, mentions: [userId, personaje2UserId] }, { quoted: m })
  },
};
