export default {
  command: ['buycharacter', 'buychar', 'buyc'],
  category: 'gacha',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const userId = m.sender
    const chatData = db.chats[chatId] || {}
    
    // --- MODELO HÍBRIDO ---
    const globalUser = db.users[userId] // Dinero GLOBAL
    const localUser = chatData.users[userId] // Inventario LOCAL

    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId] || {}
    const monedas = botSettings.currency || 'Coins'

    if (chatData.adminonly || !chatData.gacha)
      return m.reply(`🐲 Estos comandos están desactivados en este grupo. (◕︿◕)`)

    const personajeNombre = args.join(' ')?.trim()?.toLowerCase()
    if (!personajeNombre) return m.reply(`🐲 Especifica el nombre. (◕︿◕)`)

    // Buscamos vendedores EN EL GRUPO (Mercado Local)
    // Asumimos que la lista de ventas está en chatData.users...personajesEnVenta
    const personajesEnVenta = Object.entries(chatData.users).flatMap(
      ([vendedorId, userData]) => (userData.personajesEnVenta || []).map(p => ({...p, vendedorId}))
    )

    const personaje = personajesEnVenta.find((p) => p.name.toLowerCase() === personajeNombre)
    if (!personaje)
      return m.reply(`🐲 No se encontró a *${personajeNombre}* en venta en este grupo. (◕︿◕)`)

    // Verificar Dinero Global
    if ((globalUser.coins || 0) < personaje.precio)
      return m.reply(`🐲 No tienes suficientes *${monedas}* (Saldo: ${globalUser.coins}). (◕︿◕)`)

    // TRANSACCIÓN
    globalUser.coins -= personaje.precio

    // Pagar al vendedor GLOBALMENTE
    const vendedorGlobal = db.users[personaje.vendedorId]
    if (vendedorGlobal) {
        vendedorGlobal.coins = (vendedorGlobal.coins || 0) + personaje.precio
    }
    
    // Remover del vendedor LOCAL
    const vendedorLocal = chatData.users[personaje.vendedorId]
    if (vendedorLocal) {
        vendedorLocal.personajesEnVenta = vendedorLocal.personajesEnVenta.filter(p => p.name !== personaje.name)
    }

    // Añadir al comprador LOCAL
    if (!localUser.characters) localUser.characters = []
    localUser.characters.push({ name: personaje.name, ...personaje }) // Asegurarse de limpiar props de venta

    const nombreComprador = globalUser.name || userId.split('@')[0]
    const nombreVendedor = vendedorGlobal?.name || personaje.vendedorId.split('@')[0]

    const mensaje = `╭─── ⋆🐉⋆ ───\n│ Compra Exitosa (◕ᴗ◕✿)\n├───────────────\n│ ❀ Personaje: *${personaje.name}*\n│ ❀ Comprador: *${nombreComprador}*\n│ ❀ Pagado: *${personaje.precio.toLocaleString()} ${monedas}* a *${nombreVendedor}*\n╰─── ⋆✨⋆ ───`

    await client.sendMessage(chatId, { text: mensaje }, { quoted: m })
  },
};
