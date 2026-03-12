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
        // 2. Guardar credenciales
        if (global._saveCreds) {
            try {
                await global._saveCreds()
                console.log(chalk.green('✅ Credenciales guardadas.'))
            } catch (e) {
                console.error('⚠️ Error guardando credenciales:', e.message)
            }
        }
        // 3. Cerrar conexión de WhatsApp LIMPIAMENTE
        if (global.client) {
            try {
                // Desuscribir eventos para evitar que el close trigger reconexión
                global.client.ev.removeAllListeners()
                // 🔧 FIX v8: Usar end() que envía close frame al servidor de WA
                try { global.client.end() } catch {}
            } catch {}
        }
        // Esperar 2s para que WA registre el close frame
        await new Promise(r => setTimeout(r, 2000))
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

// Anti Rate-Limit v5 — ADAPTATIVO: rápido normalmente, frena solo cuando se acerca al límite
const queue = []
let running = false
const MAX_QUEUE = 50

// Delays BASE (modo normal — rápido)
const DELAY_TEXT_NORMAL = 1500    // 1.5s entre textos
const DELAY_MEDIA_NORMAL = 2500  // 2.5s entre media
const GROUP_INTERVAL_NORMAL = 2000 // 2s entre msgs al mismo grupo

// Delays CAUTELA (cuando se acerca al límite)
const DELAY_TEXT_CAUTIOUS = 4000
const DELAY_MEDIA_CAUTIOUS = 6000
const GROUP_INTERVAL_CAUTIOUS = 5000

// Delays POST-428 (después de un rate limit real)
const DELAY_TEXT_RECOVERY = 5000
const DELAY_MEDIA_RECOVERY = 8000
const GROUP_INTERVAL_RECOVERY = 6000

const groupLastSend = new Map()

// Tracking adaptativo
const globalSendTimestamps = []
const WINDOW = 60000 // Ventana de 1 minuto
const THRESHOLD_CAUTION = 20  // >20 msg/min → modo cautela
const THRESHOLD_DANGER = 30   // >30 msg/min → pausar
let _rateLimitMode = 'normal' // 'normal' | 'cautious' | 'recovery'
let _recoveryUntil = 0        // Timestamp hasta cuando mantener modo recovery

function getDelays() {
  // Si estamos en recovery post-428, usar delays conservadores
  if (_rateLimitMode === 'recovery' && Date.now() < _recoveryUntil) {
    return { text: DELAY_TEXT_RECOVERY, media: DELAY_MEDIA_RECOVERY, group: GROUP_INTERVAL_RECOVERY }
  }
  // Si recovery expiró, volver a normal
  if (_rateLimitMode === 'recovery' && Date.now() >= _recoveryUntil) {
    _rateLimitMode = 'normal'
    console.log('✅ Modo recovery terminado, volviendo a velocidad normal.')
  }
  if (_rateLimitMode === 'cautious') {
    return { text: DELAY_TEXT_CAUTIOUS, media: DELAY_MEDIA_CAUTIOUS, group: GROUP_INTERVAL_CAUTIOUS }
  }
  return { text: DELAY_TEXT_NORMAL, media: DELAY_MEDIA_NORMAL, group: GROUP_INTERVAL_NORMAL }
}

// Llamar cuando ocurre un 428 real (desde connection.update)
export function activateRecoveryMode(durationMs = 120000) {
  _rateLimitMode = 'recovery'
  _recoveryUntil = Date.now() + durationMs
  console.log(`🛡️ Modo recovery activado por ${Math.round(durationMs / 1000)}s — delays más lentos para evitar otro 428.`)
}

function enqueue(task, jid, hasMedia) { 
  if (queue.length >= MAX_QUEUE) {
    console.warn(`⚠️ Cola de mensajes llena (${MAX_QUEUE}). Descartando mensaje antiguo.`)
    queue.shift()
  }
  queue.push({ task, jid, hasMedia })
  run() 
}
async function run() {
  if (running) return
  running = true
  while (queue.length) {
    const { task, jid, hasMedia } = queue.shift()
    
    // Limpiar timestamps viejos
    const now = Date.now()
    while (globalSendTimestamps.length && globalSendTimestamps[0] < now - WINDOW) {
      globalSendTimestamps.shift()
    }
    
    // Adaptar modo según volumen
    const msgsInWindow = globalSendTimestamps.length
    if (msgsInWindow >= THRESHOLD_DANGER && _rateLimitMode !== 'recovery') {
      console.warn(`⚠️ ${msgsInWindow} msgs en 1min — pausando 8s para evitar 428...`)
      await new Promise(r => setTimeout(r, 8000))
    } else if (msgsInWindow >= THRESHOLD_CAUTION && _rateLimitMode === 'normal') {
      _rateLimitMode = 'cautious'
    } else if (msgsInWindow < THRESHOLD_CAUTION && _rateLimitMode === 'cautious') {
      _rateLimitMode = 'normal'
    }
    
    const delays = getDelays()
    
    // Throttle por grupo
    if (jid?.endsWith('@g.us')) {
      const last = groupLastSend.get(jid) || 0
      const elapsed = Date.now() - last
      if (elapsed < delays.group) {
        await new Promise(r => setTimeout(r, delays.group - elapsed))
      }
      groupLastSend.set(jid, Date.now())
    }
    
    try { 
      await task()
      globalSendTimestamps.push(Date.now())
    }
    catch (e) {
      const errorStr = String(e)
      if (errorStr.includes('rate-overlimit') || errorStr.includes('too many requests')) {
        console.warn('⚠️ Rate limit en sendMessage, activando recovery + pausando 15s...')
        activateRecoveryMode(180000) // 3 minutos en modo lento
        await new Promise(r => setTimeout(r, 15000))
        queue.unshift({ task, jid, hasMedia })
      } else if (errorStr.includes('Connection Closed') || errorStr.includes('stream errored')) {
        console.warn('⚠️ Stream caído, descartando mensaje en cola.')
      } else { 
        console.error('Send error:', e.message || e) 
      }
    }
    // Delay base + jitter pequeño
    const baseDelay = hasMedia ? delays.media : delays.text
    const jitter = Math.floor(Math.random() * 800) // 0-0.8s
    await new Promise(r => setTimeout(r, baseDelay + jitter))
  }
  running = false
}

export function patchSendMessage(client) {
  if (client._sendMessagePatched) return
  client._sendMessagePatched = true
  const original = client.sendMessage.bind(client)
  client.sendMessage = (jid, content, options = {}) => {
    // Detectar si el mensaje tiene media para ajustar el delay
    const hasMedia = !!(content?.image || content?.video || content?.audio || content?.document || content?.sticker)
    return new Promise((resolve) => enqueue(async () => resolve(await original(jid, content, options)), jid, hasMedia))
  }
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

// ✅ Control de desconexiones - v5 ANTI-DISCONNECT
const disconnectTracker = {
  lastDisconnect: 0,
  count: 0,
  maxDisconnectsPerMinute: 5,
  consecutive428: 0,
  consecutiveBadSession: 0,
  consecutive401: 0,
  consecutive515: 0,
  consecutive408: 0,
  consecutiveOther: 0,
  _reconnectTimer: null,
  _lastReasonCode: 0,
  _credsAutoSaveInterval: null // Interval para auto-save de credenciales
}

async function delayedReconnect(delayMs, reason = '') {
  // Cancelar timer anterior para evitar reconexiones duplicadas
  if (disconnectTracker._reconnectTimer) {
    clearTimeout(disconnectTracker._reconnectTimer)
    disconnectTracker._reconnectTimer = null
  }

  let finalDelay = delayMs

  // Solo aplicar throttle para errores que NO son 401 (401 es temporal y esperado en restarts)
  if (disconnectTracker._lastReasonCode !== 401) {
    const now = Date.now()
    const timeSinceLastDisconnect = now - disconnectTracker.lastDisconnect

    if (timeSinceLastDisconnect > 120000) {
      disconnectTracker.count = 0
    }

    disconnectTracker.count++
    if (disconnectTracker.count >= disconnectTracker.maxDisconnectsPerMinute) {
      finalDelay = Math.max(delayMs, 60000)
      log.warn(`🛑 Muchas desconexiones rápidas (${disconnectTracker.count}). Esperando ${Math.round(finalDelay / 1000)}s.`)
      disconnectTracker.count = 0
    }

    disconnectTracker.lastDisconnect = now
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
function purgePreKeys() {
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
  // Limpiar interval de auto-save anterior
  if (disconnectTracker._credsAutoSaveInterval) {
    clearInterval(disconnectTracker._credsAutoSaveInterval)
    disconnectTracker._credsAutoSaveInterval = null
  }

  // Cerrar conexión anterior si existe
  if (global.client) {
    try {
      global.client.ev.removeAllListeners()
      // 🔧 FIX v8: Usar end() para cerrar limpiamente (envía close frame al servidor).
      // ws.close() solo cierra el socket local, end() notifica al servidor de WA.
      try { global.client.end() } catch {}
    } catch {}
    global.client = null
    const lastReason = disconnectTracker._lastReasonCode
    const cleanupDelay = (lastReason === 515 || lastReason === 428) ? 3000 : 1500
    await new Promise(r => setTimeout(r, cleanupDelay))
  }

  // El ecosystem.config.cjs ya agrega restart_delay de 5s entre restarts de PM2
  // No agregar más delay aquí

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
  
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: "silent" })

  console.info = () => {}
  console.debug = () => {}

  const groupMetadataCache = new Map()

  const client = makeWASocket({
    version,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    markOnlineOnConnect: false,      // 🔧 FIX v6: false = evita conflicto de presencia con teléfono
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    retryRequestDelayMs: 500,        // 🔧 FIX v6: 500ms (más cercano al default de Baileys)
    getMessage: async (key) => {
      return undefined
    },
    keepAliveIntervalMs: 45000,      // 🔧 FIX v7: 45s = menos pings al servidor de WA (reduce tráfico)
    maxMsgRetryCount: 2,             // 🔧 FIX v7: 2 reintentos (3 genera más tráfico innecesario)
    connectTimeoutMs: 60000,         // 🔧 FIX v6: 60s (suficiente para VPS)
    defaultQueryTimeoutMs: undefined, // 🔧 FIX v7: undefined = sin timeout (evita reintentos internos que causan 428)
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
      
      // 🔧 FIX v5: Error 401 "Connection Failure" ≠ logout real.
      // Causa más común: PM2 reinició y WA aún tiene el socket anterior abierto.
      // NUNCA purgar sesión por "Connection Failure". Solo purgar si dice "logged out".
      if (reason === DisconnectReason.loggedOut) {
        disconnectTracker.consecutive401++
        disconnectTracker._lastReasonCode = 401
        const errorMsg = String(lastDisconnect?.error?.message || lastDisconnect?.error || '').toLowerCase()
        const isRealLogout = errorMsg.includes('logged out')
        
        // Guardar credenciales
        if (global._saveCreds) {
          try { await global._saveCreds() } catch {}
        }
        
        if (isRealLogout) {
          // ÚNICO caso donde purgamos: WA dice explícitamente "logged out"
          log.error(`❌ WhatsApp confirmó cierre de sesión. Se requiere nueva vinculación.`)
          purgeSession()
          disconnectTracker.consecutive401 = 0
          disconnectTracker.consecutiveBadSession = 0
          LOGIN_METHOD = await uPLoader()
          startBot()
        } else {
          // "Connection Failure" = temporal. Reintentar con backoff creciente.
          // Intento 5: restaurar backup por si los archivos se corrompieron
          if (disconnectTracker.consecutive401 === 5) {
            const restored = restoreSession()
            if (restored) {
              log.info('♻️ Intento 5: Backup de sesión restaurado.')
            }
          }
          
          // Después de 10 intentos SIN éxito, purgar como último recurso
          if (disconnectTracker.consecutive401 >= 10) {
            log.error(`❌ 10 intentos fallidos con 401. Purgando sesión como último recurso...`)
            purgeSession()
            disconnectTracker.consecutive401 = 0
            LOGIN_METHOD = await uPLoader()
            startBot()
            return
          }
          
          // Backoff rápido: 5s, 8s, 12s, 18s, 25s... max 30s
          const delay401 = Math.min(5000 + (disconnectTracker.consecutive401 - 1) * 5000, 30000)
          log.warn(`⚠️ 401 "Connection Failure" (intento ${disconnectTracker.consecutive401}/10). Reintentando en ${Math.round(delay401 / 1000)}s...`)
          console.log(chalk.gray('   (No es logout real, la sesión sigue válida. Esperando a que WA libere el socket anterior.)'))
          delayedReconnect(delay401, `Error 401 temporal - intento ${disconnectTracker.consecutive401}/10`)
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
        disconnectTracker._lastReasonCode = 428
        // Backoff progresivo: 30s, 60s, 2min, 5min, 10min (max)
        const backoff428Steps = [30000, 60000, 120000, 300000, 600000]
        const backoff428 = backoff428Steps[Math.min(disconnectTracker.consecutive428 - 1, backoff428Steps.length - 1)]
        console.log(chalk.yellow(`⚠️ Error 428: Rate limit. Esperando ${Math.round(backoff428 / 1000)}s (intento ${disconnectTracker.consecutive428})`))
        
        // Activar modo recovery en la cola de mensajes al reconectar
        // Duración: escala con los intentos (2min, 3min, 5min...)
        const recoveryDuration = Math.min(120000 + (disconnectTracker.consecutive428 - 1) * 60000, 600000)
        activateRecoveryMode(recoveryDuration)
        
        // Después de 7 intentos, esperar 30 minutos
        if (disconnectTracker.consecutive428 >= 7) {
          console.log(chalk.red('🛑 Demasiados 428 consecutivos. Esperando 30min antes de reintentar.'))
          setTimeout(() => {
            disconnectTracker.consecutive428 = 0
            startBot()
          }, 1800000)
          return
        }
        
        delayedReconnect(backoff428, 'Error 428 - Rate Limit')
      }
      // ERROR 515: Stream Errored (Muy común en VPS) - CON BACKOFF EXPONENCIAL
      else if (reason === 515) {
        disconnectTracker.consecutive515++
        disconnectTracker._lastReasonCode = 515
        // 🔧 FIX v2: Guardar credenciales antes de reconectar (previene 401 post-515)
        if (global._saveCreds) {
          try { await global._saveCreds() } catch {}
        }
        // Backoff exponencial más conservador: 20s, 40s, 80s, 160s, max 5min
        const backoff515 = Math.min(20000 * Math.pow(2, disconnectTracker.consecutive515 - 1), 300000)
        console.log(chalk.yellow(`⚠️ Error 515: Stream Errored (intento ${disconnectTracker.consecutive515}). Esperando ${Math.round(backoff515 / 1000)}s...`))
        
        // Después de 6 intentos consecutivos, esperar 15 minutos
        if (disconnectTracker.consecutive515 >= 6) {
          console.log(chalk.red('🛑 Demasiados 515 consecutivos. Esperando 15 minutos antes de reintentar.'))
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
      // ERROR 408: Timed Out (conexión perdida / keepalive sin respuesta)
      else if (reason === 408 || reason === DisconnectReason.timedOut) {
        disconnectTracker.consecutive408++
        disconnectTracker._lastReasonCode = 408
        // Guardar credenciales antes de reconectar
        if (global._saveCreds) {
          try { await global._saveCreds() } catch {}
        }
        // Backoff exponencial: 30s, 60s, 120s, 240s, max 5min
        const backoff408 = Math.min(30000 * Math.pow(2, disconnectTracker.consecutive408 - 1), 300000)
        console.log(chalk.yellow(`⚠️ Error 408: Timed Out (intento ${disconnectTracker.consecutive408}). Esperando ${Math.round(backoff408 / 1000)}s...`))
        
        // Después de 6 intentos consecutivos, esperar 15 minutos
        if (disconnectTracker.consecutive408 >= 6) {
          console.log(chalk.red('🛑 Demasiados 408 consecutivos. Esperando 15 minutos antes de reintentar.'))
          backupSession()
          disconnectTracker._reconnectTimer = setTimeout(() => {
            disconnectTracker._reconnectTimer = null
            disconnectTracker.consecutive408 = 0
            startBot()
          }, 900000) // 15 minutos
          return
        }
        
        delayedReconnect(backoff408, `Error 408 - Timed Out (intento ${disconnectTracker.consecutive408})`)
      }
      // OTROS ERRORES - con backoff para evitar loops
      else {
        disconnectTracker.consecutiveOther++
        disconnectTracker._lastReasonCode = reason
        const otherBackoff = Math.min(10000 * disconnectTracker.consecutiveOther, 120000)
        console.log(chalk.yellow(`⚠️ Desconexión detectada (${reason}). Reconectando en ${Math.round(otherBackoff / 1000)}s...`))
        delayedReconnect(otherBackoff, `Error ${reason}`)
      }
    }

    if (connection === "open") {
      // Resetear TODOS los contadores al conectar exitosamente
      disconnectTracker.consecutiveBadSession = 0
      disconnectTracker.consecutive401 = 0
      disconnectTracker.consecutiveOther = 0
      disconnectTracker._lastReasonCode = 0
      disconnectTracker.count = 0
      // 🔧 FIX v8: Resetear 515/428/408 inmediatamente al conectar (antes esperaba 5 min)
      // Si se desconectaba antes de 5 min, los contadores se acumulaban incorrectamente
      disconnectTracker.consecutive515 = 0
      disconnectTracker.consecutive428 = 0
      disconnectTracker.consecutive408 = 0
      
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
