import { resolveLidToRealJid } from '../../lib/utils.js'
import { getExploreBonus, getXpBonus, tryDoubleReward } from './skills.js'
import { getPrestigeMultiplier } from './prestige.js'
import { updateMissionProgress } from './missions.js'
import { getRPGImage } from '../../lib/rpgImages.js'
import { readFileSync } from 'fs'

const allCharacters = JSON.parse(readFileSync(new URL('../../lib/characters.json', import.meta.url)))

// ═══════════════════════════════════════════
//  🎣 PESCA - Atrapa peces de distinta rareza
// ═══════════════════════════════════════════

const peces = [
  // Comunes (50%)
  { nombre: 'Sardina', emoji: '🐟', rareza: 'Común', min: 1500, max: 5000, exp: 100 },
  { nombre: 'Trucha', emoji: '🐟', rareza: 'Común', min: 2000, max: 6000, exp: 120 },
  { nombre: 'Carpa', emoji: '🐟', rareza: 'Común', min: 1800, max: 5500, exp: 110 },
  { nombre: 'Bagre', emoji: '🐟', rareza: 'Común', min: 1600, max: 5200, exp: 100 },
  // Raros (25%)
  { nombre: 'Salmón Dorado', emoji: '🐠', rareza: 'Raro', min: 8000, max: 20000, exp: 400 },
  { nombre: 'Pez Espada', emoji: '🐠', rareza: 'Raro', min: 10000, max: 25000, exp: 500 },
  { nombre: 'Atún Rojo', emoji: '🐠', rareza: 'Raro', min: 9000, max: 22000, exp: 450 },
  // Épicos (15%)
  { nombre: 'Pez Dragón', emoji: '🐡', rareza: 'Épico', min: 20000, max: 50000, exp: 1000 },
  { nombre: 'Pez Luna', emoji: '🐡', rareza: 'Épico', min: 25000, max: 60000, exp: 1200 },
  // Legendarios (8%)
  { nombre: 'Koi Celestial', emoji: '🎏', rareza: 'Legendario', min: 50000, max: 120000, exp: 3000 },
  { nombre: 'Leviatán Bebé', emoji: '🐉', rareza: 'Legendario', min: 60000, max: 150000, exp: 4000 },
  // Mítico (2%)
  { nombre: 'Pez de Oro Puro', emoji: '✨', rareza: 'Mítico', min: 120000, max: 350000, exp: 10000 }
]

const eventos = [
  { texto: 'Lanzaste la caña al río cristalino...', emoji: '🌊' },
  { texto: 'Esperaste pacientemente junto al lago...', emoji: '🏞️' },
  { texto: 'Navegaste hasta un punto secreto de pesca...', emoji: '⛵' },
  { texto: 'Te sentaste en el muelle bajo la luna...', emoji: '🌙' },
  { texto: 'Encontraste un arroyo escondido en el bosque...', emoji: '🌲' }
]

const fracasos = [
  'El pez se escapó en el último momento... 💨',
  'Tu caña se rompió y no atrapaste nada 🎣💔',
  'Un pájaro se robó tu carnada 🦅',
  'El pez era demasiado fuerte y cortó la línea 💪',
  'Te quedaste dormido y el pez se fue 😴'
]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getPez() {
  const roll = Math.random() * 100
  let pool
  if (roll < 2) pool = peces.filter(p => p.rareza === 'Mítico')
  else if (roll < 10) pool = peces.filter(p => p.rareza === 'Legendario')
  else if (roll < 25) pool = peces.filter(p => p.rareza === 'Épico')
  else if (roll < 50) pool = peces.filter(p => p.rareza === 'Raro')
  else pool = peces.filter(p => p.rareza === 'Común')
  return pool[Math.floor(Math.random() * pool.length)]
}

const rarezaColor = {
  'Común': '⚪',
  'Raro': '🔵',
  'Épico': '🟣',
  'Legendario': '🟡',
  'Mítico': '🔴'
}

export default {
  command: ['fish', 'pescar', 'pesca'],
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
      global.db.data.users[userId] = { coins: 0, exp: 0, fishCooldown: 0, totalFish: 0 }
      user = global.db.data.users[userId]
    }

    // Cooldown 5 minutos
    const remaining = (user.fishCooldown || 0) - Date.now()
    if (remaining > 0) {
      const m2 = Math.floor(remaining / 60000)
      const s = Math.floor((remaining % 60000) / 1000)
      return m.reply(`🐲 La caña se recarga... espera *${m2}m ${s}s* (◕︿◕)`)
    }

    user.fishCooldown = Date.now() + 3 * 60 * 1000

    // 15% chance de no atrapar nada
    if (Math.random() < 0.15) {
      const fail = fracasos[Math.floor(Math.random() * fracasos.length)]
      return m.reply(`🐲 ${fail}\n│ Inténtalo de nuevo en 3 min (╥﹏╥)`)
    }

    const evento = eventos[Math.floor(Math.random() * eventos.length)]
    const pez = getPez()
    let coins = randomInt(pez.min, pez.max)
    let exp = randomInt(pez.exp, pez.exp * 2)

    // Aplicar bonos de skills y prestige
    const exploreMult = getExploreBonus(user)
    const xpMult = getXpBonus(user)
    const prestigeMult = getPrestigeMultiplier(user)
    coins = Math.floor(coins * exploreMult * prestigeMult)
    exp = Math.floor(exp * xpMult * prestigeMult)

    const doubleResult = tryDoubleReward(user, coins)
    coins = doubleResult.amount

    user.coins = (user.coins || 0) + coins
    user.exp = (user.exp || 0) + exp
    user.totalFish = (user.totalFish || 0) + 1

    // Actualizar misiones
    updateMissionProgress(user, 'fish')
    updateMissionProgress(user, 'commands')

    // 🐉 Chance de encontrar un personaje gacha en la pesca
    let charDropMsg = ''
    const charDropChance = pez.rareza === 'Mítico' ? 0.40 : pez.rareza === 'Legendario' ? 0.15 : pez.rareza === 'Épico' ? 0.05 : 0
    if (charDropChance > 0 && Math.random() < charDropChance) {
      const chatData = global.db.data.chats[m.chat] || {}
      if (!chatData.users) chatData.users = {}
      if (!chatData.users[userId]) chatData.users[userId] = { characters: [] }
      if (!chatData.users[userId].characters) chatData.users[userId].characters = []
      
      const randomChar = allCharacters[Math.floor(Math.random() * allCharacters.length)]
      const newChar = {
        ...randomChar,
        obtainedAt: Date.now(),
        origin: 'fish'
      }
      chatData.users[userId].characters.push(newChar)
      charDropMsg = `\n│\n│ 🐉 *¡PERSONAJE EN EL ANZUELO!*\n│ ❀ *${randomChar.name}* (${randomChar.source})\n│ ❀ Valor: *¥${(randomChar.value || 0).toLocaleString()}*`
    }

    const rarezaBadge = rarezaColor[pez.rareza] || '⚪'

    const bonusMsg = pez.rareza === 'Mítico' 
      ? '\n│\n│ ✨✨ ¡¡CAPTURA MÍTICA!! ✨✨\n│ ¡Una en un millón! (≧◡≦)'
      : pez.rareza === 'Legendario'
      ? '\n│\n│ 🌟 ¡Captura Legendaria! (◕ᴗ◕✿)'
      : ''

    const msg = `╭─── ⋆🐉⋆ ───
│ 🎣 *PESCA*
├───────────────
│ ${evento.emoji} ${evento.texto}
│
│ ${pez.emoji} ¡Atrapaste un *${pez.nombre}*!
│ ${rarezaBadge} Rareza: *${pez.rareza}*
│
│ 💰 +*¥${coins.toLocaleString()} ${monedas}*
│ ⚡ +*${exp.toLocaleString()} XP*
│ 🐟 Peces totales: *${user.totalFish}*${bonusMsg}${charDropMsg}${doubleResult.doubled ? '\n│ 🔮 *¡AURA MÍSTICA! Duplicado*' : ''}
╰─── ⋆✨⋆ ───`

    const img = await getRPGImage('fish', pez.nombre)
    await client.sendMessage(m.chat, { image: { url: img }, caption: msg }, { quoted: m })
  }
}
