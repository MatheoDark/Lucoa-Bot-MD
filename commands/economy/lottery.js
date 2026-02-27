import { resolveLidToRealJid } from '../../lib/utils.js'

// ═══════════════════════════════════════════
//  🎟️ LOTERÍA - Compra boletos y gana jackpot
// ═══════════════════════════════════════════

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const TICKET_PRICE = 2000
const MAX_TICKETS = 20
const DRAW_NUMBERS = 5       // Se extraen 5 números
const MAX_NUMBER = 30         // del 1 al 30

function generateNumbers(count, max) {
  const nums = new Set()
  while (nums.size < count) {
    nums.add(randomInt(1, max))
  }
  return [...nums].sort((a, b) => a - b)
}

// Premios según cuántos números aciertes
const premios = {
  0: { multi: 0, emoji: '😔', texto: 'Sin suerte esta vez' },
  1: { multi: 0, emoji: '🤏', texto: 'Casi...' },
  2: { multi: 3, emoji: '🎯', texto: '¡Dos aciertos!' },
  3: { multi: 15, emoji: '🔥', texto: '¡TRES ACIERTOS!' },
  4: { multi: 100, emoji: '💎', texto: '¡¡CUATRO ACIERTOS!!' },
  5: { multi: 1000, emoji: '🏆', texto: '¡¡¡JACKPOT MÁXIMO!!!' },
}

export default {
  command: ['lottery', 'loteria', 'loto', 'boleto'],
  category: 'rpg',
  run: async ({ client, m, args }) => {
    if (!m.isGroup) return m.reply('❌ Solo en grupos.')

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) return m.reply('✎ Economía desactivada en este grupo.')

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

    const sub = (args[0] || '').toLowerCase()

    // ── Subcomando: ver info ──
    if (!sub || sub === 'info') {
      const msg = `🎟️ *LOTERÍA*

🎫 Precio por boleto: *¥${TICKET_PRICE.toLocaleString()} ${monedas}*
🔢 Se extraen *${DRAW_NUMBERS}* números del *1* al *${MAX_NUMBER}*
📦 Máximo *${MAX_TICKETS}* boletos por sorteo

*💰 Premios (por boleto):*
> 2 aciertos → x3 (¥${(TICKET_PRICE * 3).toLocaleString()})
> 3 aciertos → x15 (¥${(TICKET_PRICE * 15).toLocaleString()})
> 4 aciertos → x100 (¥${(TICKET_PRICE * 100).toLocaleString()})
> 5 aciertos → x1000 🏆 (¥${(TICKET_PRICE * 1000).toLocaleString()})

*📝 Uso:*
> *#loteria jugar [cantidad]*
> Compra 1-${MAX_TICKETS} boletos. Cada boleto tiene 5 números aleatorios.
> *#loteria jugar 5* → Compra 5 boletos

> 👛 Tu saldo: *¥${user.coins.toLocaleString()} ${monedas}*`
      return m.reply(msg)
    }

    // ── Subcomando: jugar ──
    if (sub === 'jugar' || sub === 'play' || sub === 'buy' || sub === 'comprar') {
      const cantidad = Math.min(MAX_TICKETS, Math.max(1, parseInt(args[1]) || 1))
      const costo = cantidad * TICKET_PRICE

      if (user.coins < costo) {
        return m.reply(`❌ Necesitas *¥${costo.toLocaleString()} ${monedas}* para ${cantidad} boleto(s).\n> 👛 Tienes: *¥${user.coins.toLocaleString()}*`)
      }

      user.coins -= costo

      // Generar números ganadores
      const winning = generateNumbers(DRAW_NUMBERS, MAX_NUMBER)

      // Generar boletos del jugador
      let totalGanancia = 0
      let mejorAciertos = 0
      const boletos = []

      for (let i = 0; i < cantidad; i++) {
        const ticket = generateNumbers(DRAW_NUMBERS, MAX_NUMBER)
        const aciertos = ticket.filter(n => winning.includes(n)).length
        const premio = premios[aciertos]
        const ganancia = TICKET_PRICE * premio.multi

        totalGanancia += ganancia
        if (aciertos > mejorAciertos) mejorAciertos = aciertos

        boletos.push({ ticket, aciertos, ganancia })
      }

      user.coins += totalGanancia
      user.exp = (user.exp || 0) + (mejorAciertos >= 3 ? mejorAciertos * 500 : 50)
      user.totalLottery = (user.totalLottery || 0) + cantidad
      if (mejorAciertos >= 4) user.lotteryJackpots = (user.lotteryJackpots || 0) + 1

      // Formatear resultados
      const winStr = winning.map(n => `[${String(n).padStart(2, '0')}]`).join(' ')

      let boletosStr = ''
      const maxShow = Math.min(boletos.length, 10) // Mostrar máx 10 boletos

      for (let i = 0; i < maxShow; i++) {
        const b = boletos[i]
        const tickStr = b.ticket.map(n => {
          const isMatch = winning.includes(n)
          return isMatch ? `*${String(n).padStart(2, '0')}*` : String(n).padStart(2, '0')
        }).join(' ')
        const emoji = premios[b.aciertos].emoji
        const ganStr = b.ganancia > 0 ? `+¥${b.ganancia.toLocaleString()}` : '—'
        boletosStr += `> ${emoji} ${tickStr} → ${b.aciertos}/${DRAW_NUMBERS} ${ganStr}\n`
      }

      if (boletos.length > maxShow) {
        boletosStr += `> _...y ${boletos.length - maxShow} boletos más_\n`
      }

      const netResult = totalGanancia - costo
      const resultEmoji = netResult > 0 ? '📈' : netResult < 0 ? '📉' : '↔️'
      const resultText = netResult > 0 
        ? `+¥${netResult.toLocaleString()}`
        : netResult < 0 
          ? `-¥${Math.abs(netResult).toLocaleString()}`
          : '±0'

      const jackpotMsg = mejorAciertos >= 4 
        ? `\n\n🎆🎆 ¡¡${premios[mejorAciertos].texto}!! 🎆🎆` 
        : mejorAciertos >= 3 
          ? `\n\n🔥 ¡${premios[mejorAciertos].texto}!` 
          : ''

      const msg = `🎟️ *LOTERÍA*

🎰 Números ganadores:
> ${winStr}

🎫 Tus boletos (${cantidad}):
${boletosStr}
💰 Ganancia total: *¥${totalGanancia.toLocaleString()}*
💸 Costo: *¥${costo.toLocaleString()}*
${resultEmoji} Neto: *${resultText} ${monedas}*${jackpotMsg}

> 👛 Saldo: *¥${user.coins.toLocaleString()} ${monedas}*`

      return client.sendMessage(m.chat, { text: msg }, { quoted: m })
    }

    return m.reply(`❌ Subcomando no reconocido.\n> Usa *#loteria* para ver info\n> Usa *#loteria jugar [cantidad]* para comprar boletos`)
  }
}
