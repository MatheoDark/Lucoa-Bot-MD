/*
 # ------------- √ × -------------
   # Nota
   - Base mejorada por David-Chian
   - Reparación de respuestas por MatheoDark
   - BLINDAJE: Anti-Crash + Protección de Sesión 515
 # ------------- √ × -------------
*/

import "./settings.js"
import { fileURLToPath } from 'url'
import path from "path"
import fs from "fs"
import chalk from "chalk"

// 🔥 SISTEMA ANTI-CRASH (VITAL PARA TU VPS)
// Esto evita que el bot muera si Rule34 o YouTube fallan
process.on('uncaughtException', (err) => {
    console.log(chalk.red('⚠️ Error atrapado (Bot sigue vivo):'), err.message)
})
process.on('unhandledRejection', (err) => {
    console.log(chalk.red('⚠️ Promesa rechazada (Bot sigue vivo):'), err.message)
})

// 🔥 MANEJO DE SEÑALES PM2 - Cierre limpio sin perder sesión
process.on('SIGTERM', () => {
    console.log(chalk.yellow('📴 PM2 SIGTERM recibido. Cerrando limpiamente...'))
    try {
        if (global.client) {
            global.client.ev.removeAllListeners()
            global.client.ws?.close()
            global.client.end?.()
        }
    } catch {}
    console.log(chalk.green('✅ Sesión preservada. Saliendo...'))
    process.exit(0)
})
process.on('SIGINT', () => {
    console.log(chalk.yellow('📴 SIGINT recibido. Cerrando limpiamente...'))
    try {
        if (global.client) {
            global.client.ev.removeAllListeners()
            global.client.ws?.close()
            global.client.end?.()
        }
    } catch {}
    console.log(chalk.green('✅ Sesión preservada. Saliendo...'))
    process.exit(0)
})

// --- 1. CONFIGURACIÓN INICIAL ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

global.sessionName = path.join(__dirname, 'Sessions', 'Owner')

if (!fs.existsSync(global.sessionName)) {
  fs.mkdirSync(global.sessionName, { recursive: true })
}

import db from "./lib/system/database.js"
global.db = db

import handler from './main.js'
import events from './commands/events.js'
import {
  Browsers,
  makeWASocket,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  jidDecode,
  DisconnectReason,
  generateWAMessageFromContent,
  proto
} from "@whiskeysockets/baileys"

import pino from "pino"
import boxen from 'boxen'
import cfonts from 'cfonts'
import readline from "readline"
import qrcode from "qrcode-terminal"
import { smsg } from "./lib/message.js"
import { startSubBot } from './lib/subs.js'
import { startDropScheduler } from './lib/drops.js'

const log = {
  info: (msg) => console.log(chalk.bgBlue.white.bold(`INFO`), chalk.white(msg)),
  warn: (msg) => console.log(chalk.bgYellowBright.blueBright.bold(`WARNING`), chalk.yellow(msg)),
  error: (msg) => console.log(chalk.bgRed.white.bold(`ERROR`), chalk.redBright(msg)),
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, (answer) => resolve(answer.trim())))

const DIGITS = (s = "") => String(s).replace(/\D/g, "")
function normalizePhoneForPairing(input) {
  let s = DIGITS(input)
  if (!s) return ""
  if (s.startsWith("0")) s = s.replace(/^0+/, "")
  if (s.length === 10 && s.startsWith("3")) s = "57" + s
  if (s.startsWith("52") && !s.startsWith("521") && s.length >= 12) s = "521" + s.slice(2)
  if (s.startsWith("54") && !s.startsWith("549") && s.length >= 11) s = "549" + s.slice(2)
  return s
}

function backupSession() {
  try {
    const credsPath = path.join(global.sessionName, 'creds.json')
    if (fs.existsSync(credsPath)) {
      const backupPath = path.join(global.sessionName, 'creds.backup.json')
      fs.copyFileSync(credsPath, backupPath)
      console.log(chalk.cyan('💾 Backup de sesión guardado.'))
    }
  } catch (e) {
    console.error('Error guardando backup:', e.message)
  }
}

function restoreSession() {
  try {
    const credsPath = path.join(global.sessionName, 'creds.json')
    const backupPath = path.join(global.sessionName, 'creds.backup.json')
    if (!fs.existsSync(credsPath) && fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, credsPath)
      console.log(chalk.green('♻️ Sesión restaurada desde backup.'))
      return true
    }
  } catch (e) {
    console.error('Error restaurando backup:', e.message)
  }
  return false
}

function purgeSession() {
  try {
    backupSession()
    fs.rmSync(global.sessionName, { recursive: true, force: true })
    fs.mkdirSync(global.sessionName, { recursive: true })
    console.log(chalk.cyan("♻️ Sesión reiniciada."))
  } catch {}
}

function hasMainSession() {
  const credsPath = path.join(global.sessionName, 'creds.json')
  return fs.existsSync(credsPath)
}

// 🔧 FIX: Evitar que se llame más de una vez (crea intervalos duplicados y sobreescribe datos)
let _dbSafeLoaded = false

async function loadDatabaseSafe() {
  if (_dbSafeLoaded) return
  _dbSafeLoaded = true

  global.db.data ||= {}
  global.db.data.users ||= {}
  global.db.data.chats ||= {}
  global.db.data.settings ||= {}
  global.db.data.sticker ||= {}

  try {
    if (typeof global.loadDatabase === "function") {
      global.loadDatabase()
    }
  } catch (e) {
    console.error("Error cargando DB:", e)
  }
  // 🔧 FIX: Eliminado el setInterval de db.write() duplicado.
  // database.js ya tiene su propio auto-save con setInterval.
}

export async function uPLoader() {
  const TOTAL_TIME = 1500
  const STEPS = 10
  const BAR_SIZE = 20

  console.clear()

  for (let i = 0; i <= STEPS; i++) {
    const percent = Math.floor((i / STEPS) * 100)
    const filled = Math.floor((percent / 100) * BAR_SIZE)
    const bar = chalk.green('■'.repeat(filled)) + chalk.gray('□'.repeat(BAR_SIZE - filled))
    process.stdout.write(`\r${chalk.cyan('Iniciando sistema:')} ${bar} ${percent}%`)
    await new Promise(r => setTimeout(r, TOTAL_TIME / STEPS))
  }
  console.log('\n')

  cfonts.say('LUCOA-BOT', { font: 'block', align: 'center', colors: ['red'] })
  cfonts.say('powered by MatheoDark', { font: 'console', align: 'center', gradient: ['blue', 'cyan'] })

  console.log(chalk.yellow.bold('\nSeleccione método de vinculación:\n'))
  console.log(chalk.green('1') + ' ➜ Código QR')
  console.log(chalk.green('2') + ' ➜ Pairing Code')

  let opt
  while (!['1', '2'].includes(opt)) {
    opt = await question(chalk.magentaBright('\n➤ Opción: '))
  }
  return opt
}

// SubBots
const BOT_TYPES = [{ name: 'SubBot', folder: './Sessions/Subs', starter: startSubBot }]
const reconnecting = new Set()
global.conns = global.conns || []

// Control de reconexión mejorado
const botLoadState = {
  retryCount: 0,
  maxRetries: 5,
  maxBackoff: 300000 // 5 minutos máximo
}

async function loadBots() {
  try {
    for (const { folder, starter } of BOT_TYPES) {
      if (!fs.existsSync(folder)) continue
      const botIds = fs.readdirSync(folder)
      for (const userId of botIds) {
        const sessionPath = path.join(folder, userId)
        if (!fs.existsSync(path.join(sessionPath, 'creds.json'))) continue
        if (global.conns.some((conn) => conn.userId === userId)) continue
        if (reconnecting.has(userId)) continue
        try {
          reconnecting.add(userId)
          await starter(null, null, 'Auto reconexión', false, userId, sessionPath)
          reconnecting.delete(userId)
        } catch (e) {
          console.error(`❌ Error cargando SubBot ${userId}:`, e.message)
          reconnecting.delete(userId)
        }
        await new Promise((res) => setTimeout(res, 2000))
      }
    }
    
    // Reset counter si fue exitoso
    botLoadState.retryCount = 0
    setTimeout(loadBots, 5 * 60 * 1000) // Cada 5 minutos en vez de 60s
    
  } catch (err) {
    console.error(`⚠️ Error en loadBots:`, err.message)
    botLoadState.retryCount++
    
    if (botLoadState.retryCount >= botLoadState.maxRetries) {
      console.error('❌ loadBots falló demasiadas veces. Parando reconexión de SubBots.')
      return
    }
    
    // Backoff exponencial: 10s, 20s, 40s, 80s, 160s, capped at 5 min
    const delay = Math.min(10000 * Math.pow(2, botLoadState.retryCount - 1), botLoadState.maxBackoff)
    console.log(`🔄 Reintentando en ${Math.round(delay / 1000)}s (intento ${botLoadState.retryCount}/${botLoadState.maxRetries})...`)
    setTimeout(loadBots, delay)
  }
}

// Anti Rate-Limit Mejorado v2
const queue = []
let running = false
const DELAY = 2000 // ✅ 2s entre mensajes (era 1.5s, causaba presión en el stream)
const MAX_QUEUE = 100 // Límite de cola para evitar acumulación infinita

function enqueue(task) { 
  // 🔧 FIX: Evitar que la cola crezca indefinidamente durante desconexiones
  if (queue.length >= MAX_QUEUE) {
    console.warn(`⚠️ Cola de mensajes llena (${MAX_QUEUE}). Descartando mensaje antiguo.`)
    queue.shift() // Descartar el más antiguo
  }
  queue.push(task)
  run() 
}
async function run() {
  if (running) return
  running = true
  while (queue.length) {
    const job = queue.shift()
    try { 
      await job() 
    }
    catch (e) {
      const errorStr = String(e)
      if (errorStr.includes('rate-overlimit') || errorStr.includes('too many requests')) {
        console.warn('⚠️ Rate limit detectado, esperando 5s...')
        await new Promise(r => setTimeout(r, 5000))
        queue.unshift(job)
      } else if (errorStr.includes('Connection Closed') || errorStr.includes('stream errored')) {
        // 🔧 FIX: No reintentar envíos si el stream está caído
        console.warn('⚠️ Stream caído, descartando mensaje en cola.')
      } else { 
        console.error('Send error:', e.message || e) 
      }
    }
    await new Promise(r => setTimeout(r, DELAY))
  }
  running = false
}

export function patchSendMessage(client) {
  if (client._sendMessagePatched) return
  client._sendMessagePatched = true
  const original = client.sendMessage.bind(client)
  client.sendMessage = (jid, content, options = {}) =>
    new Promise((resolve) => enqueue(async () => resolve(await original(jid, content, options))))
}

export function patchInteractive(client) {
  if (client._interactivePatched) return
  client._interactivePatched = true

  client.sendInteractiveRaw = (jid, messageContent, options = {}) =>
    new Promise((resolve) =>
      enqueue(async () => {
        const msg = generateWAMessageFromContent(
          jid,
          messageContent,
          {
            userJid: client.user?.id,
            quoted: options?.quoted
          }
        )
        const res = await client.relayMessage(jid, msg.message, { messageId: msg.key.id })
        resolve(res)
      })
    )

  client.sendNativeSelect = async (jid, { title, body, footer, buttonText, rows }, quoted) => {
    const sections = [
      {
        title: 'Opciones',
        rows: (rows || []).map((r) => ({
          title: r.title,
          description: r.description || '',
          id: r.id
        }))
      }
    ]

    const buttonParamsJson = JSON.stringify({
      title: buttonText || 'Ver opciones',
      sections
    })

    const content = proto.Message.fromObject({
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: { title: title || 'Menu', hasMediaAttachment: false },
            body: { text: body || 'Selecciona una opción' },
            footer: { text: footer || '' },
            nativeFlowMessage: {
              buttons: [{ name: 'single_select', buttonParamsJson }]
            }
          }
        }
      }
    })

    return client.sendInteractiveRaw(jid, content, { quoted })
  }
}

let LOGIN_METHOD = null

// ✅ Control de desconexiones frecuentes (anti-spam) - MEJORADO v2
const disconnectTracker = {
  lastDisconnect: 0,
  count: 0,
  maxDisconnectsPerMinute: 3,
  cooldownMs: 30000, // 30 segundos entre desconexiones
  consecutive428: 0,  // Contador de 428 consecutivos para backoff
  consecutiveBadSession: 0,  // Contador de badSession para no borrar sesión de inmediato
  consecutive401: 0,  // Contador de 401 para no borrar sesión al primer intento
  consecutive515: 0,  // 🔧 FIX: Contador de 515 para backoff exponencial
  consecutiveOther: 0, // Contador de otros errores consecutivos
  _reconnectTimer: null // Timer de reconexión activo (evitar duplicados)
}

function shouldReconnect() {
  const now = Date.now()
  const timeSinceLastDisconnect = now - disconnectTracker.lastDisconnect
  
  // Si pasó más de 1 minuto, resetear counter
  if (timeSinceLastDisconnect > 60000) {
    disconnectTracker.count = 0
  }
  
  // Si tuvo 3+ desconexiones en menos de 1 minuto, esperar más
  if (disconnectTracker.count >= disconnectTracker.maxDisconnectsPerMinute) {
    console.error(`🛑 Demasiadas desconexiones (${disconnectTracker.count}). Esperando 60s antes de reintentar...`)
    return false
  }
  
  // Si se desconectó hace muy poco, esperar 30s
  if (timeSinceLastDisconnect < disconnectTracker.cooldownMs) {
    const waitTime = Math.round((disconnectTracker.cooldownMs - timeSinceLastDisconnect) / 1000)
    console.log(`⏳ Esperando ${waitTime}s antes de reintentar (cooldown de desconexión)...`)
    return false
  }
  
  disconnectTracker.lastDisconnect = now
  disconnectTracker.count++
  return true
}

async function delayedReconnect(delayMs, reason = '') {
  // 🔧 FIX: Cancelar timer anterior para evitar reconexiones duplicadas
  if (disconnectTracker._reconnectTimer) {
    clearTimeout(disconnectTracker._reconnectTimer)
    disconnectTracker._reconnectTimer = null
  }

  if (!shouldReconnect()) {
    const waitMs = Math.max(disconnectTracker.cooldownMs, delayMs)
    console.log(chalk.gray(`⏳ Cooldown activo. Reintentando en ${Math.round(waitMs / 1000)}s...`))
    disconnectTracker._reconnectTimer = setTimeout(() => {
      disconnectTracker._reconnectTimer = null
      delayedReconnect(delayMs, reason)
    }, waitMs)
    return
  }
  
  console.log(chalk.cyan(`🔄 Reconectando en ${Math.round(delayMs / 1000)}s... (${reason})`))
  disconnectTracker._reconnectTimer = setTimeout(() => {
    disconnectTracker._reconnectTimer = null
    startBot()
  }, delayMs)
}

// 🧹 Limpieza automática de carpeta tmp
function cleanTmpFolder() {
  const tmpDir = path.join(__dirname, 'tmp')
  if (!fs.existsSync(tmpDir)) return
  try {
    const files = fs.readdirSync(tmpDir)
    const now = Date.now()
    let deleted = 0
    for (const file of files) {
      const filePath = path.join(tmpDir, file)
      try {
        const stat = fs.statSync(filePath)
        // Eliminar archivos con más de 5 minutos de antigüedad
        if (now - stat.mtimeMs > 5 * 60 * 1000) {
          fs.unlinkSync(filePath)
          deleted++
        }
      } catch {}
    }
    if (deleted > 0) console.log(chalk.gray(`🧹 tmp limpiado: ${deleted} archivo(s) eliminado(s)`))
  } catch {}
}

// Limpiar tmp cada 10 minutos
setInterval(cleanTmpFolder, 10 * 60 * 1000)
// Limpiar al iniciar
cleanTmpFolder()

async function startBot() {
// 🔥 CRÍTICO: Cerrar conexión anterior completamente antes de crear una nueva
  // Sin esto, quedan sockets zombie y WhatsApp devuelve 428/515
  if (global.client) {
    try {
      global.client.ev.removeAllListeners()
      // Cerrar WebSocket con código normal de cierre
      try { global.client.ws?.close() } catch {}
      try { global.client.end?.() } catch {}
    } catch (e) {
      // Ignorar errores al cerrar cliente viejo
    }
    global.client = null
    // 🔧 FIX: Esperar 5s (era 3s) para que el socket anterior se libere y WhatsApp
    // no detecte una doble conexión (causa principal de 515 en VPS)
    await new Promise(r => setTimeout(r, 5000))
  }

  await loadDatabaseSafe()

  const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: "silent" })

  console.info = () => {}
  console.debug = () => {}

  // 🔧 Cache de metadatos de grupo para reducir llamadas API al stream
  const groupMetadataCache = new Map()

  const client = makeWASocket({
    version,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    // 🔧 FIX: Configuración optimizada contra desconexiones 515
    retryRequestDelayMs: 2500,       // ← ERA 250, demasiado agresivo. Ahora 2.5s
    getMessage: async (key) => {
      // Intentar devolver mensaje del store si existe
      return undefined
    },
    keepAliveIntervalMs: 20000,      // 20s - margen seguro antes del timeout de 30s
    maxMsgRetryCount: 3,             // ← ERA 5, menos reintentos = menos presión
    connectTimeoutMs: 60000,         // ← ERA 20s, ahora 60s para VPS lentos
    emitOwnEvents: true,
    fireInitQueries: true,
    // 🔧 NUEVO: Ignorar broadcasts de estado (reduce carga en el stream)
    shouldIgnoreJid: (jid) => jid?.endsWith('@broadcast') || jid === 'status@broadcast',
    // 🔧 NUEVO: Cache de metadatos de grupo reduce llamadas al API
    cachedGroupMetadata: async (jid) => {
      const cached = groupMetadataCache.get(jid)
      if (cached && Date.now() - cached.ts < 300000) return cached.data // 5 min TTL
      return undefined
    }
  })

  // Actualizar cache de metadatos cuando llegan
  client.ev.on('groups.update', (updates) => {
    for (const update of updates) {
      if (update.id) groupMetadataCache.delete(update.id)
    }
  })
  client.ev.on('group-participants.update', ({ id }) => {
    groupMetadataCache.delete(id)
  })

  patchSendMessage(client)
  patchInteractive(client)
  global.client = client
  client.public = true

  client.ev.on("creds.update", saveCreds)

  if (!client.authState.creds.registered && LOGIN_METHOD === '2') {
    setTimeout(async () => {
      console.clear()
      cfonts.say('LUCOA-BOT', { font: 'tiny', align: 'center', colors: ['red'] })
      console.log(chalk.bold.redBright('\nIngrese su número (Ej: 573001234567):'))
      const fixed = await question(chalk.magentaBright('➤ Número: '))
      const phoneNumber = normalizePhoneForPairing(fixed)
      try {
        const pairing = await client.requestPairingCode(phoneNumber)
        console.log(chalk.bgMagenta.white.bold('\n CÓDIGO: '), chalk.white.bold(pairing))
      } catch (err) {
        console.log(chalk.red('❌ Error al generar código'))
      }
    }, 2000)
  }

  client.sendText = (jid, text, quoted = "", options) =>
    client.sendMessage(jid, { text: text, ...options }, { quoted })

  client.ev.on("connection.update", async (update) => {
    const { qr, connection, lastDisconnect } = update

    if (qr && LOGIN_METHOD === '1') {
      console.clear()
      cfonts.say('QR CODE', { font: 'tiny', align: 'center', colors: ['yellow'] })
      console.log(chalk.cyan.bold('📸 ESCANEA ESTE CÓDIGO QR\n'))
      qrcode.generate(qr, { small: true })
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode || 0
      console.log(chalk.red(`⚠️ Desconexión: ${reason} | ${lastDisconnect?.error}`))
      
      // � FIX: Error 401 NO siempre significa logout real.
      // "Connection Failure" con 401 puede ser temporal.
      // Solo purgar sesión después de 3 intentos consecutivos fallidos.
      if (reason === DisconnectReason.loggedOut) {
        disconnectTracker.consecutive401++
        const errorMsg = String(lastDisconnect?.error?.message || lastDisconnect?.error || '')
        const isRealLogout = errorMsg.toLowerCase().includes('logged out')
        
        if (isRealLogout || disconnectTracker.consecutive401 >= 3) {
          log.warn(`⚠️ Sesión cerrada confirmada (intento ${disconnectTracker.consecutive401}). Se requiere nueva vinculación.`)
          purgeSession()
          disconnectTracker.consecutive401 = 0
          disconnectTracker.consecutiveBadSession = 0
          LOGIN_METHOD = await uPLoader()
          startBot()
        } else {
          log.warn(`⚠️ Error 401 (intento ${disconnectTracker.consecutive401}/3). Puede ser temporal. Reintentando en 10s...`)
          delayedReconnect(10000, `Error 401 - intento ${disconnectTracker.consecutive401}/3`)
        }
      }
      // badSession (500) - Intentar reconectar antes de borrar
      else if (reason === DisconnectReason.badSession) {
        disconnectTracker.consecutiveBadSession++
        if (disconnectTracker.consecutiveBadSession >= 3) {
          log.warn(`⚠️ badSession ${disconnectTracker.consecutiveBadSession} veces seguidas. Purgando sesión...`)
          purgeSession()
          disconnectTracker.consecutiveBadSession = 0
          LOGIN_METHOD = await uPLoader()
          startBot()
        } else {
          log.warn(`⚠️ badSession (intento ${disconnectTracker.consecutiveBadSession}/3). Reintentando sin borrar sesión...`)
          delayedReconnect(5000, `badSession intento ${disconnectTracker.consecutiveBadSession}`)
        }
      }
      // multideviceMismatch (411) - Intentar reconectar, NO borrar sesión
      else if (reason === DisconnectReason.multideviceMismatch) {
        log.warn("⚠️ multideviceMismatch - Reintentando conexión...")
        delayedReconnect(10000, 'multideviceMismatch')
      } 
      // ERROR 428: Connection Terminated (Rate limit de WhatsApp)
      else if (reason === 428) {
        disconnectTracker.consecutive428++
        // Backoff agresivo: 5min, 10min, 15min... max 30min
        const backoff428 = Math.min(300000 * disconnectTracker.consecutive428, 1800000)
        console.log(chalk.yellow(`⚠️ Error 428: Rate limit. Esperando ${Math.round(backoff428 / 1000 / 60)}min (intento ${disconnectTracker.consecutive428})`))
        
        // Después de 5 intentos, esperar 1 hora
        if (disconnectTracker.consecutive428 >= 5) {
          console.log(chalk.red('🛑 Demasiados 428 consecutivos. Esperando 1 hora antes de reintentar.'))
          setTimeout(() => {
            disconnectTracker.consecutive428 = 0
            startBot()
          }, 3600000)
          return
        }
        
        delayedReconnect(backoff428, 'Error 428 - Rate Limit')
      }
      // ERROR 515: Stream Errored (Muy común en VPS) - CON BACKOFF EXPONENCIAL
      else if (reason === 515) {
        disconnectTracker.consecutive515++
        // Backoff exponencial: 15s, 30s, 60s, 120s, 240s, max 5min
        const backoff515 = Math.min(15000 * Math.pow(2, disconnectTracker.consecutive515 - 1), 300000)
        console.log(chalk.yellow(`⚠️ Error 515: Stream Errored (intento ${disconnectTracker.consecutive515}). Esperando ${Math.round(backoff515 / 1000)}s...`))
        
        // Después de 8 intentos consecutivos, esperar 15 minutos
        if (disconnectTracker.consecutive515 >= 8) {
          console.log(chalk.red('🛑 Demasiados 515 consecutivos. Esperando 15 minutos antes de reintentar.'))
          // Backup de sesión por seguridad
          backupSession()
          disconnectTracker._reconnectTimer = setTimeout(() => {
            disconnectTracker._reconnectTimer = null
            disconnectTracker.consecutive515 = 0
            startBot()
          }, 900000) // 15 minutos
          return
        }
        
        delayedReconnect(backoff515, `Error 515 - Stream Errored (intento ${disconnectTracker.consecutive515})`)
      } 
      // OTROS ERRORES - con backoff para evitar loops
      else {
        disconnectTracker.consecutiveOther++
        const otherBackoff = Math.min(10000 * disconnectTracker.consecutiveOther, 120000)
        console.log(chalk.yellow(`⚠️ Desconexión detectada (${reason}). Reconectando en ${Math.round(otherBackoff / 1000)}s...`))
        delayedReconnect(otherBackoff, `Error ${reason}`)
      }
    }

    if (connection === "open") {
      // Resetear counters de errores al conectar exitosamente
      disconnectTracker.consecutiveBadSession = 0
      disconnectTracker.consecutive401 = 0
      disconnectTracker.consecutiveOther = 0
      
      // Solo resetear contadores de stream después de estar estable 5 minutos
      if (disconnectTracker._stableTimer) clearTimeout(disconnectTracker._stableTimer)
      disconnectTracker._stableTimer = setTimeout(() => {
        const had515 = disconnectTracker.consecutive515 > 0
        const had428 = disconnectTracker.consecutive428 > 0
        disconnectTracker.consecutive515 = 0
        disconnectTracker.consecutive428 = 0
        disconnectTracker.count = 0
        if (had515 || had428) {
          console.log(chalk.green('✅ Conexión estable por 5min. Contadores de errores reseteados.'))
        }
      }, 300000) // 5 minutos
      
      console.log(
        boxen(chalk.bold(' ¡CONECTADO! '), {
          borderStyle: 'round',
          borderColor: 'green',
          title: chalk.green.bold('● ONLINE ●'),
          titleAlignment: 'center',
          float: 'center'
        })
      )

      // 🎁 Iniciar scheduler de drops aleatorios
      startDropScheduler(client)
    }
  })

  client.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {}
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid
    }
    return jid
  }

  try { await events(client) } catch {}

  client.ev.on("messages.upsert", async ({ messages, type }) => {
    try {
      if (!global.db || !global.db.data) return

      let m = messages?.[0]
      if (!m?.message) return
      m.message = Object.keys(m.message)[0] === "ephemeralMessage" ? m.message.ephemeralMessage.message : m.message
      if (m.key?.remoteJid === "status@broadcast") return

      client.public = true
      if (!client.public && !m.key.fromMe && type === "notify") return
      if (m.key.id?.startsWith("BAE5") && m.key.id.length === 16) return

      m = await smsg(client, m)
      await handler(client, m, { messages, type })
    } catch (err) { 
        // Silencio errores menores de mensajes para no ensuciar consola
    }
  })
}

;(async () => {
  loadBots().catch(() => {})
  await loadDatabaseSafe()
  console.log(chalk.gray('[ ✿ ] DB Cargada.'))

  if (hasMainSession()) {
    console.log(chalk.green("✅ Sesión encontrada. Iniciando bot..."))
    LOGIN_METHOD = null
  } else if (restoreSession()) {
    console.log(chalk.green("✅ Sesión restaurada desde backup. Iniciando bot..."))
    LOGIN_METHOD = null
  } else {
    LOGIN_METHOD = await uPLoader()
  }

  await startBot()
})()
