export default {
  command: ['sell', 'vender'],
  category: 'gacha',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const userId = m.sender
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId] || {}
    const currency = botSettings.currency || 'Coins'

    const chatData = db.chats[chatId] || {}
    if (chatData.adminonly || !chatData.gacha)
      return m.reply(`🐲 Estos comandos están desactivados en este grupo. (◕︿◕)`)

    const precioCoins = parseInt(args[0])
    const personajeNombre = args.slice(1).join(' ').trim().toLowerCase()

    if (!personajeNombre || isNaN(precioCoins))
      return m.reply('🐲 Especifica el precio y el nombre. Ej: sell 5000 Rem (◕︿◕)')

    // --- MODELO HÍBRIDO (Personajes Locales) ---
    const userData = chatData.users[userId] || {}
    
    if (!userData?.characters?.length) return m.reply('🐲 No tienes personajes aquí. (◕︿◕)')

    const characterIndex = userData.characters.findIndex(
      (c) => c.name?.toLowerCase() === personajeNombre,
    )
    if (characterIndex === -1)
      return m.reply(`🐲 No tienes a *${personajeNombre}*. (◕︿◕)`)

    if (precioCoins < 5000) return m.reply(`🐲 Mínimo *5,000 ${currency}*. (◕︿◕)`)
    if (precioCoins > 20000000) return m.reply(`🐲 Máximo *20,000,000 ${currency}*. (◕︿◕)`)

    const character = userData.characters[characterIndex]
    const expira = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    if (!userData.personajesEnVenta) userData.personajesEnVenta = []
    
    userData.personajesEnVenta.push({
      ...character,
      precio: precioCoins,
      vendedor: userId,
      expira,
    })

    userData.characters.splice(characterIndex, 1)

    const mensaje = `╭─── ⋆🐉⋆ ───\n│ Venta Registrada (◕ᴗ◕✿)\n├───────────────\n│ ❀ Personaje: *${character.name}*\n│ ❀ Vendedor › *@${userId.split('@')[0]}*\n│ ❀ Valor › *${precioCoins.toLocaleString()} ${currency}*\n│ ❀ Expira en › *3 días*\n╰─── ⋆✨⋆ ───`
    await client.sendMessage(chatId, { text: mensaje, mentions: [userId] }, { quoted: m })
  },
};

// Limpiador automático de ventas expiradas
setInterval(
  () => {
    const db = global.db.data || {}
    if (!db.chats) return
    
    for (const chatId in db.chats) {
      const chatData = db.chats[chatId] || {}
      for (const userId in chatData.users || {}) {
        const user = chatData.users[userId] || {}
        if (user.personajesEnVenta) {
            user.personajesEnVenta = user.personajesEnVenta.filter((p) => {
                const exp = new Date(p.expira)
                const expired = Date.now() > exp
                if (expired) {
                  // Devolver al inventario si expira
                  if (!user.characters) user.characters = []
                  user.characters.push(p)
                }
                return !expired
              })
        }
      }
    }
  },
  60 * 60 * 1000, // Cada hora
)
