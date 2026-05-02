import { resolveLidToRealJid } from '../lib/utils.js'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment-timezone'

// Zona horaria del bot (debe coincidir con la configuración en main.js)
const TIMEZONE = 'America/Santiago'

// ═══════════════════════════════════════════════════════════════════════
//  🎁 SISTEMA DE DROPS — 2 DROPS CADA 3 DÍAS
//  Tarde (14-16h) | Noche (20-22h)
//  La primera persona en escribir #drop / #recoger se lleva el premio.
//  Probabilidad baja (~3%) de obtener un personaje del gacha.
// ═══════════════════════════════════════════════════════════════════════

// --- FRANJAS HORARIAS ---
const FRANJAS = [
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

// Tiempo máximo que un drop está disponible (configurable)
const DROP_EXPIRY_MINUTES = 15
const DROP_EXPIRY = DROP_EXPIRY_MINUTES * 60 * 1000

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
 * Genera un drop aleatorio en un grupo.
 * Retorna true si se envió correctamente, false si falló.
 */
export async function spawnDrop(client, chatId, franjaInfo) {
  // No generar si ya hay un drop activo en este grupo
  if (activeDrops.has(chatId)) return false

  // Evitar enviar si el client es nulo o fue desconectado.
  // Ya no usamos client.ws.readyState === 1 porque Baileys lo maneja distinto.
  if (!client) {
    console.warn(`🎁 [Drops] Cliente no listo para enviar a ${chatId.slice(0, 10)}...`)
    return false
  }

  // 5% chance de drop raro
  const esRaro = Math.random() < 0.05
  const drop = esRaro ? pickRandom(DROPS_RAROS) : pickRandom(DROPS)
  const mensaje = pickRandom(drop.mensajes)
  const franjaLabel = franjaInfo ? `${franjaInfo.emoji} Drop de ${franjaInfo.label}` : '🎁 Drop Aleatorio'

  const raroBanner = esRaro ? '\n\n🌟🌟🌟 *¡¡DROP LEGENDARIO!!* 🌟🌟🌟' : ''
  const charHint = '\n🎲 *¡Puede contener un personaje del gacha!*'

  const msg = `╔══════════════════════╗
  ${drop.emoji} *¡${franjaLabel}!* ${drop.emoji}
╚══════════════════════╝

${mensaje}${raroBanner}${charHint}

💰 *Recompensa:* ¥${drop.coinsMin.toLocaleString()} ~ ¥${drop.coinsMax.toLocaleString()}
⏱️ *Expira en:* ${DROP_EXPIRY_MINUTES} minutos

> ¡Escribe *#drop* o *#recoger* para tomarlo!`

  // 🔧 FIX v8: Enviar PRIMERO — solo marcar como activo si el mensaje llegó
  try {
    await client.sendMessage(chatId, { text: msg })
  } catch (err) {
    console.error(`🎁 [Drops] Error enviando drop a ${chatId.slice(0, 10)}: ${err.message}`)
    return false
  }

  activeDrops.set(chatId, {
    drop,
    timestamp: Date.now(),
    raro: esRaro,
    franja: franjaInfo?.id || 'manual'
  })

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

  return true
}

/**
 * Intenta reclamar un drop activo (la primera persona que escriba #drop)
 */
export async function claimDrop(client, m) {
  const chatId = m.chat

  if (!activeDrops.has(chatId)) {
    return m.reply('❌ No hay ningún drop activo en este grupo.\n> Los drops aparecen cada 3 días (tarde y noche). ¡Estate atento!')
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

  const dia = esDiaDeDrop()

  let franjasPendientes = []
  if (dia) {
    const enviadas = franjasEnviadasHoy(chatData)
    franjasPendientes = FRANJAS.filter(f => !enviadas[f.id])
  }

  // Calcular tiempo restante hasta el próximo día de drops
  const hoy = moment().tz(TIMEZONE).startOf('day')
  const diasDesdeEpoch = hoy.diff(DROP_EPOCH, 'days')
  const diasRestantes = dia ? 0 : CYCLE_DAYS - (diasDesdeEpoch % CYCLE_DAYS)
  const proximoCiclo = dia ? 0 : diasRestantes * 24 * 60 * 60 * 1000

  return {
    esDia: dia,
    franjasPendientes,
    proximoCiclo,
    dropActivo: activeDrops.has(chatId)
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  SCHEDULER — 2 DROPS CADA 3 DÍAS (TARDE, NOCHE)
// ═══════════════════════════════════════════════════════════════════════

// Ciclo de 3 días — GLOBAL para todos los grupos
const CYCLE_DAYS = 3

// Fecha de referencia fija (epoch) para sincronizar el ciclo entre todos los grupos.
// Los drops caen los días donde daysSinceEpoch % CYCLE_DAYS === 0.
const DROP_EPOCH = moment.tz('2026-01-01', TIMEZONE).startOf('day')

/**
 * Determina si hoy es día de drops (GLOBAL, igual para todos los grupos).
 * Usa una fecha epoch fija para que todos los grupos estén sincronizados.
 * Drops caen cada 3 días contando desde el epoch.
 */
function esDiaDeDrop() {
  const hoy = moment().tz(TIMEZONE).startOf('day')
  const diasDesdeEpoch = hoy.diff(DROP_EPOCH, 'days')
  return diasDesdeEpoch % CYCLE_DAYS === 0
}

/**
 * Obtiene qué franjas ya se enviaron hoy en este ciclo.
 * `dropsFranjasEnviadas` es un objeto { mañana: ts, tarde: ts, noche: ts }
 */
function franjasEnviadasHoy(chatData) {
  const enviadas = chatData.dropsFranjasEnviadas || {}
  const inicioHoy = moment().tz(TIMEZONE).startOf('day').valueOf()

  // Solo contar franjas enviadas HOY (en zona horaria local)
  const resultado = {}
  for (const [franja, ts] of Object.entries(enviadas)) {
    if (ts >= inicioHoy) resultado[franja] = ts
  }
  return resultado
}

/**
 * Verifica si la franja horaria ya alcanzó su hora de inicio.
 * Usa la zona horaria configurada (America/Santiago).
 * RETROACTIVO: si la hora ya pasó la franja, igual retorna true
 * para que drops perdidos se envíen en el siguiente check.
 */
function franjaDisponible(franja) {
  const hora = moment().tz(TIMEZONE).hour()
  return hora >= franja.horaInicio
}

// 🔧 FIX: Guard para evitar intervalos duplicados en reconexiones
let _dropSchedulerInterval = null
let _dropSchedulerTimeout = null
// 🔧 FIX v8: Trackear timeouts pendientes de drops para cancelarlos en reconexión
let _pendingDropTimeouts = []
// Referencia al client activo para validar que spawnDrop no use un client muerto
let _activeClient = null

/**
 * Inicia el scheduler de drops.
 * Verifica cada 10 minutos si algún grupo necesita un drop en la franja actual.
 * 2 drops cada 3 días: tarde (14-16h), noche (20-22h).
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
  // 🔧 FIX v8: Cancelar drops pendientes del client anterior
  for (const t of _pendingDropTimeouts) clearTimeout(t)
  _pendingDropTimeouts = []
  // Limpiar activeDrops del client viejo (nunca llegaron a WhatsApp)
  activeDrops.clear()
  // Guardar referencia al client actual
  _activeClient = client

  console.log('🎁 Scheduler de drops iniciado — 2 drops cada 3 días (tarde/noche).')

  const ejecutarCheck = () => {
    try {
      if (!global.db?.data?.chats) {
        console.log('🎁 [Drops] DB no cargada aún, esperando...')
        return
      }

      const chats = global.db.data.chats
      const horaLocal = moment().tz(TIMEZONE).format('HH:mm')

      // ¿Es día de drop? (global, igual para todos los grupos)
      if (!esDiaDeDrop()) {
        // 🔧 FIX v7: Solo loguear cada hora, no cada 10 min (menos ruido)
        const minuto = moment().tz(TIMEZONE).minute()
        if (minuto < 10) console.log(`🎁 [Drops] ${horaLocal} — Hoy no es día de drops.`)
        return
      }

      // Grupos elegibles: RPG activo, drops activos, no adminonly
      const gruposActivos = Object.entries(chats)
        .filter(([id, data]) => {
          return id.endsWith('@g.us') && data.rpg !== false && data.drops !== false && !data.adminonly
        })

      if (gruposActivos.length === 0) {
        console.log(`🎁 [Drops] ${horaLocal} — Sin grupos elegibles (total chats: ${Object.keys(chats).length})`)
        return
      }

      // Menos carga y más escasez: máximo 2 drops por chequeo global.
      const MAX_DROPS_PER_CHECK = 2
      let dropsEnviados = 0
      const hora = moment().tz(TIMEZONE).hour()

      for (const [groupId, data] of gruposActivos) {
        // Límite de drops simultáneos por check
        if (dropsEnviados >= MAX_DROPS_PER_CHECK) break
        
        // Ya tiene un drop activo esperando ser reclamado
        if (activeDrops.has(groupId)) continue

        // Resetear franjas si es un nuevo día de drops
        const inicioHoy = moment().tz(TIMEZONE).startOf('day').valueOf()
        if (!data.lastDropDay || data.lastDropDay < inicioHoy) {
          data.lastDropDay = inicioHoy
          data.dropsFranjasEnviadas = {}
          if (typeof global.markDBDirty === 'function') global.markDBDirty()
          console.log(`🎁 [Drops] Nuevo ciclo iniciado para grupo ${groupId.slice(0, 10)}...`)
        }

        // Ver qué franjas ya se enviaron hoy
        const enviadas = franjasEnviadasHoy(data)

        // Buscar la primera franja disponible que NO haya sido enviada
        // RETROACTIVO: si la hora ya pasó una franja no enviada, se envía ahora
        for (const franja of FRANJAS) {
          if (enviadas[franja.id]) continue
          if (!franjaDisponible(franja)) continue

          // 🔧 FIX v7: Delay entre 30s y 3min (era 0-2min) para escalonar mejor
          const delay = randomInt(30 * 1000, 3 * 60 * 1000)
          console.log(`🎁 [Drops] ${horaLocal} — Programando drop "${franja.label}" para ${groupId.slice(0, 10)}... (delay: ${Math.round(delay / 1000)}s)`)

          // 🔧 FIX v9: Marcar franja INMEDIATAMENTE como "programada" para evitar
          // que el siguiente check (10min) agende un duplicado antes de que el setTimeout se ejecute.
          if (!data.dropsFranjasEnviadas) data.dropsFranjasEnviadas = {}
          data.dropsFranjasEnviadas[franja.id] = Date.now()
          if (typeof global.markDBDirty === 'function') global.markDBDirty()

          const tid = setTimeout(async () => {
            try {
              // 🔧 FIX v8: Si el client cambió (reconexión), cancelar — este drop es zombie
              if (client !== _activeClient) {
                console.log(`🎁 [Drops] Drop "${franja.label}" cancelado (client obsoleto)`)
                // Desmarcar franja — la nueva sesión lo reintentará
                if (global.db?.data?.chats?.[groupId]?.dropsFranjasEnviadas) {
                  delete global.db.data.chats[groupId].dropsFranjasEnviadas[franja.id]
                  if (typeof global.markDBDirty === 'function') global.markDBDirty()
                }
                return
              }
              if (activeDrops.has(groupId)) return

              const enviado = await spawnDrop(client, groupId, franja)
              
              // Si falló el envío, desmarcar para que el próximo check lo reintente
              if (!enviado && global.db?.data?.chats?.[groupId]?.dropsFranjasEnviadas) {
                delete global.db.data.chats[groupId].dropsFranjasEnviadas[franja.id]
                if (typeof global.markDBDirty === 'function') global.markDBDirty()
                console.log(`🎁 [Drops] Drop "${franja.label}" falló para ${groupId.slice(0, 10)}, se reintentará`)
              } else if (enviado) {
                console.log(`🎁 [Drops] Drop "${franja.label}" enviado a ${groupId.slice(0, 10)}...`)
              }
            } catch (err) {
              console.error(`🎁 [Drops] Error en setTimeout de drop:`, err)
              // Desmarcar en caso de error
              if (global.db?.data?.chats?.[groupId]?.dropsFranjasEnviadas) {
                delete global.db.data.chats[groupId].dropsFranjasEnviadas[franja.id]
                if (typeof global.markDBDirty === 'function') global.markDBDirty()
              }
            }
          }, delay)
          _pendingDropTimeouts.push(tid)

          dropsEnviados++
          break
        }
      }

      // 📊 Resumen — solo loguear cuando hay algo relevante
      if (dropsEnviados > 0) {
        console.log(`🎁 [Drops] ${horaLocal} — Check: ${gruposActivos.length} grupos, ${dropsEnviados} drops programados`)
      } else {
        // Solo loguear si hay alguna franja disponible pero no enviada (posible problema)
        const hayProblema = FRANJAS.some(f => {
          const disponible = hora >= f.horaInicio
          if (!disponible) return false
          return gruposActivos.some(([, d]) => {
            const env = franjasEnviadasHoy(d)
            return !env[f.id]
          })
        })
        if (hayProblema) {
          const franjaStatus = FRANJAS.map(f => {
            const enviada = gruposActivos.some(([, d]) => {
              const env = franjasEnviadasHoy(d)
              return !!env[f.id]
            })
            const disponible = hora >= f.horaInicio
            if (enviada) return `${f.emoji}${f.label}: ✅`
            if (disponible) return `${f.emoji}${f.label}: ⚠️ pendiente`
            return `${f.emoji}${f.label}: ⏳ ${f.horaInicio}h`
          }).join(' | ')
          console.log(`🎁 [Drops] ${horaLocal} — ⚠️ ${gruposActivos.length} grupos | ${franjaStatus}`)
        }
      }
    } catch (err) {
      console.error('🎁 [Drops] Error en ejecutarCheck:', err)
    }
  }

  // Verificar cada 10 minutos
  _dropSchedulerInterval = setInterval(ejecutarCheck, 10 * 60 * 1000)

  // Primer check después de 30 segundos
  _dropSchedulerTimeout = setTimeout(ejecutarCheck, 30 * 1000)
}
