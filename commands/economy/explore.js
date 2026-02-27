import { resolveLidToRealJid } from '../../lib/utils.js'

// ═══════════════════════════════════════════
//  🗺️ EXPLORAR - Aventura aleatoria
// ═══════════════════════════════════════════

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Cada exploración tiene múltiples outcomes posibles
const exploraciones = [
  {
    zona: '🏚️ Mansión Abandonada',
    resultados: [
      { tipo: 'tesoro', texto: 'Encontraste un cofre escondido bajo el piso de madera podrida', coinsMin: 5000, coinsMax: 20000, expMin: 200, expMax: 800 },
      { tipo: 'tesoro', texto: 'Descubriste una caja fuerte abierta con monedas antiguas', coinsMin: 8000, coinsMax: 25000, expMin: 300, expMax: 1000 },
      { tipo: 'pelea', texto: 'Un fantasma protege el lugar. ¡Lo derrotaste y tomaste su tesoro!', coinsMin: 10000, coinsMax: 30000, expMin: 500, expMax: 1500 },
      { tipo: 'trampa', texto: 'Pisaste una trampa oculta y perdiste parte de tu dinero', coinsMin: -3000, coinsMax: -1000, expMin: 50, expMax: 100 },
      { tipo: 'nada', texto: 'La mansión estaba vacía... solo encontraste polvo y telarañas', coinsMin: 100, coinsMax: 500, expMin: 50, expMax: 150 },
    ]
  },
  {
    zona: '🌋 Volcán Activo',
    resultados: [
      { tipo: 'tesoro', texto: 'Encontraste rubíes incrustados en la roca volcánica', coinsMin: 12000, coinsMax: 35000, expMin: 400, expMax: 1200 },
      { tipo: 'pelea', texto: 'Un golem de lava apareció. Tras una batalla épica, lo venciste', coinsMin: 15000, coinsMax: 40000, expMin: 600, expMax: 2000 },
      { tipo: 'trampa', texto: 'El suelo se derrumbó y casi caes a la lava. Perdiste suministros', coinsMin: -5000, coinsMax: -2000, expMin: 100, expMax: 200 },
      { tipo: 'tesoro', texto: 'Descubriste una veta de obsidiana que vale una fortuna', coinsMin: 10000, coinsMax: 28000, expMin: 350, expMax: 1100 },
      { tipo: 'legendario', texto: '¡En el interior del volcán hallaste el Diamante de Fuego!', coinsMin: 30000, coinsMax: 80000, expMin: 2000, expMax: 5000 },
    ]
  },
  {
    zona: '🏛️ Ruinas Antiguas',
    resultados: [
      { tipo: 'tesoro', texto: 'Descifraste un jeroglífico que reveló un compartimento secreto', coinsMin: 8000, coinsMax: 22000, expMin: 500, expMax: 1500 },
      { tipo: 'tesoro', texto: 'Encontraste un sarcófago con joyas del faraón', coinsMin: 15000, coinsMax: 35000, expMin: 600, expMax: 1800 },
      { tipo: 'pelea', texto: 'Una momia guardiana despertó. ¡La venciste con astucia!', coinsMin: 12000, coinsMax: 30000, expMin: 500, expMax: 1500 },
      { tipo: 'trampa', texto: 'Activaste una trampa de dardos envenenados', coinsMin: -4000, coinsMax: -1500, expMin: 80, expMax: 200 },
      { tipo: 'nada', texto: 'Las ruinas ya habían sido saqueadas por otros aventureros', coinsMin: 200, coinsMax: 800, expMin: 100, expMax: 300 },
    ]
  },
  {
    zona: '🌊 Cueva Submarina',
    resultados: [
      { tipo: 'tesoro', texto: 'Buceaste hasta un galeón hundido y encontraste doblones de oro', coinsMin: 10000, coinsMax: 30000, expMin: 400, expMax: 1200 },
      { tipo: 'pelea', texto: 'Un kraken bebé atacó, pero lo ahuyentaste y tomaste su tesoro', coinsMin: 18000, coinsMax: 45000, expMin: 800, expMax: 2500 },
      { tipo: 'tesoro', texto: 'Las sirenas te guiaron hasta una perla negra legendaria', coinsMin: 15000, coinsMax: 40000, expMin: 500, expMax: 1500 },
      { tipo: 'trampa', texto: 'La corriente submarina te arrastró y perdiste tu bolsa de monedas', coinsMin: -6000, coinsMax: -2000, expMin: 50, expMax: 150 },
      { tipo: 'legendario', texto: '¡Encontraste la Corona de Poseidón en el fondo del océano!', coinsMin: 40000, coinsMax: 100000, expMin: 3000, expMax: 8000 },
    ]
  },
  {
    zona: '🌌 Portal Dimensional',
    resultados: [
      { tipo: 'tesoro', texto: 'Viajaste a una dimensión donde llueven cristales de energía', coinsMin: 12000, coinsMax: 35000, expMin: 500, expMax: 1500 },
      { tipo: 'pelea', texto: 'Un guardián interdimensional probó tu valor. ¡Ganaste!', coinsMin: 20000, coinsMax: 50000, expMin: 1000, expMax: 3000 },
      { tipo: 'trampa', texto: 'El portal se cerró antes de tiempo y perdiste parte de tu inventario', coinsMin: -7000, coinsMax: -3000, expMin: 100, expMax: 300 },
      { tipo: 'tesoro', texto: 'En la otra dimensión, el dinero crece en los árboles', coinsMin: 8000, coinsMax: 25000, expMin: 400, expMax: 1200 },
      { tipo: 'legendario', texto: '¡¡El Oráculo Cósmico te concedió una fortuna dimensional!!', coinsMin: 50000, coinsMax: 150000, expMin: 5000, expMax: 12000 },
    ]
  },
  {
    zona: '🏔️ Montaña del Dragón',
    resultados: [
      { tipo: 'tesoro', texto: 'Escalaste hasta una cueva con monedas de escamas de dragón', coinsMin: 9000, coinsMax: 28000, expMin: 400, expMax: 1200 },
      { tipo: 'pelea', texto: 'Un dragonete te atacó pero lo amansaste. Te regaló su tesoro', coinsMin: 15000, coinsMax: 40000, expMin: 700, expMax: 2000 },
      { tipo: 'trampa', texto: 'Una avalancha te tomó por sorpresa y perdiste tu equipaje', coinsMin: -5000, coinsMax: -2000, expMin: 80, expMax: 250 },
      { tipo: 'nada', texto: 'La cumbre estaba vacía. Solo nubes y viento frío', coinsMin: 300, coinsMax: 1000, expMin: 150, expMax: 400 },
      { tipo: 'legendario', texto: '¡¡El Gran Dragón Ancestral te premió con su tesoro milenario!!', coinsMin: 45000, coinsMax: 120000, expMin: 4000, expMax: 10000 },
    ]
  }
]

const tipoEmoji = {
  tesoro: '💰',
  pelea: '⚔️',
  trampa: '💥',
  nada: '🍃',
  legendario: '🌟'
}

export default {
  command: ['explore', 'explorar', 'aventura', 'adventure'],
  category: 'rpg',
  run: async ({ client, m }) => {
    if (!m.isGroup) return m.reply('❌ Solo en grupos.')

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) return m.reply('✎ Economía desactivada en este grupo.')

    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const monedas = settings.currency || 'monedas'

    const userId = await resolveLidToRealJid(m.sender, client, m.chat)
    let user = global.db.data.users[userId]
    if (!user) {
      global.db.data.users[userId] = { coins: 0, exp: 0, exploreCooldown: 0, totalExplores: 0 }
      user = global.db.data.users[userId]
    }
    user.coins = user.coins || 0

    // Cooldown 15 minutos
    const remaining = (user.exploreCooldown || 0) - Date.now()
    if (remaining > 0) {
      const mins = Math.floor(remaining / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      return m.reply(`🗺️ Aún estás descansando de tu última aventura.\n> Espera *${mins}m ${secs}s*`)
    }

    user.exploreCooldown = Date.now() + 15 * 60 * 1000

    // Elegir exploración y resultado
    const exploracion = pickRandom(exploraciones)
    
    // Peso: legendarios 5%, trampas 20%, el resto distribuido
    const roll = Math.random()
    let resultado
    const legendarios = exploracion.resultados.filter(r => r.tipo === 'legendario')
    const trampas = exploracion.resultados.filter(r => r.tipo === 'trampa')
    const normales = exploracion.resultados.filter(r => r.tipo !== 'legendario' && r.tipo !== 'trampa')

    if (roll < 0.05 && legendarios.length > 0) {
      resultado = pickRandom(legendarios)
    } else if (roll < 0.25) {
      resultado = pickRandom(trampas.length > 0 ? trampas : normales)
    } else {
      resultado = pickRandom(normales)
    }

    const coins = randomInt(resultado.coinsMin, resultado.coinsMax)
    const exp = randomInt(resultado.expMin, resultado.expMax)

    // Aplicar - para trampas coins es negativo
    if (coins < 0) {
      user.coins = Math.max(0, user.coins + coins) // coins ya es negativo
    } else {
      user.coins += coins
    }
    user.exp = (user.exp || 0) + exp
    user.totalExplores = (user.totalExplores || 0) + 1

    const emoji = tipoEmoji[resultado.tipo] || '🗺️'
    const coinsText = coins >= 0 
      ? `💰 +*¥${coins.toLocaleString()} ${monedas}*`
      : `💸 *¥${Math.abs(coins).toLocaleString()} ${monedas}* perdidos`

    const legendarioMsg = resultado.tipo === 'legendario' 
      ? '\n\n✨✨ ¡¡HALLAZGO LEGENDARIO!! ✨✨' 
      : ''

    const msg = `🗺️ *EXPLORACIÓN*

📍 Zona: *${exploracion.zona}*

${emoji} ${resultado.texto}

${coinsText}
⚡ +*${exp.toLocaleString()} XP*
🧭 Exploraciones: *${user.totalExplores}*${legendarioMsg}

> 👛 Saldo: *¥${user.coins.toLocaleString()} ${monedas}*`

    await client.sendMessage(m.chat, { text: msg }, { quoted: m })
  }
}
