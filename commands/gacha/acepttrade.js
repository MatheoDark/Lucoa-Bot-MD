export default {
  command: ['accepttrade', 'aceptarintercambio'],
  category: 'gacha',
  run: async ({client, m}) => {
    const db = global.db.data
    const chatId = m.chat
    const userId = m.sender
    const chatData = db.chats[chatId]
    
    const intercambio = chatData.intercambios?.find(
      (i) => i.expiracion > Date.now() && i.destinatario === userId,
    )

    if (chatData.adminonly || !chatData.gacha)
      return m.reply(`🐲 Estos comandos están desactivados en este grupo. (◕︿◕)`)

    if (!intercambio) return m.reply('🐲 No tienes solicitudes activas. (◕︿◕)')

    // Verificar que aun tengan los personajes
    const solicitanteChars = chatData.users[intercambio.solicitante].characters || []
    const destinatarioChars = chatData.users[intercambio.destinatario].characters || []

    const tieneP1 = solicitanteChars.some(c => c.name === intercambio.personaje1.name)
    const tieneP2 = destinatarioChars.some(c => c.name === intercambio.personaje2.name)

    if (!tieneP1 || !tieneP2) {
        chatData.intercambios = chatData.intercambios.filter((i) => i !== intercambio)
        chatData.timeTrade = 0
        return m.reply("🐲 Intercambio cancelado: Uno de los usuarios ya no tiene el personaje. (╥﹏╥)")
    }

    // Intercambiar
    chatData.users[intercambio.solicitante].characters = [
      ...solicitanteChars.filter((c) => c.name !== intercambio.personaje1.name),
      intercambio.personaje2,
    ]

    chatData.users[intercambio.destinatario].characters = [
      ...destinatarioChars.filter((c) => c.name !== intercambio.personaje2.name),
      intercambio.personaje1,
    ]

    chatData.intercambios = chatData.intercambios.filter((i) => i !== intercambio)
    chatData.timeTrade = 0

    const solicitanteName = db.users[intercambio.solicitante]?.name || intercambio.solicitante.split('@')[0]
    const destName = db.users[userId]?.name || userId.split('@')[0]

    const mensajeConfirmacion = `╭─── ⋆🐉⋆ ───\n│ Intercambio Exitoso (◕ᴗ◕✿)\n├───────────────\n│ ❀ *${intercambio.personaje1.name}* ➔ ${destName}\n│ ❀ *${intercambio.personaje2.name}* ➔ ${solicitanteName}\n╰─── ⋆✨⋆ ───`

    await client.sendMessage(chatId, { text: mensajeConfirmacion }, { quoted: m })
  },
};
