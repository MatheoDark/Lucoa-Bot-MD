import { resolveLidToRealJid } from '../lib/utils.js'

// ═══════════════════════════════════════════════════════════════════════
//  🎁 SISTEMA DE DROPS ALEATORIOS
//  Eventos que aparecen de la nada en los grupos.
//  La primera persona en escribir #claim / #reclamar se lleva el premio.
// ═══════════════════════════════════════════════════════════════════════

// --- TIPOS DE DROPS ---
const DROPS = [
  {
    emoji: '💰',
    nombre: 'Cofre de Oro',
    desc: 'Un misterioso cofre de oro apareció en el grupo.',
    mensajes: [
      '¡Un cofre de oro cayó del cielo! 💰',
      'Alguien dejó un cofre lleno de monedas aquí... 📦',
      '¡Un cofre brillante apareció en medio del chat! ✨'
    ],
    coinsMin: 5000, coinsMax: 25000, expMin: 200, expMax: 1000
  },
  {
    emoji: '💎',
    nombre: 'Diamante Raro',
    desc: 'Un diamante gigante apareció de la nada.',
    mensajes: [
      '¡Un diamante deslumbrante acaba de aparecer! 💎',
      'Algo brilla entre las sombras del chat... es un diamante enorme 💎',
      '¡Un diamante perfecto cayó del cielo y rodó hasta aquí! 💎'
    ],
    coinsMin: 10000, coinsMax: 40000, expMin: 500, expMax: 2000
  },
  {
    emoji: '🎁',
    nombre: 'Regalo Misterioso',
    desc: 'Un regalo envuelto apareció sin remitente.',
    mensajes: [
      '¡Un regalo misterioso apareció sin explicación! 🎁',
      'Alguien dejó un paquete envuelto... ¿qué será? 🎁',
      '¡Un regalo con un moño dorado materializa en el chat! 🎁'
    ],
    coinsMin: 3000, coinsMax: 20000, expMin: 100, expMax: 800
  },
  {
    emoji: '🌟',
    nombre: 'Estrella Fugaz',
    desc: 'Una estrella fugaz cruzó el cielo del grupo.',
    mensajes: [
      '¡Una estrella fugaz iluminó el chat! ¡Pide un deseo! 🌟',
      'El cielo se partió y una estrella cayó aquí... 🌠',
      '¡Un meteorito brillante aterrizó en el grupo! ☄️'
    ],
    coinsMin: 8000, coinsMax: 35000, expMin: 400, expMax: 1500
  },
  {
    emoji: '🏴‍☠️',
    nombre: 'Botín Pirata',
    desc: 'Un pirata fantasma dejó su botín.',
    mensajes: [
      '¡Yarrr! Un pirata fantasma dejó su tesoro aquí 🏴‍☠️',
      'Una botella con un mapa del tesoro flotó hasta el chat 🗺️',
      '¡El fantasma del Capitán Morgan dejó su botín! ☠️'
    ],
    coinsMin: 7000, coinsMax: 30000, expMin: 300, expMax: 1200
  },
  {
    emoji: '🐉',
    nombre: 'Huevo de Dragón',
    desc: 'Un huevo de dragón dorado apareció.',
    mensajes: [
      '¡Un huevo de dragón dorado cayó del nido! 🐉',
      'Algo se mueve dentro de este huevo brillante... 🥚✨',
      '¡Un dragón bebé dejó su huevo más preciado aquí! 🐲'
    ],
    coinsMin: 12000, coinsMax: 50000, expMin: 600, expMax: 2500
  },
  {
    emoji: '🧪',
    nombre: 'Poción Legendaria',
    desc: 'Una poción mágica se materializó en el aire.',
    mensajes: [
      '¡Una poción brillante flota en medio del chat! 🧪',
      'Un alquimista misterioso dejó una poción aquí... ⚗️',
      '¡Una poción rara con un aura dorada apareció! 🧪✨'
    ],
    coinsMin: 6000, coinsMax: 28000, expMin: 250, expMax: 1100
  },
  {
    emoji: '👑',
    nombre: 'Corona del Rey',
    desc: 'La corona perdida del rey fue encontrada.',
    mensajes: [
      '¡La corona perdida del Rey Antiguo apareció aquí! 👑',
      'Una reliquia real fue descubierta en el chat... 👑',
      '¡La legendaria corona de diamantes se materializó! 👑💎'
    ],
    coinsMin: 15000, coinsMax: 60000, expMin: 800, expMax: 3000
  },
  {
    emoji: '🔮',
    nombre: 'Orbe Místico',
    desc: 'Un orbe de poder antiguo flotó hasta aquí.',
    mensajes: [
      '¡Un orbe místico con energía pura apareció! 🔮',
      'Una esfera de cristal emite una luz cegadora... 🔮✨',
      '¡El Orbe de los Ancestros fue invocado aquí! 🔮'
    ],
    coinsMin: 9000, coinsMax: 38000, expMin: 450, expMax: 1800
  },
  {
    emoji: '🗡️',
    nombre: 'Espada Legendaria',
    desc: 'Una espada clavada en piedra apareció.',
    mensajes: [
      '¡Una espada legendaria apareció clavada en el suelo! 🗡️',
      'El filo de una espada brilla con luz propia... ⚔️',
      '¡La Espada del Destino espera a su dueño! 🗡️✨'
    ],
    coinsMin: 11000, coinsMax: 45000, expMin: 550, expMax: 2200
  }
]

// --- DROPS RAROS (baja probabilidad, alta recompensa) ---
const DROPS_RAROS = [
  {
    emoji: '🌈',
    nombre: '⭐ Cofre Arcoíris ⭐',
    desc: 'Un cofre extremadamente raro con un arcoíris.',
    mensajes: [
      '✨✨✨ ¡¡¡UN COFRE ARCOÍRIS LEGENDARIO!!! ✨✨✨\n¡Este es extremadamente raro! ¡CORRE!',
      '🌈🌈🌈 ¡¡¡EVENTO LEGENDARIO!!! 🌈🌈🌈\n¡Un Cofre Arcoíris apareció! ¡Solo hay 1 en un millón!',
    ],
    coinsMin: 50000, coinsMax: 200000, expMin: 5000, expMax: 15000
  },
  {
    emoji: '🏆',
    nombre: '⭐ Trofeo Divino ⭐',
    desc: 'El trofeo de los dioses descendió al chat.',
    mensajes: [
      '⚡⚡⚡ ¡¡¡EL TROFEO DE LOS DIOSES!!! ⚡⚡⚡\n¡Los dioses premiaron este grupo! ¡Reclámalo YA!',
      '🏆🏆🏆 ¡¡¡TROFEO DIVINO!!! 🏆🏆🏆\n¡Una reliquia divina descendió del cielo!'
    ],
    coinsMin: 80000, coinsMax: 300000, expMin: 8000, expMax: 20000
  }
]

// ═══════════════════════════════════════════════════════════════════════
//  SISTEMA DE DROPS ACTIVOS
// ═══════════════════════════════════════════════════════════════════════

// Map de drops activos por grupo: chatId -> { drop, timestamp, raro }
const activeDrops = new Map()

// Tiempo máximo que un drop está disponible (3 minutos)
const DROP_EXPIRY = 3 * 60 * 1000

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Genera un drop aleatorio en un grupo
 */
export function spawnDrop(client, chatId) {
  // No generar si ya hay un drop activo en este grupo
  if (activeDrops.has(chatId)) return

  // 5% chance de drop raro
  const esRaro = Math.random() < 0.05
  const drop = esRaro ? pickRandom(DROPS_RAROS) : pickRandom(DROPS)
  const mensaje = pickRandom(drop.mensajes)

  activeDrops.set(chatId, {
    drop,
    timestamp: Date.now(),
    raro: esRaro
  })

  const raroBanner = esRaro ? '\n\n🌟🌟🌟 *¡¡DROP LEGENDARIO!!* 🌟🌟🌟' : ''

  const msg = `╔══════════════════════╗
  ${drop.emoji} *¡DROP ALEATORIO!* ${drop.emoji}
╚══════════════════════╝

${mensaje}${raroBanner}

💰 *Recompensa:* ¥${drop.coinsMin.toLocaleString()} ~ ${drop.coinsMax.toLocaleString()}
⏱️ *Expira en:* 3 minutos

> ¡Escribe *#drop* o *#recoger* para tomarlo!`

  client.sendMessage(chatId, { text: msg }).catch(() => {})

  // Auto-expirar después de 3 minutos
  setTimeout(() => {
    if (activeDrops.has(chatId)) {
      const current = activeDrops.get(chatId)
      // Solo expirar si es el mismo drop (no fue reclamado y reemplazado)
      if (current.timestamp === activeDrops.get(chatId)?.timestamp) {
        activeDrops.delete(chatId)
        client.sendMessage(chatId, {
          text: `⏱️ El drop *${drop.nombre}* expiró. Nadie lo reclamó... 😔`
        }).catch(() => {})
      }
    }
  }, DROP_EXPIRY)
}

/**
 * Intenta reclamar un drop activo (la primera persona que escriba #claim)
 */
export async function claimDrop(client, m) {
  const chatId = m.chat

  if (!activeDrops.has(chatId)) {
    return m.reply('❌ No hay ningún drop activo en este grupo.\n> Los drops aparecen aleatoriamente. ¡Estate atento!')
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

  // Calcular recompensa
  const coins = randomInt(drop.coinsMin, drop.coinsMax)
  const exp = randomInt(drop.expMin, drop.expMax)

  // Stats de drops
  user.dropsReclamados = (user.dropsReclamados || 0) + 1
  if (raro) user.dropsRaros = (user.dropsRaros || 0) + 1

  user.coins = (user.coins || 0) + coins
  user.exp = (user.exp || 0) + exp

  const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
  const settings = global.db.data.settings[botId] || {}
  const monedas = settings.currency || 'monedas'
  const nombre = user.name || m.pushName || 'Aventurero'

  const raroMsg = raro ? '\n\n🌟 *¡¡ERA UN DROP LEGENDARIO!! ¡Increíble suerte!* 🌟' : ''

  const msg = `╔══════════════════════╗
  🎉 *¡DROP RECLAMADO!* 🎉
╚══════════════════════╝

${drop.emoji} *${drop.nombre}*

> 👤 *${nombre}* fue el más rápido!

💰 *Recompensa:*
> ⛁ +*¥${coins.toLocaleString()} ${monedas}*
> ⚡ +*${exp.toLocaleString()} XP*

📊 Drops reclamados: *${user.dropsReclamados}*${raroMsg}`

  return client.sendMessage(chatId, { text: msg, mentions: [userId] }, { quoted: m })
}

/**
 * Verifica si hay un drop activo en un grupo
 */
export function hasActiveDrop(chatId) {
  return activeDrops.has(chatId)
}

/**
 * Inicia el scheduler de drops aleatorios
 * Se llama desde index.js cuando el bot conecta
 */
export function startDropScheduler(client) {
  console.log('🎁 Scheduler de drops aleatorios iniciado.')

  // Verificar cada 5 minutos si lanzar drops
  setInterval(() => {
    if (!global.db?.data?.chats) return

    const chats = global.db.data.chats
    const gruposActivos = Object.entries(chats)
      .filter(([id, data]) => {
        // Solo grupos con RPG activado
        return id.endsWith('@g.us') && data.rpg && !data.adminonly
      })
      .map(([id]) => id)

    if (gruposActivos.length === 0) return

    // Para cada grupo activo, ~20% de chance de drop cada ciclo
    for (const groupId of gruposActivos) {
      if (activeDrops.has(groupId)) continue // Ya tiene un drop activo

      if (Math.random() < 0.20) {
        // Delay aleatorio para que no todos caigan al mismo tiempo
        const delay = randomInt(0, 60000) // 0-60 segundos de delay
        setTimeout(() => {
          spawnDrop(client, groupId)
        }, delay)
      }
    }
  }, 5 * 60 * 1000) // Cada 5 minutos verifica

  // Primer check después de 2 minutos (dar tiempo a que el bot cargue)
  setTimeout(() => {
    if (!global.db?.data?.chats) return
    const chats = global.db.data.chats
    const gruposActivos = Object.entries(chats)
      .filter(([id, data]) => id.endsWith('@g.us') && data.rpg && !data.adminonly)
      .map(([id]) => id)

    if (gruposActivos.length > 0) {
      // Lanzar 1 drop inicial en un grupo aleatorio
      const grupo = pickRandom(gruposActivos)
      spawnDrop(client, grupo)
    }
  }, 2 * 60 * 1000)
}
