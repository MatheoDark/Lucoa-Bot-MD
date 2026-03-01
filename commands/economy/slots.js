import { resolveLidToRealJid } from '../../lib/utils.js'

// ═══════════════════════════════════════════
//  🎰 TRAGAMONEDAS - Gira los rodillos
// ═══════════════════════════════════════════

const SIMBOLOS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🎰', '⭐']

// Multiplicadores por combinación
const PREMIOS = {
  '7️⃣7️⃣7️⃣': { mult: 50, nombre: '¡¡¡JACKPOT!!!' },
  '💎💎💎': { mult: 25, nombre: '¡DIAMANTES!' },
  '⭐⭐⭐': { mult: 15, nombre: '¡ESTRELLAS!' },
  '🎰🎰🎰': { mult: 10, nombre: '¡TRIPLE SLOT!' },
  '🍇🍇🍇': { mult: 8, nombre: '¡Uvas!' },
  '🍊🍊🍊': { mult: 6, nombre: '¡Naranjas!' },
  '🍋🍋🍋': { mult: 5, nombre: '¡Limones!' },
  '🍒🍒🍒': { mult: 4, nombre: '¡Cerezas!' },
}

function spin() {
  // Los 7s y diamantes son más raros
  const weighted = [
    ...Array(4).fill('🍒'),
    ...Array(4).fill('🍋'),
    ...Array(3).fill('🍊'),
    ...Array(3).fill('🍇'),
    ...Array(2).fill('⭐'),
    ...Array(2).fill('🎰'),
    ...Array(1).fill('💎'),
    ...Array(1).fill('7️⃣'),
  ]
  return weighted[Math.floor(Math.random() * weighted.length)]
}

export default {
  command: ['slots', 'slot', 'tragamonedas', 'tragaperras'],
  category: 'rpg',
  run: async ({ client, m, args, usedPrefix, command }) => {
    if (!m.isGroup) return m.reply('🐲 Solo en grupos (◕ᴗ◕✿)')

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) return m.reply('🐉 La economía está dormida zzZ')

    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const monedas = settings.currency || 'monedas'

    const userId = await resolveLidToRealJid(m.sender, client, m.chat)
    let user = global.db.data.users[userId]
    if (!user) {
      global.db.data.users[userId] = { coins: 0, exp: 0 }
      user = global.db.data.users[userId]
    }
    user.coins = user.coins || 0

    // Validar apuesta
    if (!args[0]) {
      return m.reply(`╭─── ⋆🐉⋆ ───\n│ 🎰 *TRAGAMONEDAS*\n├───────────────\n│ ❀ Uso: *${usedPrefix}${command} <cantidad>*\n│ ❀ Ejemplo: *${usedPrefix}${command} 1000*\n│ ❀ También: *${usedPrefix}${command} all*\n│\n│ 🏆 *Premios:*\n│ ❀ 7️⃣7️⃣7️⃣ = x50 (Jackpot)\n│ ❀ 💎💎💎 = x25\n│ ❀ ⭐⭐⭐ = x15\n│ ❀ 🎰🎰🎰 = x10\n│ ❀ 🍇🍇🍇 = x8\n│ ❀ 🍊🍊🍊 = x6\n│ ❀ 🍋🍋🍋 = x5\n│ ❀ 🍒🍒🍒 = x4\n│ ❀ 2 iguales = x2\n╰─── ⋆✨⋆ ───`)
    }

    let amount
    if (args[0].toLowerCase() === 'all' || args[0].toLowerCase() === 'todo') {
      amount = user.coins
    } else {
      amount = parseInt(args[0])
    }

    if (isNaN(amount) || amount < 100) return m.reply(`� Apuesta mínima: *100 ${monedas}* (◕ᴗ◕)`)
    if (amount > 200000) return m.reply(`🐲 Apuesta máxima: *200,000 ${monedas}* (◕︿◕)`)
    if (user.coins < amount) return m.reply(`🐲 No tienes suficiente. Tienes: *¥${user.coins.toLocaleString()}* (╥﹏╥)`)

    // Girar rodillos
    const r1 = spin()
    const r2 = spin()
    const r3 = spin()
    const combo = `${r1}${r2}${r3}`

    let resultado = ''
    let ganancia = 0

    // Triple (premio grande)
    if (PREMIOS[combo]) {
      const premio = PREMIOS[combo]
      ganancia = amount * premio.mult
      const neto = ganancia - amount
      user.coins += neto
      resultado = `🏆 *${premio.nombre}* (x${premio.mult})\n\n💰 ¡Ganaste *¥${ganancia.toLocaleString()} ${monedas}*!`
    }
    // Doble (premio pequeño x2)
    else if (r1 === r2 || r2 === r3 || r1 === r3) {
      ganancia = amount * 2
      const neto = ganancia - amount
      user.coins += neto
      resultado = `✨ *¡Doble!* (x2)\n\n💰 Ganaste *¥${ganancia.toLocaleString()} ${monedas}*`
    }
    // Nada
    else {
      user.coins -= amount
      resultado = `💸 No hubo combinación.\n\n❌ Perdiste *¥${amount.toLocaleString()} ${monedas}*`
    }

    const jackpotMsg = combo === '7️⃣7️⃣7️⃣' ? '\n\n🎊🎊🎊 ¡¡¡JACKPOT MÁXIMO!!! 🎊🎊🎊' : ''

    const msg = `╭─── ⋆🐉⋆ ───
│ 🎰 *T R A G A M O N E D A S*
├───────────────
│   ${r1} │ ${r2} │ ${r3}
│
│ ${resultado}${jackpotMsg}
│
│ 👛 Saldo: *¥${user.coins.toLocaleString()} ${monedas}*
╰─── ⋆✨⋆ ───`

    await client.sendMessage(m.chat, { text: msg }, { quoted: m })
  }
}
