import { resolveLidToRealJid } from '../../lib/utils.js'
import { getXpBonus, tryDoubleReward } from './skills.js'
import { getClassBonus } from './class.js'
import { getPrestigeMultiplier } from './prestige.js'
import { getRPGImage } from '../../lib/rpgImages.js'
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

// ═══════════════════════════════════════════════════════════════════════
//  🎯 MISIONES DIARIAS — 3 misiones aleatorias cada día
//  Completar las 3 da una mega-recompensa adicional.
//  Las misiones se resetean cada 24h a las 00:00.
//  Gasta indirectamente XP al requerir acciones que cuestan XP.
// ═══════════════════════════════════════════════════════════════════════

// ── PLANTILLAS DE MISIONES ──
const MISIONES_POOL = [
  // ── Economía y RPG ──
  { id: 'work3',       desc: 'Trabaja 3 veces',                 tipo: 'work',       meta: 3,  rewardCoins: 18000,  rewardExp: 1000,  emoji: '🔨' },
  { id: 'mine2',       desc: 'Mina 2 veces',                    tipo: 'mine',       meta: 2,  rewardCoins: 14000,  rewardExp: 800,   emoji: '⛏️' },
  { id: 'fish3',       desc: 'Pesca 3 veces',                   tipo: 'fish',       meta: 3,  rewardCoins: 16000,  rewardExp: 900,   emoji: '🎣' },
  { id: 'explore2',    desc: 'Explora 2 veces',                 tipo: 'explore',    meta: 2,  rewardCoins: 22000,  rewardExp: 1200,  emoji: '🗺️' },
  { id: 'arena1',      desc: 'Lucha en la arena 1 vez',         tipo: 'arena',      meta: 1,  rewardCoins: 25000,  rewardExp: 1600,  emoji: '⚔️' },
  { id: 'arena2',      desc: 'Gana 2 peleas en la arena',       tipo: 'arenaWin',   meta: 2,  rewardCoins: 50000,  rewardExp: 3000,  emoji: '🏆' },
  { id: 'duel1',       desc: 'Desafía a alguien a un duelo',    tipo: 'duel',       meta: 1,  rewardCoins: 18000,  rewardExp: 1000,  emoji: '🤺' },
  { id: 'slots5',      desc: 'Juega slots 5 veces',             tipo: 'slots',      meta: 5,  rewardCoins: 12000,  rewardExp: 600,   emoji: '🎰' },
  { id: 'skill1',      desc: 'Mejora 1 habilidad',              tipo: 'skill',      meta: 1,  rewardCoins: 30000,  rewardExp: 2000,  emoji: '🌳' },
  { id: 'daily1',      desc: 'Reclama tu daily',                tipo: 'daily',      meta: 1,  rewardCoins: 8000,   rewardExp: 400,   emoji: '📅' },
  { id: 'crime2',      desc: 'Comete 2 crímenes',               tipo: 'crime',      meta: 2,  rewardCoins: 20000,  rewardExp: 1100,  emoji: '🦹' },
  { id: 'gacha3',      desc: 'Haz 3 rolls de gacha',            tipo: 'gacha',      meta: 3,  rewardCoins: 16000,  rewardExp: 800,   emoji: '🎲' },
  { id: 'commands15',  desc: 'Usa 15 comandos',                 tipo: 'commands',   meta: 15, rewardCoins: 12000,  rewardExp: 700,   emoji: '📝' },
  { id: 'steal1',      desc: 'Intenta robar a alguien',         tipo: 'steal',      meta: 1,  rewardCoins: 14000,  rewardExp: 800,   emoji: '🗡️' },
  { id: 'flip3',       desc: 'Juega coinflip 3 veces',          tipo: 'flip',       meta: 3,  rewardCoins: 10000,  rewardExp: 500,   emoji: '🪙' },

  // ── ACTIVIDAD DE GRUPO (misiones de chat) ──
  { id: 'msg20',       desc: 'Envía 20 mensajes en el grupo',   tipo: 'messages',   meta: 20, rewardCoins: 10000,  rewardExp: 600,   emoji: '💬' },
  { id: 'msg50',       desc: 'Envía 50 mensajes en el grupo',   tipo: 'messages',   meta: 50, rewardCoins: 18000,  rewardExp: 1200,  emoji: '💬' },
  { id: 'sticker5',    desc: 'Envía 5 stickers',                tipo: 'stickers',   meta: 5,  rewardCoins: 8000,   rewardExp: 500,   emoji: '🎨' },
  { id: 'sticker15',   desc: 'Envía 15 stickers',               tipo: 'stickers',   meta: 15, rewardCoins: 16000,  rewardExp: 900,   emoji: '🎨' },
  { id: 'media5',      desc: 'Envía 5 fotos o videos',          tipo: 'media',      meta: 5,  rewardCoins: 12000,  rewardExp: 700,   emoji: '📷' },
  { id: 'audio3',      desc: 'Envía 3 notas de voz',            tipo: 'audio',      meta: 3,  rewardCoins: 10000,  rewardExp: 600,   emoji: '🎙️' },
  { id: 'react10',     desc: 'Reacciona a 10 mensajes',         tipo: 'reactions',  meta: 10, rewardCoins: 8000,   rewardExp: 400,   emoji: '❤️' },
  { id: 'chatactive3', desc: 'Habla en 3 grupos distintos',     tipo: 'chatgroups', meta: 3,  rewardCoins: 14000,  rewardExp: 800,   emoji: '🌐' },
]

const MEGA_REWARD = { coins: 60000, exp: 6000, emoji: '🎁' }

function getDailyKey() {
  const now = new Date()
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`
}

function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Genera misiones del día basadas en un seed determinístico
function generateDailyMissions(userId) {
  const key = getDailyKey()
  // Seed simple basado en fecha + parte del userId
  let seed = 0
  for (const c of key + userId.slice(0, 8)) seed = ((seed << 5) - seed) + c.charCodeAt(0)
  
  // Pseudorandom determinístico
  function seededRandom() {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const indices = Array.from({ length: MISIONES_POOL.length }, (_, i) => i)
  // Fisher-Yates con seed
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]
  }

  return [MISIONES_POOL[indices[0]], MISIONES_POOL[indices[1]], MISIONES_POOL[indices[2]]]
}

function progressBar(current, max, length = 8) {
  const clamped = Math.min(current, max)
  const filled = Math.round((clamped / max) * length)
  return '▓'.repeat(filled) + '░'.repeat(length - filled)
}

export default {
  command: ['missions', 'misiones', 'mission', 'mision', 'dailymission', 'quests'],
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
      global.db.data.users[userId] = { coins: 0, exp: 0, missions: {} }
      user = global.db.data.users[userId]
    }
    user.missions = user.missions || {}

    const hoy = getDailyKey()
    const misiones = generateDailyMissions(userId)

    // Inicializar progreso del día si no existe
    if (!user.missions[hoy]) {
      user.missions[hoy] = {
        progress: {},
        completed: [],
        megaClaimed: false
      }
      // Limpiar días anteriores para ahorrar espacio
      for (const key of Object.keys(user.missions)) {
        if (key !== hoy) delete user.missions[key]
      }
    }

    const missionData = user.missions[hoy]

    const subCmd = (args[0] || '').toLowerCase()

    // ══════════════════════════════
    //  RECLAMAR MEGA-RECOMPENSA
    // ══════════════════════════════
    if (subCmd === 'mega' || subCmd === 'claim') {
      const allDone = misiones.every(m => missionData.completed.includes(m.id))
      
      if (!allDone) {
        return m.reply('🐲 Completa las 3 misiones diarias primero (◕ᴗ◕)')
      }
      if (missionData.megaClaimed) {
        return m.reply('🐲 Ya reclamaste la mega-recompensa de hoy ✧')
      }

      let megaCoins = MEGA_REWARD.coins
      let megaExp = MEGA_REWARD.exp

      // Aplicar bonos
      const prestigeMult = getPrestigeMultiplier(user)
      const xpMult = getXpBonus(user)
      megaCoins = Math.floor(megaCoins * prestigeMult)
      megaExp = Math.floor(megaExp * xpMult * prestigeMult)

      const doubleResult = tryDoubleReward(user, megaCoins)
      megaCoins = doubleResult.amount

      user.coins = (user.coins || 0) + megaCoins
      user.exp = (user.exp || 0) + megaExp
      missionData.megaClaimed = true
      user.missionsCompleted = (user.missionsCompleted || 0) + 1

      const msg = `╭─── ⋆🐉⋆ ───
│ ${MEGA_REWARD.emoji} *¡¡MEGA-RECOMPENSA!!*
├───────────────
│ ✅ ¡Completaste TODAS las misiones del día!
│ 
│ 💰 +*${megaCoins.toLocaleString()} ${monedas}*
│ ✨ +*${megaExp.toLocaleString()} XP*
${doubleResult.doubled ? '│ 🔮 *¡AURA MÍSTICA: DUPLICADO!*\n' : ''}│ 
│ 📊 Días completados: *${user.missionsCompleted}*
│ ❀ Vuelve mañana por más misiones
╰─── ⋆✨⋆ ───`

      const megaImg = await getRPGImage('mega_reward')
      return client.sendMessage(m.chat, { 
        image: { url: megaImg },
        caption: msg 
      }, { quoted: m })
    }

    // ══════════════════════════════
    //  RECLAMAR MISIÓN INDIVIDUAL
    // ══════════════════════════════
    if (subCmd === 'reclamar' || subCmd === 'collect') {
      const missionIdx = parseInt(args[1]) - 1
      if (isNaN(missionIdx) || missionIdx < 0 || missionIdx >= 3) {
        return m.reply(`❀ Uso: *${usedPrefix}${command} reclamar <1-3>*`)
      }

      const mission = misiones[missionIdx]
      if (missionData.completed.includes(mission.id)) {
        return m.reply(`${mission.emoji} Ya reclamaste esta misión ✧`)
      }

      const progreso = missionData.progress[mission.tipo] || 0
      if (progreso < mission.meta) {
        return m.reply(`${mission.emoji} Aún no completaste: *${mission.desc}*\nProgreso: *${progreso}/${mission.meta}*`)
      }

      // Reclamar
      let rewardCoins = mission.rewardCoins
      let rewardExp = mission.rewardExp

      const prestigeMult = getPrestigeMultiplier(user)
      rewardCoins = Math.floor(rewardCoins * prestigeMult)
      rewardExp = Math.floor(rewardExp * prestigeMult)

      user.coins = (user.coins || 0) + rewardCoins
      user.exp = (user.exp || 0) + rewardExp
      missionData.completed.push(mission.id)

      const completadas = missionData.completed.length

      const msg = `╭─── ⋆🐉⋆ ───
│ ${mission.emoji} *¡MISIÓN COMPLETADA!*
├───────────────
│ ✅ *${mission.desc}*
│ 
│ 💰 +*${rewardCoins.toLocaleString()} ${monedas}*
│ ✨ +*${rewardExp.toLocaleString()} XP*
│ 
│ 📊 Misiones: *${completadas}/3*
│ ${completadas === 3 ? `🎁 *¡Mega-recompensa disponible!*\n│ Usa *${usedPrefix}${command} mega*` : `❀ Sigue completando misiones`}
╰─── ⋆✨⋆ ───`

      const claimImg = await getRPGImage('mission_complete', mission.id)
      return client.sendMessage(m.chat, { 
        image: { url: claimImg },
        caption: msg 
      }, { quoted: m })
    }

    // ══════════════════════════════
    //  VISTA PRINCIPAL
    // ══════════════════════════════
    const completadas = missionData.completed.length

    let txt = `╭─── ⋆🐉⋆ ───
│ 🎯 *MISIONES DIARIAS*
│ Fecha: *${hoy}*
│ Progreso: *${completadas}/3* ${progressBar(completadas, 3, 3)}
├───────────────\n`

    misiones.forEach((mission, i) => {
      const progreso = missionData.progress[mission.tipo] || 0
      const completado = missionData.completed.includes(mission.id)
      const estado = completado ? '✅' : (progreso >= mission.meta ? '🔔' : '⬜')
      
      txt += `│\n│ ${estado} *Misión ${i + 1}:* ${mission.emoji} ${mission.desc}\n`
      txt += `│   Progreso: ${progressBar(progreso, mission.meta)} *${Math.min(progreso, mission.meta)}/${mission.meta}*\n`
      txt += `│   Recompensa: *${mission.rewardCoins.toLocaleString()} ${monedas}* + *${mission.rewardExp} XP*\n`
      
      if (!completado && progreso >= mission.meta) {
        txt += `│   🔔 *¡Lista para reclamar!* → *${usedPrefix}${command} reclamar ${i + 1}*\n`
      }
    })

    txt += `│
├───────────────
│ ${MEGA_REWARD.emoji} *Mega-Recompensa* (3/3 misiones):
│   💰 *${MEGA_REWARD.coins.toLocaleString()} ${monedas}* + ✨ *${MEGA_REWARD.exp.toLocaleString()} XP*
│   ${missionData.megaClaimed ? '✅ Ya reclamada' : (completadas === 3 ? `🔔 *${usedPrefix}${command} mega*` : `⬜ Completa las 3 misiones`)}
│
│ ❀ *${usedPrefix}${command} reclamar <1-3>*
│ ❀ Las misiones se reinician a medianoche
╰─── ⋆✨⋆ ───`

    const missionImg = await getRPGImage('mission', hoy)
    await client.sendMessage(m.chat, { 
      image: { url: missionImg },
      caption: txt 
    }, { quoted: m })
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  FUNCIONES EXPORTADAS — Para actualizar progreso desde otros comandos
// ═══════════════════════════════════════════════════════════════════════

/**
 * Actualiza el progreso de una misión diaria.
 * Llamar desde work.js, mine.js, fish.js, etc.
 * @param {object} user - Objeto del usuario de la DB
 * @param {string} tipo - Tipo de misión ('work', 'mine', 'fish', etc.)
 * @param {number} cantidad - Cuánto sumar (default: 1)
 */
export function updateMissionProgress(user, tipo, cantidad = 1) {
  if (!user || !user.missions) return
  const hoy = getDailyKey()
  if (!user.missions[hoy]) return
  
  const progress = user.missions[hoy].progress
  progress[tipo] = (progress[tipo] || 0) + cantidad
}
