import { resolveLidToRealJid } from '../../lib/utils.js'
import { getRPGImage } from '../../lib/rpgImages.js'

export default {
  command: ['rt', 'roulette', 'ruleta'],
  category: 'rpg',
  run: async ({ client, m, text, usedPrefix, command, args }) => {
    
    // 1. Validaciones de Grupo
    if (!m.isGroup) return m.reply('🐲 Solo en grupos (◕ᴗ◕✿)')

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) {
         return m.reply('🐉 La economía está dormida zzZ')
    }

    // 2. Configuración Bot
    let botId = client.user.id.split(':')[0] + '@s.whatsapp.net';
    let botSettings = global.db.data.settings[botId] || {}
    let currency = botSettings.currency || 'monedas'

    // 3. Resolución de Usuario (ID Real)
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    let user = global.db.data.users[userId]

    // Inicializamos si no existe
    if (!user) {
         global.db.data.users[userId] = { coins: 0, rtCooldown: 0 }
         user = global.db.data.users[userId]
    }

    // Aseguramos propiedades
    user.coins = user.coins || 0
    user.rtCooldown = user.rtCooldown || 0

    // 4. Cooldown (10 Minutos)
    let remainingTime = user.rtCooldown - Date.now()
    if (remainingTime > 0) {
      return m.reply(`🐲 Espera *${msToTime(remainingTime)}* para la ruleta (◕︿◕✿)`)
    }

    // 5. Validar Argumentos
    // Ejemplo: #rt 100 red
    if (!args[0] || !args[1]) {
      return m.reply(`╭─── ⋆🐉⋆ ───\n│ 🎰 *RULETA*\n├───────────────\n│ Ingresa cantidad y color\n│ 🎲 *Ejemplo:* ${usedPrefix + command} 200 black\n│\n│ 🎨 *Colores:*\n│ ❀ 🔴 Red (x2)\n│ ❀ ⚫ Black (x2)\n│ ❀ 🟢 Green (x15)\n╰─── ⋆✨⋆ ───`)
    }

    let amount = 0
    // Soporte para #rt all black
    if (args[0].toLowerCase() === 'all' || args[0].toLowerCase() === 'todo') {
        amount = user.coins
    } else {
        amount = parseInt(args[0])
    }
    
    const color = args[1].toLowerCase()

    // 6. Validaciones de Dinero
    if (isNaN(amount) || amount < 1) return m.reply('🐲 Ingresa una cantidad válida (◕ᴗ◕)')
    if (amount < 50) return m.reply(`🐲 La apuesta mínima es *50 ${currency}* (◕ᴗ◕)`)
    if (amount > 500000) return m.reply(`🐲 Máximo *500,000 ${currency}* por ronda (◕ᴗ◕)`)
    
    if (user.coins < amount) {
        return m.reply(`� No tienes suficientes *${currency}* (╥﹏╥)\n│ 👛 Tienes: *${user.coins.toLocaleString()}*`)
    }

    // Validar Color (Acepta Español e Inglés)
    if (!['red', 'black', 'green', 'rojo', 'negro', 'verde'].includes(color)) {
      return m.reply(`╭─── ⋆🐉⋆ ───\n│ 🎨 *Colores disponibles:*\n│ ❀ 🔴 Red (Rojo)\n│ ❀ ⚫ Black (Negro)\n│ ❀ 🟢 Green (Verde)\n╰─── ⋆✨⋆ ───`)
    }

    // Normalizar color a Inglés
    let userColor = color
    if (color === 'rojo') userColor = 'red'
    if (color === 'negro') userColor = 'black'
    if (color === 'verde') userColor = 'green'

    // 7. Lógica del Juego
    // Probabilidades: 15 Casillas en total
    const colors = [
      'red','red','red','red','red','red',             // 6 Rojos (40%)
      'black','black','black','black','black','black', // 6 Negros (40%)
      'green',                                         // 1 Verde (6.6%) -> PAGA x15
      'orange',                                        // 1 Naranja (6.6%) -> PIERDE APUESTA
      'white'                                          // 1 Blanco (6.6%) -> PIERDE TODO EL BANCO
    ]

    const resultColor = colors[Math.floor(Math.random() * colors.length)]
    
    // Aplicamos Cooldown de 10 min
    user.rtCooldown = Date.now() + 10 * 60 * 1000 

    const colorEmojis = { red: '🔴', black: '⚫', green: '🟢', orange: '🟠', white: '⚪' }

    // --- ESCENARIO 1: ORANGE (Maldito) ---
    // Pierdes solo lo apostado, aunque hayas acertado el color (mala suerte extremas)
    if (resultColor === 'orange') {
      user.coins -= amount
      const imgOrange = await getRPGImage('roulette', 'orange')
      await client.sendMessage(m.chat, { image: { url: imgOrange }, caption: `╭─── ⋆🐉⋆ ───\n│ 🎰 *RULETA ESPECIAL*\n├───────────────\n│ Cayó en ${colorEmojis[resultColor]} *ORANGE*\n│ 😵 ¡Color maldito! La bola rebotó mal\n│ 💸 Perdiste *${amount.toLocaleString()} ${currency}*\n╰─── ⋆✨⋆ ───` }, { quoted: m })
      return
    }

    // --- ESCENARIO 2: WHITE (Fatal) ---
    // Pierdes TODO tu dinero, no solo lo apostado
    if (resultColor === 'white') {
      let totalPerdido = user.coins
      user.coins = 0 
      const imgWhite = await getRPGImage('roulette', 'white')
      await client.sendMessage(m.chat, { image: { url: imgWhite }, caption: `╭─── ⋆🐉⋆ ───\n│ 🎰 *RULETA FATAL*\n├───────────────\n│ Cayó en ${colorEmojis[resultColor]} *WHITE*\n│ ☠️ ¡Desastre Total! La casa se queda con todo\n│ 💸 Perdiste: *${totalPerdido.toLocaleString()} ${currency}*\n╰─── ⋆✨⋆ ───` }, { quoted: m })
      return
    }

    // --- ESCENARIO 3: RESULTADO NORMAL ---
    if (resultColor === userColor) {
      // GANAR
      // Si es VERDE multiplica x15, si es ROJO/NEGRO x2
      let multiplier = (resultColor === 'green') ? 15 : 2
      
      let profit = amount * multiplier // Ganancia total
      let netWin = profit - amount     // Ganancia limpia

      user.coins += netWin // Sumamos la ganancia neta
      
      const imgWin = await getRPGImage('roulette', 'win')
      await client.sendMessage(m.chat, { image: { url: imgWin }, caption: `╭─── ⋆🐉⋆ ───\n│ 🎰 *RULETA*\n├───────────────\n│ Cayó en ${colorEmojis[resultColor]} *${resultColor.toUpperCase()}*\n│ ✨ ¡Ganaste *${profit.toLocaleString()} ${currency}*!\n╰─── ⋆✨⋆ ───` }, { quoted: m })
    } else {
      // PERDER
      user.coins -= amount
      const imgLose = await getRPGImage('roulette', 'lose')
      await client.sendMessage(m.chat, { image: { url: imgLose }, caption: `╭─── ⋆🐉⋆ ───\n│ 🎰 *RULETA*\n├───────────────\n│ Cayó en ${colorEmojis[resultColor]} *${resultColor.toUpperCase()}*\n│ 💸 Perdiste *${amount.toLocaleString()} ${currency}*\n╰─── ⋆✨⋆ ───` }, { quoted: m })
    }
  }
}

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  let min = minutes < 10 ? '0' + minutes : minutes
  let sec = seconds < 10 ? '0' + seconds : seconds
  return `${min}m ${sec}s`
}
