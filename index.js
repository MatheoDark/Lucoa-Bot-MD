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
import { invalidateGroupCache } from './lib/groupCache.js'

// 🔥 SISTEMA ANTI-CRASH (VITAL PARA TU VPS)
// Esto evita que el bot muera si Rule34 o YouTube fallan
process.on('uncaughtException', (err) => {
    console.log(chalk.red('⚠️ Error atrapado (Bot sigue vivo):'), err.message)
})
process.on('unhandledRejection', (err) => {
    console.log(chalk.red('⚠️ Promesa rechazada (Bot sigue vivo):'), err.message)
})

// 🔥 MANEJO DE SEÑALES PM2 - Cierre limpio sin perder sesión
let _isShuttingDown = false
const _processStartTime = Date.now() // Para detectar reinicios rápidos de PM2

async function gracefulShutdown(signal) {
    if (_isShuttingDown) return
    _isShuttingDown = true
    console.log(chalk.yellow(`📴 ${signal} recibido. Cerrando limpiamente...`))
    try {
        // 1. Guardar DB
        if (global._gracefulSaveDB) {
            try { global._gracefulSaveDB(); console.log(chalk.green('✅ DB guardada.')) } catch {}
        }
        
        // 2. Cerrar conexión de WhatsApp LIMPIAMENTE ANTES de forzar credenciales finales
        if (global.client) {
            try {
                // Desuscribir solo connection.update para evitar bucle de reconexión, preservando creds.update
                global.client.ev.removeAllListeners('connection.update')
                // 🔧 FIX v8: Usar end() que envía close frame al servidor de WA
                try { global.client.end(new Error('Graceful Shutdown')) } catch {}
            } catch {}
        }
        
        // Esperar 2s para que WA registre el close frame
        await new Promise(r => setTimeout(r, 2000))
        
        // 3. Guardar credenciales AL FINAL
        if (global._saveCreds) {
            try {
                await global._saveCreds()
                console.log(chalk.green('✅ Credenciales guardadas.'))
            } catch (e) {
                console.error('⚠️ Error guardando credenciales:', e.message)
            }
        }
    } catch {}
    console.log(chalk.green('✅ Sesión preservada. Saliendo...'))
    process.exit(0)
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

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
  proto,
  decryptPollVote,
  jidNormalizedUser
} from "@whiskeysockets/baileys"

import pino from "pino"
import boxen from 'boxen'
import cfonts from 'cfonts'
import readline from "readline"
import qrcode from "qrcode-terminal"
import { smsg } from "./lib/message.js"
import { startSubBot } from './lib/subs.js'
import { startDropScheduler } from './lib/drops.js'

// ═══ Store global de polls activos (para menú interactivo) ═══
global.activePollMenus = global.activePollMenus || new Map()

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

function teardownClient() {
  try {
    if (disconnectTracker._credsAutoSaveInterval) {
      clearInterval(disconnectTracker._credsAutoSaveInterval)
      disconnectTracker._credsAutoSaveInterval = null
    }
    if (disconnectTracker._reconnectTimer) {
      clearTimeout(disconnectTracker._reconnectTimer)
      disconnectTracker._reconnectTimer = null
    }
    if (global.client) {
      try { global.client.ev.removeAllListeners() } catch {}
      try { global.client.end() } catch {}
      global.client = null
    }
  } catch {}
}

function purgeSession() {
  try {
    global._saveCreds = null // Evitar que el shutdown hook vuelva a guardar la sesión muerta
    teardownClient()
    // No hacer backup de una sesión que sabemos que está mala (401/403/Forbidden)
    const backupPath = path.join(global.sessionName, 'creds.backup.json')
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
    
    fs.rmSync(global.sessionName, { recursive: true, force: true })
    fs.mkdirSync(global.sessionName, { recursive: true })
    console.log(chalk.cyan("♻️ Sesión reiniciada y purgada por completo."))
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
  // En PM2/no-TTY no hay input interactivo: forzar QR para permitir relink automático.
  if (!process.stdin.isTTY) {
    console.log(chalk.yellow('🛠️ Entorno no interactivo detectado (PM2). Usando QR automáticamente.'))
    return '1'
  }

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
    setTimeout(loadBots, 15 * 60 * 1000) // 🔧 FIX v6: Cada 15 min (era 5 min, causaba handshakes excesivos)
    
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

// Queue simple (estilo Megumin/Nekos) — 800ms entre cada envío, con retry en errores transitorios
const queue = []
let running = false
const DELAY = 800

function enqueue(task, opts = {}) {
  queue.push({
    task,
    attempts: 0,
    maxAttempts: opts.maxAttempts || 3,
    reject: typeof opts.reject === 'function' ? opts.reject : null,
    label: opts.label || 'task'
  })
  run()
}

function isTransientSendError(errMsg = '') {
  const msg = errMsg.toLowerCase()
  return (
    msg.includes('rate-overlimit') ||
    msg.includes('too many requests') ||
    msg.includes('media upload failed') ||
    msg.includes('fetch failed') ||
    msg.includes('eai_again') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('socket hang up')
  )
}

function getRetryDelay(errMsg = '', attempts = 1) {
  const msg = errMsg.toLowerCase()
  if (msg.includes('rate-overlimit') || msg.includes('too many requests')) return 2000
  if (msg.includes('media upload failed')) return 5000
  return Math.min(2000 * attempts, 8000)
}

async function run() {
  if (running) return
  running = true
  while (queue.length) {
    const job = queue.shift()
    try {
      job.attempts += 1
      await job.task()
    } catch (e) {
      const errMsg = String(e?.message || e || '')
      const canRetry = isTransientSendError(errMsg) && job.attempts < job.maxAttempts

      if (canRetry) {
        const wait = getRetryDelay(errMsg, job.attempts)
        console.warn(`⚠️ Envío falló (${job.label}) intento ${job.attempts}/${job.maxAttempts}. Reintentando en ${Math.round(wait / 1000)}s...`)
        await new Promise(r => setTimeout(r, wait))
        queue.unshift(job)
      } else {
        console.error('Send error:', e.message || e)
        if (job.reject) job.reject(e)
      }
    }
    await new Promise(r => setTimeout(r, DELAY))
  }
  running = false
}

// Se mantiene solo para compatibilidad con connection.update (428)
export function activateRecoveryMode() {}

export function patchSendMessage(client) {
  if (client._sendMessagePatched) return
  client._sendMessagePatched = true
  const original = client.sendMessage.bind(client)
  client.sendMessage = (jid, content, options = {}) => {
    return new Promise((resolve, reject) => {
      enqueue(async () => {
        const res = await original(jid, content, options)
        resolve(res)
      }, { reject, maxAttempts: 3, label: 'sendMessage' })
    })
  }
}

export function patchInteractive(client) {
  if (client._interactivePatched) return
  client._interactivePatched = true

  client.sendInteractiveRaw = (jid, messageContent, options = {}) =>
    new Promise((resolve, reject) =>
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
      }, { reject, maxAttempts: 3, label: 'sendInteractiveRaw' })
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
let _isStartingBot = false
let _pendingRestart = false

// ✅ Sistema de reconexión con detección de bucles 428
const disconnectTracker = {
  _reconnectTimer: null,
  _credsAutoSaveInterval: null,
  consecutive428: 0,
  consecutive401: 0,
  last428Time: 0
}

// Reconectar con delays inteligentes
function requestBotRestart(delayMs = 1000, reason = '') {
  if (_isShuttingDown) return
  if (_isStartingBot) {
    _pendingRestart = true
    log.warn(`⏳ Reinicio pendiente: ${reason || 'startBot en progreso'}`)
    return
  }
  
  // Cancelar timer anterior
  if (disconnectTracker._reconnectTimer) {
    clearTimeout(disconnectTracker._reconnectTimer)
    disconnectTracker._reconnectTimer = null
  }
  
  // 🔧 FIX: Detectar bucles persistentes
  let finalDelay = delayMs
  
  if (reason.includes('428')) {
    // Bucle 428 (Rate limit)
    const now = Date.now()
    if (now - disconnectTracker.last428Time < 30000) {
      disconnectTracker.consecutive428++
    } else {
      disconnectTracker.consecutive428 = 1
    }
    disconnectTracker.last428Time = now
    
    if (disconnectTracker.consecutive428 >= 3) {
      finalDelay = 20000  // ← Esperar 20s si detecta bucle
      log.error(`🛑 BUCLE 428 DETECTADO (${disconnectTracker.consecutive428}x). Esperando 20s...`)
    } else if (disconnectTracker.consecutive428 >= 2) {
      finalDelay = Math.max(delayMs, 10000)  // Mínimo 10s
    } else {
      finalDelay = Math.max(delayMs, 8000)  // Mínimo 8s
    }
  } 
  else if (reason.includes('401')) {
    // Bucle 401 (Connection Failure)
    disconnectTracker.consecutive401++
    if (disconnectTracker.consecutive401 >= 10) {
      // Después de 10 intentos fallidos de 401, la sesión probablemente está corrupta
      log.error(`🛑 BUCLE 401 PERSISTENTE (${disconnectTracker.consecutive401}x). Purgando sesión...`)
      purgeSession()
      LOGIN_METHOD = '1'  // Forzar QR
      disconnectTracker.consecutive401 = 0
      finalDelay = 3000
    } else if (disconnectTracker.consecutive401 >= 5) {
      finalDelay = 10000  // Después de 5 intentos, esperar 10s
    } else {
      finalDelay = Math.max(delayMs, 5000)  // Mínimo 5s
    }
  } else {
    disconnectTracker.consecutive428 = 0
    disconnectTracker.consecutive401 = 0
    finalDelay = Math.max(delayMs, 3000)
  }
  
  console.log(chalk.cyan(`🔄 Reconectando en ${Math.round(finalDelay / 1000)}s... (${reason})`))
  disconnectTracker._reconnectTimer = setTimeout(() => {
    disconnectTracker._reconnectTimer = null
    startBot()
  }, finalDelay)
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

// 🔧 FIX v8: Limpiar SOLO pre-keys antiguas en exceso (mantener las últimas 30).
// Las pre-keys son NECESARIAS para el handshake de Signal/Noise de WhatsApp.
// Borrarlas TODAS causa desconexión 401/515 al siguiente handshake.
function purgePreKeys(forceAll = false) {
  try {
    const sessionDir = global.sessionName
    if (!fs.existsSync(sessionDir)) return
    const files = fs.readdirSync(sessionDir)
      .filter(f => f.startsWith('pre-key-'))
      .sort((a, b) => {
        const numA = parseInt(a.replace('pre-key-', '')) || 0
        const numB = parseInt(b.replace('pre-key-', '')) || 0
        return numA - numB
      })
    
    if (forceAll && files.length > 0) {
      for (const file of files) {
        try { fs.unlinkSync(path.join(sessionDir, file)) } catch {}
      }
      console.log(chalk.yellow(`🧹 🔥 PURGA FORZADA: ${files.length} pre-keys eliminadas (saneamiento 515)`))
      return
    }

    // Mantener las últimas 30 pre-keys, solo borrar el exceso
    const MAX_PREKEYS = 30
    if (files.length <= MAX_PREKEYS) return
    const toDelete = files.slice(0, files.length - MAX_PREKEYS)
    for (const file of toDelete) {
      try { fs.unlinkSync(path.join(sessionDir, file)) } catch {}
    }
    if (toDelete.length > 0) console.log(chalk.gray(`🔑 Pre-keys antiguas limpiadas: ${toDelete.length} (conservadas: ${MAX_PREKEYS})`))
  } catch {}
}
setInterval(purgePreKeys, 30 * 60 * 1000) // Cada 30 minutos (no cada 10)

async function startBot() {
  if (_isStartingBot) {
    _pendingRestart = true
    return
  }
  _isStartingBot = true

  try {
  // 🔧 CRITICO: Cerrar socket VIEJO antes de crear uno nuevo (como Ellen-Joe)
  if (global.client) {
    try {
      // Usar end() en lugar de ws.close() para cierre limpio
      global.client.end?.()
    } catch {}
    try {
      global.client.ev?.removeAllListeners()  // Limpia listeners
    } catch {}
    global.client = null
  }

  if (disconnectTracker._credsAutoSaveInterval) {
    clearInterval(disconnectTracker._credsAutoSaveInterval)
    disconnectTracker._credsAutoSaveInterval = null
  }

  await loadDatabaseSafe()

  let { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
  
  // 🔧 FIX: Validar que las credenciales tienen los campos críticos para login.
  // Si faltan, la sesión está corrupta y Baileys va a crashear con 401.
  if (state.creds.me && (!state.creds.noiseKey || !state.creds.signedIdentityKey)) {
    console.log(chalk.red('❌ Credenciales corruptas detectadas (faltan claves de cifrado). Purgando sesión...'))
    purgeSession()
    LOGIN_METHOD = await uPLoader()
    // Recargar credenciales limpias
    const freshAuth = await useMultiFileAuthState(global.sessionName)
    state = freshAuth.state
    saveCreds = freshAuth.saveCreds
  }

  // Si la sesión tiene identidad y claves, forzar el estado de registro.
  // Algunas instalaciones dejan `registered=false` aunque la sesión sea reutilizable.
  if (state.creds.me && state.creds.noiseKey && state.creds.signedIdentityKey && !state.creds.registered) {
    state.creds.registered = true
    try {
      await saveCreds()
    } catch {}
  }
  
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: "silent" })

  console.info = () => {}
  console.debug = () => {}

  const groupMetadataCache = new Map()

  const client = makeWASocket({
    version,
    logger,
    browser: Browsers.macOS('Chrome'),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    getMessage: async () => '',
    keepAliveIntervalMs: 45000,
    maxIdleTimeMs: 60000,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: undefined,
    emitOwnEvents: true,
    fireInitQueries: true,
    shouldIgnoreJid: (jid) => jid?.endsWith('@broadcast') || jid === 'status@broadcast',
    cachedGroupMetadata: async (jid) => {
      const cached = groupMetadataCache.get(jid)
      if (cached && Date.now() - cached.ts < 300000) return cached.data
      return undefined
    }
  })

  // Actualizar cache de metadatos cuando llegan
  client.ev.on('groups.update', (updates) => {
    for (const update of updates) {
      if (update.id) {
        groupMetadataCache.delete(update.id)
        invalidateGroupCache(update.id) // Cache centralizado
      }
    }
  })
  client.ev.on('group-participants.update', ({ id }) => {
    groupMetadataCache.delete(id)
    invalidateGroupCache(id) // Cache centralizado
  })

  patchSendMessage(client)
  patchInteractive(client)
  global.client = client
  client.public = true

  // 🔧 FIX: Exponer saveCreds globalmente para el shutdown handler
  global._saveCreds = saveCreds
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
      
      // 401 - loggedOut: distinguir logout real de "Connection Failure" temporal
      if (reason === DisconnectReason.loggedOut) {
        const errorMsg = String(lastDisconnect?.error?.message || lastDisconnect?.error || '').toLowerCase()
        const isRealLogout = errorMsg.includes('logged out')

        if (isRealLogout) {
          log.error(`❌ WhatsApp confirmó cierre de sesión. Se requiere nueva vinculación.`)
          purgeSession()
          LOGIN_METHOD = await uPLoader()
          requestBotRestart(3000, 'nueva vinculación tras logout real')
        } else {
          // "Connection Failure" = temporal. Reconectar con espera
          log.warn(`⚠️ 401 Connection Failure - Reconectando...`)
          requestBotRestart(5000, '401 Connection Failure')
        }
      }
      // Todos los demás errores temporales
      else if (reason === DisconnectReason.badSession) {
        log.warn("⚠️ badSession - Reconectando...")
        requestBotRestart(5000, 'badSession')
      }
      else if (reason === DisconnectReason.multideviceMismatch) {
        log.warn("⚠️ multideviceMismatch - Reconectando...")
        requestBotRestart(6000, 'multideviceMismatch')
      }
      else if (reason === DisconnectReason.connectionReplaced) {
        log.warn("⚠️ Conexión reemplazada por otra sesión. No se reconecta.")
      }
      else if (reason === DisconnectReason.forbidden) {
        log.error("❌ Conexión prohibida. Purgando sesión...")
        purgeSession()
        LOGIN_METHOD = await uPLoader()
        requestBotRestart(3000, 'forbidden con sesión purgada')
      }
      else if (reason === 428) {
        // Rate limit - con backoff inteligente
        log.warn(`⚠️ Error 428: Rate limit. Reconectando...`)
        requestBotRestart(5000, 'rate limit 428')
      }
      else if (reason === 515) {
        // Stream error
        log.warn(`⚠️ 515 Stream Errored - Reconectando...`)
        requestBotRestart(5000, '515 Stream Errored')
      }
      else {
        // Todos los demás errores
        log.warn(`⚠️ Desconexión (${reason}). Reconectando...`)
        requestBotRestart(4000, `desconexión ${reason}`)
      }
    }

    if (connection === "open") {
      // Resetear contadores de error al conectar
      disconnectTracker.consecutive428 = 0
      disconnectTracker.consecutive401 = 0
      
      // Limpiar timer si aún existe
      if (disconnectTracker._reconnectTimer) {
        clearTimeout(disconnectTracker._reconnectTimer)
        disconnectTracker._reconnectTimer = null
      }
      
      // Backup de sesión al conectar
      backupSession()
      
      // 🔧 FIX v5: Auto-save de credenciales cada 5 minutos
      // Previene pérdida de tokens tras reinicio inesperado.
      if (disconnectTracker._credsAutoSaveInterval) {
        clearInterval(disconnectTracker._credsAutoSaveInterval)
      }
      disconnectTracker._credsAutoSaveInterval = setInterval(async () => {
        if (global._saveCreds) {
          try {
            await global._saveCreds()
          } catch {}
        }
      }, 5 * 60 * 1000) // Cada 5 minutos
      
      // Timer de estabilidad: si la conexión dura 5 min, reportar estabilidad
      if (disconnectTracker._stableTimer) clearTimeout(disconnectTracker._stableTimer)
      disconnectTracker._stableTimer = setTimeout(() => {
        console.log(chalk.green('✅ Conexión estable por 5min.'))
      }, 300000)
      
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

      // 🐉 Auto-actualizar estado de WhatsApp con uptime y estética Lucoa
      if (disconnectTracker._statusInterval) clearInterval(disconnectTracker._statusInterval)
      const updateBotStatus = async () => {
        try {
          const sec = process.uptime()
          const d = Math.floor(sec / 86400)
          const h = Math.floor((sec % 86400) / 3600)
          const mn = Math.floor((sec % 3600) / 60)
          const parts = []
          if (d > 0) parts.push(`${d}d`)
          if (h > 0) parts.push(`${h}h`)
          parts.push(`${mn}m`)
          const uptimeStr = parts.join(' ')
          await client.updateProfileStatus(`🐉 Lucoa Bot · ⏱ ${uptimeStr} activa · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`)
        } catch {}
      }
      // 🔧 FIX v7: Primer update después de 30s, luego cada 15min (era 5min — demasiadas llamadas API)
      setTimeout(updateBotStatus, 30000)
      disconnectTracker._statusInterval = setInterval(updateBotStatus, 15 * 60 * 1000)
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

      // ═══ POLL VOTE HANDLER (para menú interactivo con encuestas) ═══
      const pollUpdate = m.message?.pollUpdateMessage
      if (pollUpdate) {
        try {
          const pollStore = global.activePollMenus
          const creationKey = pollUpdate.pollCreationMessageKey
          if (creationKey) {
            const pollData = pollStore.get(creationKey.id)
            if (pollData) {
              // Recopilar TODOS los JIDs posibles del bot (creator)
              const creatorSet = new Set()
              const meNorm = jidNormalizedUser(client.user.id)
              creatorSet.add(meNorm)
              // LID del bot desde authState
              const meLid = client.authState?.creds?.me?.lid
              if (meLid) creatorSet.add(jidNormalizedUser(meLid))
              // PN del bot (extraer de id si tiene formato user:device@s.whatsapp.net)
              const meDecoded = jidDecode(client.user.id)
              if (meDecoded?.user) creatorSet.add(meDecoded.user + '@s.whatsapp.net')

              // Recopilar TODOS los JIDs posibles del votante
              const voterSet = new Set()
              if (m.key?.participantAlt) voterSet.add(m.key.participantAlt)
              if (m.key?.remoteJidAlt) voterSet.add(m.key.remoteJidAlt)
              if (m.key?.participant) voterSet.add(m.key.participant)
              if (m.key?.remoteJid && !m.key.remoteJid.endsWith('@g.us')) voterSet.add(m.key.remoteJid)

              const creatorArr = [...creatorSet]
              const voterArr = [...voterSet]

              let decrypted = null
              let matchedCreator = null, matchedVoter = null
              for (const cr of creatorArr) {
                for (const vt of voterArr) {
                  try {
                    decrypted = decryptPollVote(
                      pollUpdate.vote,
                      { pollEncKey: pollData.pollEncKey, pollCreatorJid: cr, pollMsgId: creationKey.id, voterJid: vt }
                    )
                    if (decrypted?.selectedOptions?.length) {
                      matchedCreator = cr
                      matchedVoter = vt
                      break
                    }
                  } catch {}
                }
                if (decrypted?.selectedOptions?.length) break
              }

              if (decrypted?.selectedOptions?.length) {
                console.log('[PollVote] OK creator:', matchedCreator, 'voter:', matchedVoter)
                for (const optHash of decrypted.selectedOptions) {
                  const hashHex = Buffer.from(optHash).toString('hex')
                  const command = pollData.optionMap[hashHex]
                  if (command) {
                    const voterJid = m.key?.participant || m.key?.remoteJid
                    const fakeMsg = {
                      key: { remoteJid: m.key.remoteJid, fromMe: false, participant: voterJid, id: m.key.id + '_pollcmd' },
                      message: { conversation: command },
                      messageTimestamp: Math.floor(Date.now() / 1000),
                      pushName: m.pushName || 'Usuario'
                    }
                    const mFake = await smsg(client, fakeMsg)
                    await handler(client, mFake, { messages: [fakeMsg], type: 'notify' })
                  }
                }
              } else {
                console.log('[PollVote] FAILED. Creators tried:', creatorArr, 'Voters tried:', voterArr)
              }
            }
          }
        } catch (err) {
          console.error('[PollMenu] Error:', err.message)
        }
        return
      }

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
  } finally {
    _isStartingBot = false
    if (_pendingRestart && !_isShuttingDown) {
      _pendingRestart = false
      requestBotRestart(2000, 'reinicio pendiente')
    }
  }
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
