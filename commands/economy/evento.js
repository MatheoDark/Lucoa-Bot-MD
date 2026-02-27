import { resolveLidToRealJid } from '../../lib/utils.js'

// ═══════════════════════════════════════════════
//  SISTEMA DE EVENTOS DIARIOS Y SEMANALES
//  Cada día hay un evento temático con misión
//  Cada semana hay un evento especial con mejor premio
// ═══════════════════════════════════════════════

// --- EVENTOS DIARIOS (rotan según el día del año) ---
const eventosDiarios = [
  {
    nombre: '🎣 Día de Pesca',
    desc: 'Los peces están saltando hoy. ¡Es tu oportunidad!',
    historia: [
      'Lanzaste tu caña al río y pescaste un pez dorado 🐟',
      'Un misterioso pez koi saltó directo a tu cubeta 🎏',
      'Encontraste un cofre de madera flotando en el lago 📦',
      'Pescaste un pez espada legendario ⚔️',
      'Un delfín te trajo un collar de perlas 🐬'
    ],
    coinsMin: 3000, coinsMax: 12000, expMin: 200, expMax: 800
  },
  {
    nombre: '⛏️ Expedición Minera',
    desc: 'Se descubrió una mina abandonada llena de tesoros.',
    historia: [
      'Excavaste profundo y encontraste una veta de oro 💰',
      'Un diamante en bruto brillaba entre las rocas 💎',
      'Descubriste una cueva secreta llena de esmeraldas ✨',
      'Un antiguo tesoro olvidado estaba escondido aquí 🏺',
      'Encontraste minerales raros que valen una fortuna 🪨'
    ],
    coinsMin: 4000, coinsMax: 15000, expMin: 300, expMax: 1000
  },
  {
    nombre: '🌾 Festival de la Cosecha',
    desc: 'Los campos están llenos de frutos dorados hoy.',
    historia: [
      'Cosechaste frutas mágicas que brillan en la oscuridad 🍎',
      'Un árbol milenario te regaló sus mejores frutos 🌳',
      'Encontraste una calabaza gigante llena de monedas 🎃',
      'Las hadas del bosque te premiaron por cuidar la tierra 🧚',
      'Tu cosecha fue tan buena que el alcalde te dio un bono 🏅'
    ],
    coinsMin: 2500, coinsMax: 10000, expMin: 250, expMax: 700
  },
  {
    nombre: '🗡️ Caza de Monstruos',
    desc: 'Criaturas peligrosas rondan la zona. ¡Elimínalas!',
    historia: [
      'Derrotaste a un dragón bebé y encontraste su tesoro 🐉',
      'Un troll de cueva cayó ante tu espada. Dejó monedas 🧌',
      'Cazaste a un lobo sombra y vendiste su piel mágica 🐺',
      'El rey te recompensó por eliminar al basilisco 👑',
      'Encontraste el botín de un monstruo derrotado ⚔️'
    ],
    coinsMin: 5000, coinsMax: 18000, expMin: 400, expMax: 1200
  },
  {
    nombre: '🎪 Feria del Pueblo',
    desc: 'La feria llegó al pueblo. ¡Hay premios en cada puesto!',
    historia: [
      'Ganaste el primer lugar en el concurso de comer pasteles 🎂',
      'Tu puntería en el tiro al blanco fue perfecta 🎯',
      'La rueda de la fortuna giró a tu favor 🎡',
      'Ganaste el jackpot en la tómbola 🎰',
      'El payaso del circo te dio un premio especial 🤡'
    ],
    coinsMin: 3500, coinsMax: 14000, expMin: 200, expMax: 900
  },
  {
    nombre: '🏴‍☠️ Tesoro Pirata',
    desc: 'Un mapa del tesoro apareció misteriosamente...',
    historia: [
      'Seguiste el mapa y hallaste un cofre lleno de doblones 🪙',
      'Un barco pirata abandonado tenía oro escondido ⛵',
      'Encontraste la guarida secreta del Capitán Barbanegra 💀',
      'Una botella con un mensaje te llevó al tesoro 🏝️',
      'Descubriste una isla con un volcán lleno de rubíes 🌋'
    ],
    coinsMin: 5000, coinsMax: 20000, expMin: 350, expMax: 1100
  },
  {
    nombre: '🔮 Noche de Hechicería',
    desc: 'Las estrellas se alinearon. La magia es poderosa hoy.',
    historia: [
      'Un hechizo de transmutación convirtió piedras en oro ✨',
      'El grimorio antiguo reveló la ubicación de un tesoro 📖',
      'Una poción alquímica multiplicó tus monedas 🧪',
      'El oráculo te concedió una visión de riquezas 🔮',
      'Un portal dimensional te llevó a una bóveda mágica 🌀'
    ],
    coinsMin: 4500, coinsMax: 16000, expMin: 300, expMax: 1000
  },
  {
    nombre: '🏰 Asalto al Castillo',
    desc: 'El castillo abandonado necesita exploradores valientes.',
    historia: [
      'Encontraste la sala del trono con monedas olvidadas 👑',
      'La armería tenía espadas que vendiste a buen precio ⚔️',
      'Descubriste un pasadizo secreto lleno de joyas 💎',
      'Los fantasmas del castillo te recompensaron por liberarlos 👻',
      'Hallaste la corona perdida del rey antiguo 🏆'
    ],
    coinsMin: 5500, coinsMax: 22000, expMin: 500, expMax: 1500
  },
  {
    nombre: '🌊 Aventura Submarina',
    desc: 'El océano esconde secretos bajo sus olas.',
    historia: [
      'Buceaste hasta un galeón hundido lleno de tesoros 🚢',
      'Una perla negra gigante brillaba en el fondo 🖤',
      'Las sirenas te guiaron a un arrecife de coral dorado 🧜',
      'Encontraste una ciudad sumergida con cofres 🏛️',
      'Un pulpo guardián te entregó su colección de monedas 🐙'
    ],
    coinsMin: 4000, coinsMax: 17000, expMin: 350, expMax: 1100
  },
  {
    nombre: '🎭 Teatro de los Misterios',
    desc: 'El teatro ofrece un premio al mejor espectador.',
    historia: [
      'Tu actuación improvisada dejó al público boquiabierto 🎭',
      'Resolviste el misterio del fantasma de la ópera 🎵',
      'El director del teatro te pagó por tu participación 🎬',
      'Encontraste un boleto dorado bajo tu asiento 🎫',
      'La compañía de teatro te contrató como estrella invitada ⭐'
    ],
    coinsMin: 3000, coinsMax: 13000, expMin: 200, expMax: 850
  }
]

// --- EVENTOS SEMANALES (rotan según la semana del año) ---
const eventosSemanales = [
  {
    nombre: '🏆 Torneo del Coliseo',
    desc: 'El gran torneo semanal. Solo los más fuertes ganan.',
    historia: [
      'Tras una batalla épica, te coronaron campeón del coliseo 🏆',
      'Derrotaste a 10 oponentes seguidos y la multitud enloqueció ⚔️',
      'El emperador quedó tan impresionado que te dio su anillo 💍',
      'Tu estilo de combate será recordado por generaciones 🗡️'
    ],
    coinsMin: 25000, coinsMax: 75000, expMin: 3000, expMax: 8000
  },
  {
    nombre: '🐉 Cacería del Dragón',
    desc: 'Un dragón ancestral amenaza la región. ¡Derrótalo!',
    historia: [
      'Con un golpe certero derribaste al dragón milenario 🐉',
      'Las escamas del dragón valían más que todo el reino 💎',
      'La princesa te recompensó por salvar el castillo 👸',
      'El tesoro del dragón llenó tres carrozas enteras 💰'
    ],
    coinsMin: 30000, coinsMax: 100000, expMin: 5000, expMax: 12000
  },
  {
    nombre: '🌌 Exploración Interdimensional',
    desc: 'Un portal a otra dimensión se abrió por una semana.',
    historia: [
      'Viajaste a una dimensión donde las monedas crecen en árboles 🌳',
      'Los seres de la otra dimensión te ofrecieron riquezas por tu valentía ✨',
      'Encontraste un cristal dimensional que vale una fortuna 💠',
      'El guardián del portal te premió por el viaje de ida y vuelta 🌀'
    ],
    coinsMin: 35000, coinsMax: 90000, expMin: 4000, expMax: 10000
  },
  {
    nombre: '⚗️ Gran Alquimia',
    desc: 'El laboratorio de alquimia está abierto esta semana.',
    historia: [
      'Lograste la transmutación perfecta: plomo en oro puro 🥇',
      'Tu poción fue tan buena que el gremio te pagó triple 🧪',
      'Descubriste una fórmula legendaria perdida hace siglos 📜',
      'El elixir de la vida que creaste vale millones 💫'
    ],
    coinsMin: 28000, coinsMax: 85000, expMin: 3500, expMax: 9000
  },
  {
    nombre: '🎊 Gran Festival',
    desc: 'Es la semana del Gran Festival. ¡Recompensas dobles!',
    historia: [
      'Fuiste nombrado invitado de honor del Festival Real 🎊',
      'El espectáculo de fuegos artificiales reveló un mensaje secreto con un premio 🎆',
      'Ganaste la competencia principal del festival 🏅',
      'Los organizadores te dieron un pase VIP con acceso al tesoro 🎟️'
    ],
    coinsMin: 40000, coinsMax: 120000, expMin: 5000, expMax: 15000
  }
]

// --- FUNCIONES AUXILIARES ---
const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getEventoDiarioHoy() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now - start
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return eventosDiarios[dayOfYear % eventosDiarios.length]
}

function getEventoSemanalHoy() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now - start
  const weekOfYear = Math.floor(diff / (1000 * 60 * 60 * 24 * 7))
  return eventosSemanales[weekOfYear % eventosSemanales.length]
}

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  const days = Math.floor(duration / (1000 * 60 * 60 * 24))
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)
  return parts.join(' ')
}

function getResetDiario() {
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return tomorrow.getTime() - now.getTime()
}

function getResetSemanal() {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Dom, 1=Lun...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek)
  const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMonday)
  return nextMonday.getTime() - now.getTime()
}

function getDiaKey() {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}

function getSemanaKey() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now - start
  const week = Math.floor(diff / (1000 * 60 * 60 * 24 * 7))
  return `${now.getFullYear()}-W${week}`
}

// ═══════════════════════════════════════
//  COMANDO: #evento
// ═══════════════════════════════════════
export default {
  command: ['evento', 'event', 'eventos', 'events', 'eventdiario', 'eventsemanal'],
  category: 'rpg',
  run: async ({ client, m, command }) => {

    // 1. Validaciones de Grupo
    if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos.')

    const chatData = global.db.data.chats[m.chat] || {}
    if (chatData.adminonly || !chatData.rpg) {
      return m.reply(`✎ Los comandos de economía están desactivados en este grupo.`)
    }

    // 2. Configuración
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const monedas = settings.currency || 'monedas'

    // 3. Resolución de Usuario
    const userId = await resolveLidToRealJid(m.sender, client, m.chat)
    let user = global.db.data.users[userId]
    if (!user) {
      global.db.data.users[userId] = { coins: 0, exp: 0, level: 0, bank: 0 }
      user = global.db.data.users[userId]
    }

    // Inicializar datos de eventos
    user.eventos = user.eventos || {}

    // Obtener eventos actuales
    const eventoDiario = getEventoDiarioHoy()
    const eventoSemanal = getEventoSemanalHoy()
    const diaKey = getDiaKey()
    const semanaKey = getSemanaKey()

    // ═══════════════════════════════════
    // SUBCOMANDO: Ver info de eventos
    // ═══════════════════════════════════
    if (command === 'eventos' || command === 'events') {
      const yaDiario = user.eventos[`daily_${diaKey}`] || false
      const yaSemanal = user.eventos[`weekly_${semanaKey}`] || false

      const estadoDiario = yaDiario ? '✅ Reclamado' : '🟢 Disponible'
      const estadoSemanal = yaSemanal ? '✅ Reclamado' : '🟢 Disponible'

      const resetDiario = msToTime(getResetDiario())
      const resetSemanal = msToTime(getResetSemanal())

      const msg = `╔══════════════════════╗
  📅 *EVENTOS ACTIVOS*
╚══════════════════════╝

🌅 *EVENTO DIARIO*
${eventoDiario.nombre}
> ${eventoDiario.desc}
> Estado: *${estadoDiario}*
> Recompensa: *¥${eventoDiario.coinsMin.toLocaleString()} ~ ${eventoDiario.coinsMax.toLocaleString()} ${monedas}*
> Se reinicia en: *${resetDiario}*
> Comando: *#evento*

━━━━━━━━━━━━━━━━━━━

🌟 *EVENTO SEMANAL*
${eventoSemanal.nombre}
> ${eventoSemanal.desc}
> Estado: *${estadoSemanal}*
> Recompensa: *¥${eventoSemanal.coinsMin.toLocaleString()} ~ ${eventoSemanal.coinsMax.toLocaleString()} ${monedas}*
> Se reinicia en: *${resetSemanal}*
> Comando: *#eventsemanal*

━━━━━━━━━━━━━━━━━━━
_Usa #evento para reclamar el diario_
_Usa #eventsemanal para reclamar el semanal_`

      return m.reply(msg)
    }

    // ═══════════════════════════════════
    // RECLAMAR EVENTO SEMANAL
    // ═══════════════════════════════════
    if (command === 'eventsemanal') {
      const claimKey = `weekly_${semanaKey}`

      if (user.eventos[claimKey]) {
        const reset = msToTime(getResetSemanal())
        return m.reply(
          `⏱️ Ya reclamaste el evento semanal.\n` +
          `> *${eventoSemanal.nombre}*\n` +
          `> Se reinicia en: *${reset}*`
        )
      }

      // Reclamar recompensa semanal
      const coins = randomInt(eventoSemanal.coinsMin, eventoSemanal.coinsMax)
      const exp = randomInt(eventoSemanal.expMin, eventoSemanal.expMax)
      const historia = pickRandom(eventoSemanal.historia)

      user.coins = (user.coins || 0) + coins
      user.exp = (user.exp || 0) + exp
      user.eventos[claimKey] = Date.now()

      // Limpiar reclamos de semanas anteriores
      limpiarEventosViejos(user, 'weekly_')

      const msg = `╔══════════════════════╗
  🌟 *EVENTO SEMANAL*
╚══════════════════════╝

${eventoSemanal.nombre}

> ${historia}

💰 *Recompensa:*
> ⛁ +*¥${coins.toLocaleString()} ${monedas}*
> ⚡ +*${exp.toLocaleString()} XP*

_¡Vuelve la próxima semana para el siguiente evento!_`

      return client.sendMessage(m.chat, { text: msg, mentions: [userId] }, { quoted: m })
    }

    // ═══════════════════════════════════
    // RECLAMAR EVENTO DIARIO (default: #evento / #event / #eventdiario)
    // ═══════════════════════════════════
    const claimKey = `daily_${diaKey}`

    if (user.eventos[claimKey]) {
      const reset = msToTime(getResetDiario())
      return m.reply(
        `⏱️ Ya reclamaste el evento de hoy.\n` +
        `> *${eventoDiario.nombre}*\n` +
        `> Se reinicia en: *${reset}*\n\n` +
        `> 💡 Usa *#eventos* para ver todos los eventos activos.`
      )
    }

    // Racha de eventos diarios
    user.eventStreak = user.eventStreak || 0
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = `daily_${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`

    if (user.eventos[yesterdayKey]) {
      user.eventStreak += 1
    } else if (user.eventStreak > 0) {
      // Perdió la racha
      user.eventStreak = 1
    } else {
      user.eventStreak = 1
    }

    // Bonus por racha
    const streakBonus = Math.min(user.eventStreak, 7) // Máx 7 días de bonus
    const streakMultiplier = 1 + (streakBonus * 0.1) // +10% por día, máx +70%

    // Calcular recompensas
    let coins = randomInt(eventoDiario.coinsMin, eventoDiario.coinsMax)
    let exp = randomInt(eventoDiario.expMin, eventoDiario.expMax)

    // Aplicar bonus de racha
    coins = Math.floor(coins * streakMultiplier)
    exp = Math.floor(exp * streakMultiplier)

    const historia = pickRandom(eventoDiario.historia)

    // Guardar
    user.coins = (user.coins || 0) + coins
    user.exp = (user.exp || 0) + exp
    user.eventos[claimKey] = Date.now()

    // Limpiar reclamos de días anteriores (mantener solo últimos 3)
    limpiarEventosViejos(user, 'daily_')

    const rachaMsg = user.eventStreak > 1
      ? `\n🔥 *Racha:* ${user.eventStreak} días (Bonus: +${Math.round((streakMultiplier - 1) * 100)}%)`
      : ''

    const msg = `╔══════════════════════╗
  📅 *EVENTO DIARIO*
╚══════════════════════╝

${eventoDiario.nombre}

> ${historia}

💰 *Recompensa:*
> ⛁ +*¥${coins.toLocaleString()} ${monedas}*
> ⚡ +*${exp.toLocaleString()} XP*${rachaMsg}

_Usa *#eventos* para ver el evento semanal 🌟_`

    return client.sendMessage(m.chat, { text: msg, mentions: [userId] }, { quoted: m })
  }
}

// Limpiar claves de eventos viejos para no inflar la DB
function limpiarEventosViejos(user, prefix) {
  if (!user.eventos) return
  const keys = Object.keys(user.eventos).filter(k => k.startsWith(prefix))
  // Mantener solo las últimas 3 entradas
  if (keys.length > 3) {
    const sorted = keys.sort()
    const toDelete = sorted.slice(0, sorted.length - 3)
    for (const key of toDelete) {
      delete user.eventos[key]
    }
  }
}
