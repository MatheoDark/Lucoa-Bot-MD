export default {
  command: ['removesale', 'removerventa'],
  category: 'gacha',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const userId = m.sender
    const characterName = args.join(' ')?.trim()?.toLowerCase()

    const chatData = db.chats[chatId] || {}
    if (chatData.adminonly || !chatData.gacha)
      return m.reply(`✎ Estos comandos estan desactivados en este grupo.`)

    if (!characterName) return m.reply('✎ Especifica el nombre del personaje que deseas cancelar.')

    // --- MODELO HÍBRIDO (Personajes Locales) ---
    const userData = chatData.users?.[userId]

    if (!userData) return m.reply('《✧》 No tienes datos en este grupo.')

    if (!userData.personajesEnVenta?.length) return m.reply('《✧》 No tienes personajes en venta aquí.')

    const index = userData.personajesEnVenta.findIndex(
      (p) => p.name?.toLowerCase() === characterName,
    )
    if (index === -1)
      return m.reply(`《✧》 No se encontró a *${characterName}* en tus ventas de este grupo.`)

    const personajeCancelado = userData.personajesEnVenta.splice(index, 1)[0]
    
    // Devolver al inventario local
    if (!userData.characters) userData.characters = []
    
    // Limpiamos propiedades de venta antes de devolverlo
    delete personajeCancelado.precio
    delete personajeCancelado.vendedor
    delete personajeCancelado.expira
    
    userData.characters.push(personajeCancelado)

    await client.sendMessage(
      chatId,
      {
        text: `✎ Tu personaje *${personajeCancelado.name}* ha sido retirado de la venta.`,
      },
      { quoted: m },
    )
  },
};
