function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${seconds}s`
}

function formatDate(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleDateString('es-ES')
}

const CLAIM_STEAL_COST = 100000
const CLAIM_STEAL_SUCCESS_RATE = 0.25

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
    if (!chatConfig.users) chatConfig.users = {}
    if (!chatConfig.users[userId]) chatConfig.users[userId] = { characters: [] }
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
        const [claimerId, claimerData] = claimedEntry
        const ownerName = db.users[claimerId]?.name || claimerId.split('@')[0]

        if (claimerId === userId) {
          return m.reply(`🐲 Ya es tuyo. (◕︿◕)`)
        }

        if ((globalUser.coins || 0) < CLAIM_STEAL_COST) {
          return m.reply(`🐲 Ya pertenece a *${ownerName}*.\nPuedes intentar robarlo con *${CLAIM_STEAL_COST.toLocaleString()} ${monedas}* respondiendo de nuevo con #claim. (◕︿◕)`)
        }

        const ownerCharIndex = claimerData.characters.findIndex((c) => quotedMessage.includes(c.name))
        if (ownerCharIndex < 0) {
          return m.reply(`🐲 No pude localizar el personaje para el robo. (◕︿◕)`)
        }

        const now = Date.now()
        globalUser.coins -= CLAIM_STEAL_COST
        globalUser.buyCooldown = now + 15 * 60000

        const success = Math.random() < CLAIM_STEAL_SUCCESS_RATE
        if (!success) {
          return m.reply(`🐲 Intentaste robarle a *${ownerName}* y fallaste.\nPerdiste *${CLAIM_STEAL_COST.toLocaleString()} ${monedas}*. (╥﹏╥)`)
        }

        const stolenCharacter = claimerData.characters.splice(ownerCharIndex, 1)[0]
        if (!localUser.characters) localUser.characters = []
        localUser.characters = localUser.characters.filter((c) => c.name !== stolenCharacter.name)
        localUser.characters.push({
          ...stolenCharacter,
          claim: formatDate(now),
          user: userId,
        })

        return client.sendMessage(chatId, {
          text: `🐉 Robo exitoso. *${stolenCharacter.name}* ahora es de *${globalUser.name || userId.split('@')[0]}*.\nCosto: *${CLAIM_STEAL_COST.toLocaleString()} ${monedas}*`,
          mentions: [userId, claimerId],
        }, { quoted: m })
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

    // Unicidad por chat: solo una persona puede tener este personaje.
    const existingOwner = Object.entries(chatConfig.users || {}).find(([id, u]) =>
      id !== userId && Array.isArray(u.characters) && u.characters.some((c) => c.name === reservedCharacter.name),
    )

    if (existingOwner) {
      const [ownerId] = existingOwner
      const ownerName = db.users[ownerId]?.name || ownerId.split('@')[0]
      return m.reply(`🐲 *${reservedCharacter.name}* ya pertenece a *${ownerName}*. (◕︿◕)`)
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
