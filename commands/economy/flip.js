import { resolveLidToRealJid } from '../../lib/utils.js'

export default {
  command: ['cf', 'flip', 'coinflip'],
  category: 'rpg',
  run: async ({ client, m, command, args, usedPrefix }) => { 
    const prefa = usedPrefix || '/'

    // 1. Validaciones de Grupo
    if (global.db.data.chats[m.chat].adminonly) return m.reply('🐲 Solo administradores (◕ᴗ◕✿)')
    if (!global.db.data.chats[m.chat].rpg) return m.reply('🐉 La economía está dormida zzZ')

    // 2. Resolución de Usuario
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    let user = global.db.data.users[userId]

    // Inicializar si no existe
    if (!user) {
        global.db.data.users[userId] = { coins: 0, coinfCooldown: 0 }
        user = global.db.data.users[userId]
    }

    // 3. Cooldown
    if (!user.coinfCooldown) user.coinfCooldown = 0;
    let remainingTime = user.coinfCooldown - Date.now();

    if (remainingTime > 0) {
      return m.reply(`🐲 Espera *${msToTime(remainingTime)}* (◕︿◕✿)`);
    }

    // 4. Configuración Bot
    let botId = client.user.id.split(':')[0] + '@s.whatsapp.net';
    let botSettings = global.db.data.settings[botId] || {}
    let monedas = botSettings.currency || 'coins'

    // 5. Detectar Argumentos (Inteligente)
    // Busca cuál argumento es número y cuál es texto
    let cantidadArg = args.find(a => !isNaN(parseInt(a)) || a.toLowerCase() === 'all' || a.toLowerCase() === 'todo')
    let eleccionArg = args.find(a => isNaN(parseInt(a)) && a.toLowerCase() !== 'all' && a.toLowerCase() !== 'todo')

    if (!eleccionArg || !cantidadArg) {
      return m.reply(`🐲 Ejemplo (◕ᴗ◕):\n│ *${prefa + command} 500 cara*\n│ *${prefa + command} cara 500*`)
    }

    // Procesar Cantidad
    let cantidad = 0
    if (cantidadArg.toLowerCase() === 'all' || cantidadArg.toLowerCase() === 'todo') {
        cantidad = user.coins
    } else {
        cantidad = parseInt(cantidadArg)
    }

    // Procesar Elección
    let eleccion = eleccionArg.toLowerCase()
    // Normalizar
    if (eleccion === 'heads') eleccion = 'cara'
    if (eleccion === 'tails') eleccion = 'cruz'

    if (eleccion !== 'cara' && eleccion !== 'cruz')
      return m.reply('🐲 Elige *cara* o *cruz* (◕ᴗ◕)')

    // 6. Validaciones de Dinero
    if (isNaN(cantidad) || cantidad < 200) return m.reply(`🐲 Mínimo *200 ${monedas}* (◕︿◕)`)
    if (cantidad > 50000) return m.reply(`🐲 Máximo *50,000 ${monedas}* (◕︿◕)`) // Subí un poco el límite
    if (user.coins < cantidad) return m.reply(`🐲 No tienes suficientes *${monedas}* (╥﹏╥)`)

    // 7. Lógica del Juego
    let azar = Math.random()
    user.coinfCooldown = Date.now() + 10 * 60 * 1000; // 10 min cooldown
    let resultado

    // 10% probabilidad de caer de canto (pierdes mitad)
    // 45% cara, 45% cruz
    if (azar < 0.1) resultado = 'perdido' 
    else resultado = azar < 0.55 ? 'cara' : 'cruz'

    let cantidadFormatted = cantidad.toLocaleString()
    let mensaje = `╭─── ⋆🐉⋆ ───\n│ 🪙 *COINFLIP*\n├───────────────\n│ Cayó en `

    if (resultado === eleccion) {
      // GANAR
      user.coins += cantidad
      mensaje += `*${resultado.toUpperCase()}* 🪙\n│\n│ ✨ ¡Ganaste *¥${cantidadFormatted} ${monedas}*!\n╰─── ⋆✨⋆ ───`
    } else if (resultado === 'perdido') {
      // CANTO (Mala suerte)
      let perdida = Math.floor(cantidad * 0.5)
      user.coins -= perdida
      mensaje += `*DE CANTO* 😵‍💫\n│ La moneda rodó lejos...\n│\n│ 💸 Perdiste la mitad (*¥${perdida.toLocaleString()}*)\n╰─── ⋆✨⋆ ───`
    } else {
      // PERDER
      user.coins -= cantidad
      mensaje += `*${resultado.toUpperCase()}* 💀\n│\n│ ❌ Perdiste *¥${cantidadFormatted} ${monedas}* (╥﹏╥)\n╰─── ⋆✨⋆ ───`
    }

    await client.reply(m.chat, mensaje, m)
  }
}

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
}
