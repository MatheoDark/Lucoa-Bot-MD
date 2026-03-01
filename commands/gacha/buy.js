function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${seconds}s`
}

function formatDate(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleDateString('es-ES')
}

export default {
  command: ['claim', 'buy', 'c'],
  category: 'gacha',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const userId = m.sender
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const chatConfig = db.chats[chatId] || {}
    const botSettings = db.settings[botId] || {}
    const monedas = botSettings.currency || 'Coins'
    
    // --- MODELO HÍBRIDO ---
    const globalUser = db.users[userId] || {} // Dinero GLOBAL
    const localUser = chatConfig.users[userId] // Waifus LOCALES

    if (chatConfig.adminonly || !chatConfig.gacha)
      return m.reply(`🐲 Estos comandos están desactivados en este grupo. (◕︿◕)`)

    // Cooldown global para compras
    if (!globalUser.buyCooldown) globalUser.buyCooldown = 0
    const remainingTime = globalUser.buyCooldown - Date.now()
    if (remainingTime > 0)
      return m.reply(`🐲 Espera *${msToTime(remainingTime)}* para volver a usar este comando. (◕︿◕)`)

    if (!m.quoted) return m.reply(`🐲 Responde a una waifu para reclamarla. (◕︿◕)`)

    const quotedMessage = m.quoted.body || m.quoted.text || ''
    
    // Buscar en reservas del CHAT
    const reservedCharacter = (chatConfig.personajesReservados || []).find((p) =>
      quotedMessage.includes(p.name),
    )

    if (!reservedCharacter) {
      // Verificar si alguien DEL GRUPO ya lo tiene
      const claimedEntry = Object.entries(chatConfig.users).find(([_, u]) =>
        u.characters?.some((c) => quotedMessage.includes(c.name)),
      )
      if (claimedEntry) {
        const [claimerId] = claimedEntry
        const ownerName = db.users[claimerId]?.name || claimerId.split('@')[0]
        return m.reply(claimerId === userId ? `🐲 Ya es tuyo. (◕︿◕)` : `🐲 Ya pertenece a *${ownerName}*. (◕︿◕)`)
      }
      return m.reply(`🐲 No se pudo identificar el personaje. (◕︿◕)`)
    }

    const now = Date.now()
    
    // Verificar protección de reserva
    if (reservedCharacter.reservedBy && now < reservedCharacter.reservedUntil) {
      const isUserReserver = reservedCharacter.reservedBy === userId
      const reserverName = db.users[reservedCharacter.reservedBy]?.name || 'Alguien'
      if (!isUserReserver)
        return m.reply(`🐲 Protegido por *${reserverName}*. (◕︿◕)`)
    }

    // Verificar Dinero GLOBAL
    if ((globalUser.coins || 0) < reservedCharacter.value)
      return m.reply(`🐲 No tienes suficiente *${monedas}* (Saldo: ${globalUser.coins || 0}). (◕︿◕)`)

    // Inicializar inventario local si hace falta
    if (!localUser.characters) localUser.characters = []
    
    localUser.characters.push({
      name: reservedCharacter.name,
      value: reservedCharacter.value,
      gender: reservedCharacter.gender,
      source: reservedCharacter.source,
      keyword: reservedCharacter.keyword,
      claim: formatDate(now),
      user: userId,
    })

    // Eliminar de reservas
    chatConfig.personajesReservados = chatConfig.personajesReservados.filter(
      (p) => p.id !== reservedCharacter.id,
    )
    
    // Cobrar GLOBALMENTE
    globalUser.buyCooldown = now + 15 * 60000
    globalUser.coins -= reservedCharacter.value

    const displayName = globalUser.name || userId.split('@')[0]
    const duration = ((now - reservedCharacter.expiresAt + 60000) / 1000).toFixed(1)

    const frases = [
      `*${reservedCharacter.name}* ha sido reclamado por *${displayName}*`,
      `*${displayName}* atrapó a *${reservedCharacter.name}*`,
    ]
    const final = frases[Math.floor(Math.random() * frases.length)]
    
    await client.sendMessage(chatId, { text: `🐉 ${final} _(${ duration}s)_ (◕ᴗ◕✿)` }, { quoted: m })
  },
};
