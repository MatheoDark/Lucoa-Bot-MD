import { resolveLidToRealJid } from '../../lib/utils.js'
import { getExploreBonus, getTrapReduction, getXpBonus, tryDoubleReward } from './skills.js'
import { getClassBonus } from './class.js'
import { getPrestigeMultiplier } from './prestige.js'
import { updateMissionProgress } from './missions.js'
import { getRPGImage } from '../../lib/rpgImages.js'
import { readFileSync } from 'fs'

const allCharacters = JSON.parse(readFileSync(new URL('../../lib/characters.json', import.meta.url)))

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
      { tipo: 'tesoro', texto: 'Encontraste un cofre escondido bajo el piso de madera podrida', coinsMin: 10000, coinsMax: 40000, expMin: 400, expMax: 1600 },
      { tipo: 'tesoro', texto: 'Descubriste una caja fuerte abierta con monedas antiguas', coinsMin: 15000, coinsMax: 50000, expMin: 600, expMax: 2000 },
      { tipo: 'pelea', texto: 'Un fantasma protege el lugar. ¡Lo derrotaste y tomaste su tesoro!', coinsMin: 20000, coinsMax: 60000, expMin: 1000, expMax: 3000 },
      { tipo: 'trampa', texto: 'Pisaste una trampa oculta y perdiste parte de tu dinero', coinsMin: -5000, coinsMax: -1500, expMin: 100, expMax: 200 },
      { tipo: 'nada', texto: 'La mansión estaba vacía... solo encontraste polvo y telarañas', coinsMin: 500, coinsMax: 2000, expMin: 100, expMax: 300 },
    ]
  },
  {
    zona: '🌋 Volcán Activo',
    resultados: [
      { tipo: 'tesoro', texto: 'Encontraste rubíes incrustados en la roca volcánica', coinsMin: 25000, coinsMax: 70000, expMin: 800, expMax: 2400 },
      { tipo: 'pelea', texto: 'Un golem de lava apareció. Tras una batalla épica, lo venciste', coinsMin: 30000, coinsMax: 80000, expMin: 1200, expMax: 4000 },
      { tipo: 'trampa', texto: 'El suelo se derrumbó y casi caes a la lava. Perdiste suministros', coinsMin: -8000, coinsMax: -3000, expMin: 200, expMax: 400 },
      { tipo: 'tesoro', texto: 'Descubriste una veta de obsidiana que vale una fortuna', coinsMin: 20000, coinsMax: 55000, expMin: 700, expMax: 2200 },
      { tipo: 'legendario', texto: '¡En el interior del volcán hallaste el Diamante de Fuego!', coinsMin: 60000, coinsMax: 160000, expMin: 4000, expMax: 10000 },
    ]
  },
  {
    zona: '🏛️ Ruinas Antiguas',
    resultados: [
      { tipo: 'tesoro', texto: 'Descifraste un jeroglífico que reveló un compartimento secreto', coinsMin: 15000, coinsMax: 45000, expMin: 1000, expMax: 3000 },
      { tipo: 'tesoro', texto: 'Encontraste un sarcófago con joyas del faraón', coinsMin: 30000, coinsMax: 70000, expMin: 1200, expMax: 3600 },
      { tipo: 'pelea', texto: 'Una momia guardiana despertó. ¡La venciste con astucia!', coinsMin: 25000, coinsMax: 60000, expMin: 1000, expMax: 3000 },
      { tipo: 'trampa', texto: 'Activaste una trampa de dardos envenenados', coinsMin: -6000, coinsMax: -2000, expMin: 150, expMax: 400 },
      { tipo: 'nada', texto: 'Las ruinas ya habían sido saqueadas por otros aventureros', coinsMin: 800, coinsMax: 3000, expMin: 200, expMax: 600 },
    ]
  },
  {
    zona: '🌊 Cueva Submarina',
    resultados: [
      { tipo: 'tesoro', texto: 'Buceaste hasta un galeón hundido y encontraste doblones de oro', coinsMin: 20000, coinsMax: 60000, expMin: 800, expMax: 2500 },
      { tipo: 'pelea', texto: 'Un kraken bebé atacó, pero lo ahuyentaste y tomaste su tesoro', coinsMin: 35000, coinsMax: 90000, expMin: 1600, expMax: 5000 },
      { tipo: 'tesoro', texto: 'Las sirenas te guiaron hasta una perla negra legendaria', coinsMin: 30000, coinsMax: 80000, expMin: 1000, expMax: 3000 },
      { tipo: 'trampa', texto: 'La corriente submarina te arrastró y perdiste tu bolsa de monedas', coinsMin: -10000, coinsMax: -3000, expMin: 100, expMax: 300 },
      { tipo: 'legendario', texto: '¡Encontraste la Corona de Poseidón en el fondo del océano!', coinsMin: 80000, coinsMax: 200000, expMin: 6000, expMax: 16000 },
    ]
  },
  {
    zona: '🌌 Portal Dimensional',
    resultados: [
      { tipo: 'tesoro', texto: 'Viajaste a una dimensión donde llueven cristales de energía', coinsMin: 25000, coinsMax: 70000, expMin: 1000, expMax: 3000 },
      { tipo: 'pelea', texto: 'Un guardián interdimensional probó tu valor. ¡Ganaste!', coinsMin: 40000, coinsMax: 100000, expMin: 2000, expMax: 6000 },
      { tipo: 'trampa', texto: 'El portal se cerró antes de tiempo y perdiste parte de tu inventario', coinsMin: -12000, coinsMax: -5000, expMin: 200, expMax: 600 },
      { tipo: 'tesoro', texto: 'En la otra dimensión, el dinero crece en los árboles', coinsMin: 16000, coinsMax: 50000, expMin: 800, expMax: 2500 },
      { tipo: 'legendario', texto: '¡¡El Oráculo Cósmico te concedió una fortuna dimensional!!', coinsMin: 100000, coinsMax: 300000, expMin: 10000, expMax: 25000 },
    ]
  },
  {
    zona: '🏔️ Montaña del Dragón',
    resultados: [
      { tipo: 'tesoro', texto: 'Escalaste hasta una cueva con monedas de escamas de dragón', coinsMin: 18000, coinsMax: 55000, expMin: 800, expMax: 2500 },
      { tipo: 'pelea', texto: 'Un dragonete te atacó pero lo amansaste. Te regaló su tesoro', coinsMin: 30000, coinsMax: 80000, expMin: 1400, expMax: 4000 },
      { tipo: 'trampa', texto: 'Una avalancha te tomó por sorpresa y perdiste tu equipaje', coinsMin: -8000, coinsMax: -3000, expMin: 150, expMax: 500 },
      { tipo: 'nada', texto: 'La cumbre estaba vacía. Solo nubes y viento frío', coinsMin: 1000, coinsMax: 4000, expMin: 300, expMax: 800 },
      { tipo: 'legendario', texto: '¡¡El Gran Dragón Ancestral te premió con su tesoro milenario!!', coinsMin: 90000, coinsMax: 250000, expMin: 8000, expMax: 20000 },
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
    if (!m.isGroup) return m.reply('🐲 Solo funciona en grupos (◕ᴗ◕✿)')

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) return m.reply('🐉 La economía está dormida aquí zzZ')

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

    user.exploreCooldown = Date.now() + 10 * 60 * 1000

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

    let coins = randomInt(resultado.coinsMin, resultado.coinsMax)
    let exp = randomInt(resultado.expMin, resultado.expMax)

    // Aplicar bonos de skills y prestige
    const exploreMult = getExploreBonus(user)
    const trapReduce = getTrapReduction(user)
    const xpMult = getXpBonus(user)
    const prestigeMult = getPrestigeMultiplier(user)
    const legendaryBonus = getClassBonus(user, 'legendaryBonus') || 0
    const trapDodge = getClassBonus(user, 'trapDodge') || 0

    // Clase Explorador: esquivar trampas
    if (resultado.tipo === 'trampa' && trapDodge > 0 && Math.random() < trapDodge) {
      resultado = pickRandom(normales)
      coins = randomInt(resultado.coinsMin, resultado.coinsMax)
      exp = randomInt(resultado.expMin, resultado.expMax)
    }

    if (coins > 0) {
      coins = Math.floor(coins * exploreMult * prestigeMult)
    } else {
      coins = Math.floor(coins * trapReduce) // Reduce pérdidas
    }
    exp = Math.floor(exp * xpMult * prestigeMult)

    const doubleResult = coins > 0 ? tryDoubleReward(user, coins) : { doubled: false, amount: coins }
    coins = doubleResult.amount

    // Aplicar
    if (coins < 0) {
      user.coins = Math.max(0, user.coins + coins) // coins ya es negativo
    } else {
      user.coins += coins
    }
    user.exp = (user.exp || 0) + exp
    user.totalExplores = (user.totalExplores || 0) + 1

    // Actualizar misiones
    updateMissionProgress(user, 'explore')
    updateMissionProgress(user, 'commands')

    // 🐉 Chance de encontrar un personaje gacha durante la exploración
    let charDropMsg = ''
    const charDropChance = resultado.tipo === 'legendario' ? 0.30 : resultado.tipo === 'pelea' ? 0.10 : 0.03
    if (coins > 0 && Math.random() < charDropChance) {
      const chatData = global.db.data.chats[m.chat] || {}
      if (!chatData.users) chatData.users = {}
      if (!chatData.users[userId]) chatData.users[userId] = { characters: [] }
      if (!chatData.users[userId].characters) chatData.users[userId].characters = []
      
      const randomChar = allCharacters[Math.floor(Math.random() * allCharacters.length)]
      const newChar = {
        ...randomChar,
        obtainedAt: Date.now(),
        origin: 'explore'
      }
      chatData.users[userId].characters.push(newChar)
      charDropMsg = `\n│\n│ 🐉 *¡PERSONAJE ENCONTRADO!*\n│ ❀ *${randomChar.name}* (${randomChar.source})\n│ ❀ Valor: *¥${(randomChar.value || 0).toLocaleString()}*`
    }

    const emoji = tipoEmoji[resultado.tipo] || '🗺️'
    const coinsText = coins >= 0 
      ? `💰 +*¥${coins.toLocaleString()} ${monedas}*`
      : `💸 *¥${Math.abs(coins).toLocaleString()} ${monedas}* perdidos`

    const legendarioMsg = resultado.tipo === 'legendario' 
      ? '\n│\n│ ✨✨ ¡¡HALLAZGO LEGENDARIO!! ✨✨' 
      : ''

    const msg = `╭─── ⋆🐉⋆ ───
│ 🗺️ *EXPLORACIÓN*
├───────────────
│ 📍 Zona: *${exploracion.zona}*
│
│ ${emoji} ${resultado.texto}
│
│ ${coinsText}
│ ⚡ +*${exp.toLocaleString()} XP*
│ 🧭 Exploraciones: *${user.totalExplores}*${legendarioMsg}${charDropMsg}${doubleResult.doubled ? '\n│ 🔮 *¡AURA MÍSTICA! Duplicado*' : ''}
│
│ 👛 Saldo: *¥${user.coins.toLocaleString()} ${monedas}*
╰─── ⋆✨⋆ ───`

    const img = await getRPGImage('explore', exploracion.zona)
    await client.sendMessage(m.chat, { image: { url: img }, caption: msg }, { quoted: m })
  }
}
