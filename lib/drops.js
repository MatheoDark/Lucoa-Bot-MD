import { resolveLidToRealJid } from '../lib/utils.js'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

// ═══════════════════════════════════════════════════════════════════════
//  🎁 SISTEMA DE DROPS — 3 DROPS CADA 3 DÍAS
//  Mañana (8-10h) | Tarde (14-16h) | Noche (20-22h)
//  La primera persona en escribir #drop / #recoger se lleva el premio.
//  Probabilidad baja (~3%) de obtener un personaje del gacha.
// ═══════════════════════════════════════════════════════════════════════

// --- FRANJAS HORARIAS ---
const FRANJAS = [
  { id: 'mañana', horaInicio: 8, horaFin: 10, emoji: '🌅', label: 'Mañana' },
  { id: 'tarde', horaInicio: 14, horaFin: 16, emoji: '☀️', label: 'Tarde' },
  { id: 'noche', horaInicio: 20, horaFin: 22, emoji: '🌙', label: 'Noche' },
]

// --- TIPOS DE DROPS ---
const DROPS = [
  {
    emoji: '💰',
    nombre: 'Cofre de Oro',
    mensajes: [
      '¡Un cofre de oro cayó del cielo! 💰',
      'Alguien dejó un cofre lleno de monedas aquí... 📦',
      '¡Un cofre brillante apareció en medio del chat! ✨'
    ],
    coinsMin: 8000, coinsMax: 35000, expMin: 400, expMax: 1500
  },
  {
    emoji: '💎',
    nombre: 'Diamante Raro',
    mensajes: [
      '¡Un diamante deslumbrante acaba de aparecer! 💎',
      'Algo brilla entre las sombras del chat... es un diamante enorme 💎',
      '¡Un diamante perfecto cayó del cielo y rodó hasta aquí! 💎'
    ],
    coinsMin: 15000, coinsMax: 50000, expMin: 800, expMax: 3000
  },
  {
    emoji: '🎁',
    nombre: 'Regalo Misterioso',
    mensajes: [
      '¡Un regalo misterioso apareció sin explicación! 🎁',
      'Alguien dejó un paquete envuelto... ¿qué será? 🎁',
      '¡Un regalo con un moño dorado materializa en el chat! 🎁'
    ],
    coinsMin: 5000, coinsMax: 30000, expMin: 300, expMax: 1200
  },
  {
    emoji: '🌟',
    nombre: 'Estrella Fugaz',
    mensajes: [
      '¡Una estrella fugaz iluminó el chat! ¡Pide un deseo! 🌟',
      'El cielo se partió y una estrella cayó aquí... 🌠',
      '¡Un meteorito brillante aterrizó en el grupo! ☄️'
    ],
    coinsMin: 12000, coinsMax: 45000, expMin: 600, expMax: 2500
  },
  {
    emoji: '🏴‍☠️',
    nombre: 'Botín Pirata',
    mensajes: [
      '¡Yarrr! Un pirata fantasma dejó su tesoro aquí 🏴‍☠️',
      'Una botella con un mapa del tesoro flotó hasta el chat 🗺️',
      '¡El fantasma del Capitán Morgan dejó su botín! ☠️'
    ],
    coinsMin: 10000, coinsMax: 40000, expMin: 500, expMax: 2000
  },
  {
    emoji: '🐉',
    nombre: 'Huevo de Dragón',
    mensajes: [
      '¡Un huevo de dragón dorado cayó del nido! 🐉',
      'Algo se mueve dentro de este huevo brillante... 🥚✨',
      '¡Un dragón bebé dejó su huevo más preciado aquí! 🐲'
    ],
    coinsMin: 18000, coinsMax: 60000, expMin: 900, expMax: 3500
  },
  {
    emoji: '🧪',
    nombre: 'Poción Legendaria',
    mensajes: [
      '¡Una poción brillante flota en medio del chat! 🧪',
      'Un alquimista misterioso dejó una poción aquí... ⚗️',
      '¡Una poción rara con un aura dorada apareció! 🧪✨'
    ],
    coinsMin: 10000, coinsMax: 38000, expMin: 500, expMax: 1800
  },
  {
    emoji: '👑',
    nombre: 'Corona del Rey',
    mensajes: [
      '¡La corona perdida del Rey Antiguo apareció aquí! 👑',
      'Una reliquia real fue descubierta en el chat... 👑',
      '¡La legendaria corona de diamantes se materializó! 👑💎'
    ],
    coinsMin: 20000, coinsMax: 70000, expMin: 1000, expMax: 4000
  },
  {
    emoji: '🔮',
    nombre: 'Orbe Místico',
    mensajes: [
      '¡Un orbe místico con energía pura apareció! 🔮',
      'Una esfera de cristal emite una luz cegadora... 🔮✨',
      '¡El Orbe de los Ancestros fue invocado aquí! 🔮'
    ],
    coinsMin: 14000, coinsMax: 48000, expMin: 700, expMax: 2800
  },
  {
    emoji: '🗡️',
    nombre: 'Espada Legendaria',
    mensajes: [
      '¡Una espada legendaria apareció clavada en el suelo! 🗡️',
      'El filo de una espada brilla con luz propia... ⚔️',
      '¡La Espada del Destino espera a su dueño! 🗡️✨'
    ],
    coinsMin: 16000, coinsMax: 55000, expMin: 800, expMax: 3200
  }
]

// --- DROPS RAROS (baja probabilidad, alta recompensa) ---
const DROPS_RAROS = [
  {
    emoji: '🌈',
    nombre: '⭐ Cofre Arcoíris ⭐',
    mensajes: [
      '✨✨✨ ¡¡¡UN COFRE ARCOÍRIS LEGENDARIO!!! ✨✨✨\n¡Este es extremadamente raro! ¡CORRE!',
      '🌈🌈🌈 ¡¡¡EVENTO LEGENDARIO!!! 🌈🌈🌈\n¡Un Cofre Arcoíris apareció! ¡Solo hay 1 en un millón!',
    ],
    coinsMin: 80000, coinsMax: 250000, expMin: 8000, expMax: 20000
  },
  {
    emoji: '🏆',
    nombre: '⭐ Trofeo Divino ⭐',
    mensajes: [
      '⚡⚡⚡ ¡¡¡EL TROFEO DE LOS DIOSES!!! ⚡⚡⚡\n¡Los dioses premiaron este grupo! ¡Reclámalo YA!',
      '🏆🏆🏆 ¡¡¡TROFEO DIVINO!!! 🏆🏆🏆\n¡Una reliquia divina descendió del cielo!'
    ],
    coinsMin: 120000, coinsMax: 400000, expMin: 12000, expMax: 30000
  }
]

// PROBABILIDAD de obtener un personaje al reclamar un drop (3%)
const CHAR_DROP_CHANCE = 0.03

// ═══════════════════════════════════════════════════════════════════════
//  SISTEMA DE DROPS ACTIVOS
// ═══════════════════════════════════════════════════════════════════════

// Map de drops activos por grupo: chatId -> { drop, timestamp, raro, franja }
const activeDrops = new Map()

// Tiempo máximo que un drop está disponible (5 minutos)
const DROP_EXPIRY = 5 * 60 * 1000

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Carga personajes desde characters.json
 */
function loadCharacters() {
  try {
    const data = fs.readFileSync('./lib/characters.json', 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

/**
 * Formatea fecha para el claim de personaje
 */
function formatDate(ts) {
  const d = new Date(ts)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

/**
 * Genera un drop aleatorio en un grupo
 */
export function spawnDrop(client, chatId, franjaInfo) {
  // No generar si ya hay un drop activo en este grupo
  if (activeDrops.has(chatId)) return

  // 5% chance de drop raro
  const esRaro = Math.random() < 0.05
  const drop = esRaro ? pickRandom(DROPS_RAROS) : pickRandom(DROPS)
  const mensaje = pickRandom(drop.mensajes)
  const franjaLabel = franjaInfo ? `${franjaInfo.emoji} Drop de ${franjaInfo.label}` : '🎁 Drop Aleatorio'

  activeDrops.set(chatId, {
    drop,
    timestamp: Date.now(),
    raro: esRaro,
    franja: franjaInfo?.id || 'manual'
  })

  const raroBanner = esRaro ? '\n\n🌟🌟🌟 *¡¡DROP LEGENDARIO!!* 🌟🌟🌟' : ''
  const charHint = '\n🎲 *¡Puede contener un personaje del gacha!*'

  const msg = `╔══════════════════════╗
  ${drop.emoji} *¡${franjaLabel}!* ${drop.emoji}
╚══════════════════════╝

${mensaje}${raroBanner}${charHint}

💰 *Recompensa:* ¥${drop.coinsMin.toLocaleString()} ~ ¥${drop.coinsMax.toLocaleString()}
⏱️ *Expira en:* 5 minutos

> ¡Escribe *#drop* o *#recoger* para tomarlo!`

  client.sendMessage(chatId, { text: msg }).catch(() => {})

  // Auto-expirar después de 5 minutos
  const dropTimestamp = activeDrops.get(chatId)?.timestamp
  setTimeout(() => {
    if (activeDrops.has(chatId)) {
      const current = activeDrops.get(chatId)
      if (current.timestamp === dropTimestamp) {
        activeDrops.delete(chatId)
        client.sendMessage(chatId, {
          text: `⏱️ El drop *${drop.nombre}* expiró. Nadie lo reclamó... 😔`
        }).catch(() => {})
      }
    }
  }, DROP_EXPIRY)
}

/**
 * Intenta reclamar un drop activo (la primera persona que escriba #drop)
 */
export async function claimDrop(client, m) {
  const chatId = m.chat

  if (!activeDrops.has(chatId)) {
    return m.reply('❌ No hay ningún drop activo en este grupo.\n> Los drops aparecen cada 3 días (mañana, tarde y noche). ¡Estate atento!')
  }

  const { drop, raro } = activeDrops.get(chatId)
  activeDrops.delete(chatId) // Primera persona lo reclama

  // Resolver usuario
  const userId = await resolveLidToRealJid(m.sender, client, m.chat)
  let user = global.db.data.users[userId]
  if (!user) {
    global.db.data.users[userId] = { coins: 0, exp: 0, level: 0, bank: 0 }
    user = global.db.data.users[userId]
  }

  // Calcular recompensa de monedas y XP
  const coins = randomInt(drop.coinsMin, drop.coinsMax)
  const exp = randomInt(drop.expMin, drop.expMax)

  // Stats de drops
  user.dropsReclamados = (user.dropsReclamados || 0) + 1
  if (raro) user.dropsRaros = (user.dropsRaros || 0) + 1

  user.coins = (user.coins || 0) + coins
  user.exp = (user.exp || 0) + exp

  // ── CHANCE DE PERSONAJE (3% normal, 10% si es drop raro) ──
  const charChance = raro ? 0.10 : CHAR_DROP_CHANCE
  let personajeGanado = null

  if (Math.random() < charChance) {
    const personajes = loadCharacters()
    if (personajes.length > 0) {
      const personaje = pickRandom(personajes)
      const chat = global.db.data.chats[chatId]

      if (chat) {
        // Verificar que nadie en el grupo ya lo tenga
        const yaReclamado = Object.values(chat.users || {}).some(
          u => Array.isArray(u.characters) && u.characters.some(c => c.name === personaje.name)
        )

        if (!yaReclamado) {
          // Inicializar inventario local del usuario en este grupo
          if (!chat.users) chat.users = {}
          if (!chat.users[userId]) chat.users[userId] = {}
          const localUser = chat.users[userId]
          if (!localUser.characters) localUser.characters = []

          const idUnico = uuidv4().slice(0, 8)
          localUser.characters.push({
            name: personaje.name,
            value: personaje.value,
            gender: personaje.gender,
            source: personaje.source,
            keyword: personaje.keyword,
            claim: formatDate(Date.now()),
            user: userId,
            id: idUnico,
            origin: 'drop' // Marca especial: viene de un drop
          })

          personajeGanado = personaje
          user.dropsConPersonaje = (user.dropsConPersonaje || 0) + 1
        }
      }
    }
  }

  // Marcar DB como modificada
  if (typeof global.markDBDirty === 'function') global.markDBDirty()

  const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
  const settings = global.db.data.settings[botId] || {}
  const monedas = settings.currency || 'monedas'
  const nombre = user.name || m.pushName || 'Aventurero'

  const raroMsg = raro ? '\n\n🌟 *¡¡ERA UN DROP LEGENDARIO!! ¡Increíble suerte!* 🌟' : ''

  let charMsg = ''
  if (personajeGanado) {
    charMsg = `\n\n🐉✨ *¡¡PERSONAJE EXTRA!!* ✨🐉
> ¡Obtuviste a *${personajeGanado.name}*!
> Fuente: *${personajeGanado.source}*
> Valor: *¥${(personajeGanado.value || 0).toLocaleString()}*
> ¡Revisa tu harem con *#harem*!`
  }

  const msg = `╔══════════════════════╗
  🎉 *¡DROP RECLAMADO!* 🎉
╚══════════════════════╝

${drop.emoji} *${drop.nombre}*

> 👤 *${nombre}* fue el más rápido!

💰 *Recompensa:*
> ⛁ +*¥${coins.toLocaleString()} ${monedas}*
> ⚡ +*${exp.toLocaleString()} XP*

📊 Drops reclamados: *${user.dropsReclamados}*${raroMsg}${charMsg}`

  return client.sendMessage(chatId, { text: msg, mentions: [userId] }, { quoted: m })
}

/**
 * Verifica si hay un drop activo en un grupo
 */
export function hasActiveDrop(chatId) {
  return activeDrops.has(chatId)
}

/**
 * Devuelve info del próximo drop para un grupo (para waittimes).
 * Retorna { esDia, franjasPendientes, proximoCiclo, dropActivo }
 */
export function getDropInfo(chatId) {
  const chatData = global.db?.data?.chats?.[chatId]
  if (!chatData) return { esDia: false, franjasPendientes: [], proximoCiclo: 0, dropActivo: false }

  const now = Date.now()
  const lastCycle = chatData.lastDropCycle || 0
  const elapsed = now - lastCycle
  const cicloDias = CYCLE_DAYS * ONE_DAY_MS
  const dia = elapsed >= cicloDias

  let franjasPendientes = []
  if (dia) {
    const enviadas = franjasEnviadasHoy(chatData)
    franjasPendientes = FRANJAS.filter(f => !enviadas[f.id])
  }

  const proximoCiclo = dia ? 0 : cicloDias - elapsed

  return {
    esDia: dia,
    franjasPendientes,
    proximoCiclo,
    dropActivo: activeDrops.has(chatId)
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  SCHEDULER — 3 DROPS CADA 3 DÍAS (MAÑANA, TARDE, NOCHE)
// ═══════════════════════════════════════════════════════════════════════

// Ciclo de 3 días en milisegundos
const CYCLE_DAYS = 3
const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Determina si hoy es un día de drops para un grupo dado.
 * Usamos el timestamp del último ciclo completado (`lastDropCycle`).
 * Si han pasado >= 3 días desde el último ciclo, hoy es día de drops.
 */
function esDiaDeDrop(chatData) {
  const lastCycle = chatData.lastDropCycle || 0
  const elapsed = Date.now() - lastCycle
  return elapsed >= CYCLE_DAYS * ONE_DAY_MS
}

/**
 * Obtiene qué franjas ya se enviaron hoy en este ciclo.
 * `dropsFranjasEnviadas` es un objeto { mañana: ts, tarde: ts, noche: ts }
 */
function franjasEnviadasHoy(chatData) {
  const enviadas = chatData.dropsFranjasEnviadas || {}
  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()

  // Solo contar franjas enviadas HOY
  const resultado = {}
  for (const [franja, ts] of Object.entries(enviadas)) {
    if (ts >= inicioHoy) resultado[franja] = ts
  }
  return resultado
}

/**
 * Verifica si la hora actual está dentro de una franja horaria.
 */
function horaActualEnFranja(franja) {
  const hora = new Date().getHours()
  return hora >= franja.horaInicio && hora < franja.horaFin
}

// 🔧 FIX: Guard para evitar intervalos duplicados en reconexiones
let _dropSchedulerInterval = null
let _dropSchedulerTimeout = null

/**
 * Inicia el scheduler de drops.
 * Verifica cada 10 minutos si algún grupo necesita un drop en la franja actual.
 * 3 drops cada 3 días: mañana (8-10h), tarde (14-16h), noche (20-22h).
 */
export function startDropScheduler(client) {
  // 🔧 FIX: Limpiar intervalos anteriores para evitar duplicados en reconexiones
  if (_dropSchedulerInterval) {
    clearInterval(_dropSchedulerInterval)
    _dropSchedulerInterval = null
  }
  if (_dropSchedulerTimeout) {
    clearTimeout(_dropSchedulerTimeout)
    _dropSchedulerTimeout = null
  }

  console.log('🎁 Scheduler de drops iniciado — 3 drops cada 3 días (mañana/tarde/noche).')

  const ejecutarCheck = () => {
    if (!global.db?.data?.chats) return

    const chats = global.db.data.chats

    // Grupos elegibles: RPG activo, drops activos, no adminonly
    const gruposActivos = Object.entries(chats)
      .filter(([id, data]) => {
        return id.endsWith('@g.us') && data.rpg !== false && data.drops !== false && !data.adminonly
      })

    if (gruposActivos.length === 0) return

    for (const [groupId, data] of gruposActivos) {
      // Ya tiene un drop activo esperando ser reclamado
      if (activeDrops.has(groupId)) continue

      // ¿Es día de drop para este grupo?
      if (!esDiaDeDrop(data)) continue

      // Ver qué franjas ya se enviaron hoy
      const enviadas = franjasEnviadasHoy(data)

      // Buscar la franja actual que NO haya sido enviada
      for (const franja of FRANJAS) {
        if (enviadas[franja.id]) continue // Ya se envió esta franja hoy
        if (!horaActualEnFranja(franja)) continue // No estamos en esta franja horaria

        // ¡Lanzar drop para esta franja!
        const delay = randomInt(0, 8 * 60 * 1000) // 0-8 min de delay aleatorio dentro de la franja
        setTimeout(() => {
          if (activeDrops.has(groupId)) return // Doble check

          spawnDrop(client, groupId, franja)

          // Registrar que esta franja fue enviada
          if (global.db?.data?.chats?.[groupId]) {
            if (!global.db.data.chats[groupId].dropsFranjasEnviadas) {
              global.db.data.chats[groupId].dropsFranjasEnviadas = {}
            }
            global.db.data.chats[groupId].dropsFranjasEnviadas[franja.id] = Date.now()

            // Si ya se enviaron las 3 franjas, marcar ciclo completado
            const enviadasActualizadas = franjasEnviadasHoy(global.db.data.chats[groupId])
            const totalEnviadas = Object.keys(enviadasActualizadas).length
            if (totalEnviadas >= 3) {
              global.db.data.chats[groupId].lastDropCycle = Date.now()
              global.db.data.chats[groupId].dropsFranjasEnviadas = {} // Reset
            }

            if (typeof global.markDBDirty === 'function') global.markDBDirty()
          }
        }, delay)

        break // Solo un drop por check por grupo
      }
    }
  }

  // Verificar cada 10 minutos
  _dropSchedulerInterval = setInterval(ejecutarCheck, 10 * 60 * 1000)

  // Primer check después de 2 minutos (dar tiempo a que el bot cargue)
  _dropSchedulerTimeout = setTimeout(ejecutarCheck, 2 * 60 * 1000)
}
