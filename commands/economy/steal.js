import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['steal', 'rob', 'robar'],
  category: 'rpg',
  run: async ({ client, m }) => {
    
    // 1. Validaciones Básicas
    if (!m.isGroup) return m.reply('🐲 Este comando solo funciona en grupos (◕ᴗ◕✿)')

    const chatId = m.chat
    const chatData = global.db.data.chats[chatId] || {}

    if (chatData.adminonly || !chatData.rpg) {
      return m.reply('🐉 La economía está dormida en este grupo zzZ')
    }

    // 2. Configuración del Bot
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId] || {}
    const monedas = botSettings.currency || 'coins'

    // 3. Resolver ID del Ladrón (Sender)
    const senderId = await resolveLidToRealJid(m.sender, client, chatId)
    
    // Asegurar que el ladrón existe en la DB
    let senderData = global.db.data.users[senderId]
    if (!senderData) {
        global.db.data.users[senderId] = { coins: 0, roboCooldown: 0, exp: 0 }
        senderData = global.db.data.users[senderId]
    }

    // 4. Identificar a la Víctima
    const mentioned = m.mentionedJid || []
    const who = mentioned[0] || (m.quoted ? m.quoted.sender : null)

    if (!who) return m.reply('🐲 Menciona a alguien para robar (◕ᴗ◕)')

    // Resolver ID de la Víctima
    const targetId = await resolveLidToRealJid(who, client, chatId)

    // Validaciones de Víctima
    if (targetId === senderId) return m.reply('🐲 No puedes robarte a ti mismo (≧◡≦)')
    if (targetId === botId) return m.reply('🐲 No puedes robarme a mí~ soy un dragón (◕ᴗ◕✿) 🐉')

    // Asegurar que la víctima existe en la DB
    const targetData = global.db.data.users[targetId]
    if (!targetData) return m.reply('🐲 Ese usuario no tiene dinero registrado (◕︿◕)')

    if ((targetData.coins || 0) < 50) {
      return m.reply('🐲 La víctima es muy pobre, no vale la pena (╥﹏╥)')
    }

    // 5. Cooldown (Tiempo de espera)
    senderData.roboCooldown = senderData.roboCooldown || 0
    const remainingTime = senderData.roboCooldown - Date.now()

    if (remainingTime > 0) {
      return m.reply(`🐲 La policía te vigila. Espera *${msToTime(remainingTime)}* (◕︿◕✿)`)
    }

    // 6. Ejecución del Robo
    const cooldown = 30 * 60 * 1000 // 30 Minutos
    const now = Date.now()
    
    // Probabilidad de éxito: 70% (Según tu código original)
    // Nota: Es un porcentaje alto, si quieres hacerlo más difícil baja el 0.70 a 0.50
    const success = Math.random() < 0.70

    if (!success) {
      // --- FRACASO ---
      // Multa del 15% de lo que tiene el ladrón
      const fine = Math.floor((senderData.coins || 0) * 0.15)
      
      senderData.coins = Math.max(0, (senderData.coins || 0) - fine)
      senderData.roboCooldown = now + cooldown // Aplica cooldown

      return client.sendMessage(chatId, {
          text: `╭─── ⋆🐉⋆ ───\n│ 🚔 *¡ATRAPADO!*\n├───────────────\n│ Intentaste robar a *@${targetId.split('@')[0]}*\n│ 💸 Multa: *-${fine.toLocaleString()} ${monedas}*\n╰─── ⋆✨⋆ ───`,
          mentions: [senderId, targetId],
        }, { quoted: m }
      )
    }

    // --- ÉXITO ---
    // Roba entre 50 y 5000, pero nunca más de lo que tiene la víctima
    const cantidadRobada = Math.min(Math.floor(Math.random() * 5000) + 50, targetData.coins)
    
    senderData.coins += cantidadRobada
    targetData.coins -= cantidadRobada
    senderData.roboCooldown = now + cooldown // Aplica cooldown

    await client.sendMessage(chatId, {
        text: `╭─── ⋆🐉⋆ ───\n│ 🥷 *¡ROBO EXITOSO!*\n├───────────────\n│ Le robaste *${cantidadRobada.toLocaleString()} ${monedas}*\n│ a *@${targetId.split('@')[0]}* (◕ᴗ◕✿)\n╰─── ⋆✨⋆ ───`,
        mentions: [targetId],
      }, { quoted: m }
    )
  },
}

// Función auxiliar de tiempo (Estandarizada)
function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const min = minutes < 10 ? '0' + minutes : minutes;
  const sec = seconds < 10 ? '0' + seconds : seconds;
  return `${min} minutos y ${sec} segundos`;
}
