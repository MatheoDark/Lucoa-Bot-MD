import { resolveLidToRealJid } from "../../lib/utils.js"
import { getRPGImage } from '../../lib/rpgImages.js'

const CASTIGOS_FAIL = [
  {
    msg: (nombre, multa, mon) => `🚔 *¡La policía te atrapó!*\n│ Intentaste robar a *${nombre}* pero\n│ un guardia te vio y te arrestaron.\n│\n│ 💸 Multa: *-¥${multa.toLocaleString()} ${mon}*\n│ 💔 Salud: *-15 HP*\n│ ⚡ XP: *-10%*\n│ ⏰ Cooldown: *+45 min extra*`,
    healthLoss: 15, xpPercent: 0.10, finePercent: 0.20, extraCooldown: 45 * 60 * 1000
  },
  {
    msg: (nombre, multa, mon) => `⚡ *¡La víctima contraatacó!*\n│ *${nombre}* te descubrió robándole\n│ y te dio una paliza.\n│\n│ 💸 Multa: *-¥${multa.toLocaleString()} ${mon}*\n│ 💔 Salud: *-25 HP*\n│ ⚡ XP: *-5%*`,
    healthLoss: 25, xpPercent: 0.05, finePercent: 0.15, extraCooldown: 0
  },
  {
    msg: (nombre, multa, mon) => `🏦 *¡El banco confiscó tu dinero!*\n│ Al intentar robar a *${nombre}*, el\n│ banco detectó actividad sospechosa\n│ y congeló parte de tu cuenta.\n│\n│ 💸 Multa: *-¥${multa.toLocaleString()} ${mon}*\n│ 🏦 Banco: *-8% confiscado*\n│ 💔 Salud: *-10 HP*`,
    healthLoss: 10, xpPercent: 0, finePercent: 0.18, extraCooldown: 0, bankPercent: 0.08
  },
  {
    msg: (nombre, multa, mon) => `🐉 *¡Lucoa intervino!*\n│ Lucoa protegió a *${nombre}* con\n│ su barrera mágica. Te quemaste\n│ intentando cruzarla~ ☄️\n│\n│ 💸 Multa: *-¥${multa.toLocaleString()} ${mon}*\n│ 💔 Salud: *-20 HP*\n│ ⚡ XP: *-8%*\n│ ⏰ Cooldown: *+30 min extra*`,
    healthLoss: 20, xpPercent: 0.08, finePercent: 0.22, extraCooldown: 30 * 60 * 1000
  },
  {
    msg: (nombre, multa, mon) => `👻 *¡Mala suerte total!*\n│ Tropezaste mientras huías de\n│ *${nombre}* y la policía te encontró\n│ tirado en el suelo...\n│\n│ 💸 Multa: *-¥${multa.toLocaleString()} ${mon}*\n│ 💔 Salud: *-30 HP*\n│ ⚡ XP: *-12%*\n│ ⏰ Cooldown: *+1 hora extra*`,
    healthLoss: 30, xpPercent: 0.12, finePercent: 0.25, extraCooldown: 60 * 60 * 1000
  },
]

export default {
  command: ['steal', 'rob', 'robar'],
  category: 'rpg',
  run: async ({ client, m }) => {
    
    if (!m.isGroup) return m.reply('🐲 Este comando solo funciona en grupos (◕ᴗ◕✿)')

    const chatId = m.chat
    const chatData = global.db.data.chats[chatId] || {}

    if (chatData.adminonly || !chatData.rpg) {
      return m.reply('🐉 La economía está dormida en este grupo zzZ')
    }

    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId] || {}
    const monedas = botSettings.currency || 'coins'

    const senderId = await resolveLidToRealJid(m.sender, client, chatId)
    
    let senderData = global.db.data.users[senderId]
    if (!senderData) {
        global.db.data.users[senderId] = { coins: 0, roboCooldown: 0, exp: 0, health: 100 }
        senderData = global.db.data.users[senderId]
    }

    const mentioned = m.mentionedJid || []
    const who = mentioned[0] || (m.quoted ? m.quoted.sender : null)

    if (!who) return m.reply('🐲 Menciona a alguien para robar (◕ᴗ◕)')

    const targetId = await resolveLidToRealJid(who, client, chatId)

    if (targetId === senderId) return m.reply('🐲 No puedes robarte a ti mismo (≧◡≦)')
    if (targetId === botId) return m.reply('🐲 No puedes robarme a mí~ soy un dragón (◕ᴗ◕✿) 🐉')

    const targetData = global.db.data.users[targetId]
    if (!targetData) return m.reply('🐲 Ese usuario no tiene dinero registrado (◕︿◕)')

    if ((targetData.coins || 0) < 50) {
      return m.reply('🐲 La víctima es muy pobre, no vale la pena (╥﹏╥)')
    }

    // Verificar salud mínima
    senderData.health = senderData.health ?? 100
    if (senderData.health < 20) {
      return m.reply('🐲 Estás muy herido para robar. Tienes *' + senderData.health + ' HP*. Necesitas al menos *20 HP* (◕︿◕)')
    }

    senderData.roboCooldown = senderData.roboCooldown || 0
    const remainingTime = senderData.roboCooldown - Date.now()

    if (remainingTime > 0) {
      return m.reply(`🐲 La policía te vigila. Espera *${msToTime(remainingTime)}* (◕︿◕✿)`)
    }

    const COOLDOWN_BASE = 30 * 60 * 1000
    const now = Date.now()
    const success = Math.random() < 0.65
    const targetName = targetData.name || targetId.split('@')[0]

    if (!success) {
      // ═══ CASTIGO ALEATORIO ═══
      const castigo = CASTIGOS_FAIL[Math.floor(Math.random() * CASTIGOS_FAIL.length)]
      const multa = Math.floor((senderData.coins || 0) * castigo.finePercent)

      // Aplicar multa de monedas
      senderData.coins = Math.max(0, (senderData.coins || 0) - multa)

      // Aplicar pérdida de salud
      senderData.health = Math.max(0, (senderData.health || 100) - castigo.healthLoss)

      // Aplicar pérdida de XP
      if (castigo.xpPercent > 0) {
        const xpLost = Math.floor((senderData.exp || 0) * castigo.xpPercent)
        senderData.exp = Math.max(0, (senderData.exp || 0) - xpLost)
      }

      // Aplicar confiscación del banco
      if (castigo.bankPercent) {
        const bankLoss = Math.floor((senderData.bank || 0) * castigo.bankPercent)
        senderData.bank = Math.max(0, (senderData.bank || 0) - bankLoss)
      }

      // Cooldown base + extra del castigo
      senderData.roboCooldown = now + COOLDOWN_BASE + (castigo.extraCooldown || 0)

      if (typeof global.markDBDirty === 'function') global.markDBDirty()

      const imgFail = await getRPGImage('steal', 'fail')
      return client.sendMessage(chatId, {
          image: { url: imgFail },
          caption: `╭─── ⋆🐉⋆ ───\n│ ${castigo.msg(`@${targetId.split('@')[0]}`, multa, monedas)}\n╰─── ⋆🐲⋆ ───\n> 🐉 *Lucoa Bot* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`,
          mentions: [senderId, targetId],
        }, { quoted: m }
      )
    }

    // ═══ ÉXITO ═══
    const cantidadRobada = Math.min(Math.floor(Math.random() * 5000) + 50, targetData.coins)
    
    senderData.coins += cantidadRobada
    targetData.coins -= cantidadRobada
    senderData.roboCooldown = now + COOLDOWN_BASE

    // 15% de chance de robar también un personaje
    let charMsg = ''
    const chatUsers = chatData.users || {}
    const victimLocal = chatUsers[targetId]

    if (victimLocal?.characters?.length > 0 && Math.random() < 0.15) {
      const charIndex = Math.floor(Math.random() * victimLocal.characters.length)
      const personajeRobado = victimLocal.characters[charIndex]

      if (!personajeRobado.protectionUntil || personajeRobado.protectionUntil <= now) {
        victimLocal.characters.splice(charIndex, 1)

        if (!chatData.users[senderId]) chatData.users[senderId] = { characters: [] }
        if (!chatData.users[senderId].characters) chatData.users[senderId].characters = []
        
        delete personajeRobado.protectionUntil
        personajeRobado.obtainedAt = now
        personajeRobado.origin = 'steal'
        chatData.users[senderId].characters.push(personajeRobado)

        charMsg = `\n│\n│ 🐉 *¡BONUS! Robaste un personaje!*\n│ ❀ *${personajeRobado.name}* (${personajeRobado.source || '???'})\n│ ❀ Valor: *¥${(personajeRobado.value || 0).toLocaleString()}*`
      }
    }

    if (typeof global.markDBDirty === 'function') global.markDBDirty()

    const imgSuccess = await getRPGImage('steal', 'success')
    await client.sendMessage(chatId, {
        image: { url: imgSuccess },
        caption: `╭─── ⋆🐉⋆ ───\n│ 🥷 *¡ROBO EXITOSO!*\n├───────────────\n│ Le robaste *¥${cantidadRobada.toLocaleString()} ${monedas}*\n│ a *@${targetId.split('@')[0]}* (◕ᴗ◕✿)${charMsg}\n╰─── ⋆🐲⋆ ───\n> 🐉 *Lucoa Bot* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`,
        mentions: [targetId],
      }, { quoted: m }
    )
  },
}

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0) parts.push(`${seconds}s`)
  return parts.join(' ') || '0s'
}
