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
  console.log(chalk.red('⚠️ Error atrapado (Bot sigue vivo):'), err?.message)
  try {
    console.error(err?.stack || err)
  } catch (e) {
    console.error('⚠️ Error mostrando stack:', e?.message)
  }
})
process.on('unhandledRejection', (err) => {
  console.log(chalk.red('⚠️ Promesa rechazada (Bot sigue vivo):'), err?.message || err)
  try {
    console.error(err?.stack || err)
  } catch (e) {
    console.error('⚠️ Error mostrando stack (rejection):', e?.message)
  }
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
import loadCommandsAndPlugins from './lib/system/commandLoader.js'
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

function countLocalPreKeys() {
  try {
    if (!fs.existsSync(global.sessionName)) return 0
    return fs.readdirSync(global.sessionName).filter((f) => f.startsWith('pre-key-')).length
  } catch {
    return 0
  }
}

async function ensureSessionPreKeys(client, minLocal = 20, uploadCount = 30) {
  try {
    const before = countLocalPreKeys()
    if (before >= minLocal) {
      if (process.env.PREKEYS_DEBUG) {
        console.log(chalk.gray(`🔑 Pre-keys locales OK: ${before}`))
      }
      return
    }

    console.log(chalk.yellow(`🔧 Pre-keys bajas (${before}). Intentando recargar ${uploadCount} pre-keys...`))

    if (typeof client?.uploadPreKeys === 'function') {
      await client.uploadPreKeys(uploadCount)
    } else if (typeof client?.uploadPreKeysToServerIfRequired === 'function') {
      await client.uploadPreKeysToServerIfRequired()
    } else {
      console.log(chalk.red('⚠️ Este cliente de Baileys no expone uploadPreKeys.'))
      return
    }

    if (global._saveCreds) {
      await global._saveCreds()
    }

    const after = countLocalPreKeys()
    console.log(chalk.green(`✅ Pre-keys recargadas: ${before} -> ${after}`))
  } catch (e) {
    console.log(chalk.red(`⚠️ No se pudieron recargar pre-keys: ${e.message}`))
  }
}

  // 🔧 FIX v3: Detectar y reparar pre-keys desincronizados en 401
  async function repairPreKeySyncOn401(client) {
    try {
      const state = global.client?.authState
      if (!state?.creds) return
    
      const localCount = countLocalPreKeys()
      const nextPreKeyId = state.creds.nextPreKeyId || 1
      const expectedCount = Math.max(localCount, nextPreKeyId - 1)
    
      // Si hay mucha desincronización, intentar cargar pre-keys nuevos
      // (Esto fuerza a Baileys a recalcular y sincronizar)
      if (nextPreKeyId > 100 || (nextPreKeyId - localCount) > 20) {
        console.log(chalk.yellow(`⚠️ Desincronización de pre-keys detectada:`))
        console.log(chalk.yellow(`   - nextPreKeyId: ${nextPreKeyId}`))
        console.log(chalk.yellow(`   - Pre-keys locales: ${localCount}`))
        console.log(chalk.yellow(`   - Diferencia: ${nextPreKeyId - localCount}`))
        console.log(chalk.yellow(`\n🔧 Intentando resincronizar pre-keys del servidor...`))
      
        // Intenta recargar pre-keys para forzar sincronización
        if (typeof client?.uploadPreKeysToServerIfRequired === 'function') {
          await client.uploadPreKeysToServerIfRequired()
          console.log(chalk.green(`✅ Resincronización de pre-keys completada`))
        }
      
        if (global._saveCreds) {
          await global._saveCreds()
        }
      }
    } catch (e) {
      console.log(chalk.gray(`ℹ️ No se pudo reparar pre-keys (esperado): ${e.message}`))
    }
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

// Queue simple (estilo Megumin/Nekos) — manejar rate-limits con delays variables
const queue = []
let running = false
const DELAY_NORMAL = 800
const DELAY_AFTER_RATELIMIT = 5000
let lastWasRateLimit = false

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
    msg.includes('connection closed') ||
    msg.includes('connection failure') ||
    msg.includes('not connected') ||
    msg.includes('stream errored out') ||
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
        // Si es rate-overlimit, marcar para usar delay más largo después
        if (errMsg.toLowerCase().includes('rate-overlimit') || errMsg.toLowerCase().includes('too many requests')) {
          lastWasRateLimit = true
        }
        await new Promise(r => setTimeout(r, wait))
        queue.unshift(job)
      } else {
        console.error('Send error:', e.message || e)
        if (job.reject) job.reject(e)
      }
    }
    const sleepDelay = lastWasRateLimit ? DELAY_AFTER_RATELIMIT : DELAY_NORMAL
    // Después de esperar una vez con delay largo, resetear la bandera
    if (lastWasRateLimit) lastWasRateLimit = false
    await new Promise(r => setTimeout(r, sleepDelay))
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

// 🔧 FIX v10: Validar salud de sesión antes de reconectar
function validateSessionHealth() {
  try {
    const credsPath = path.join(global.sessionName, 'creds.json')
    if (!fs.existsSync(credsPath)) {
      console.log(chalk.yellow('⚠️ creds.json no existe (sesión nueva)'))
      return { healthy: true, isNew: true }
    }
    
    const content = fs.readFileSync(credsPath, 'utf8')
    const creds = JSON.parse(content)
    
    const checks = {
      hasMe: !!creds.me,
      hasNoiseKey: !!creds.noiseKey,
      hasSignedIdentityKey: !!creds.signedIdentityKey,
      hasPairingKey: !!creds.pairingEphemeralKeyPair,
      hasRegistrationId: Number.isFinite(creds.registrationId),
      validNextPreKeyId: Number.isFinite(creds.nextPreKeyId) && creds.nextPreKeyId > 0,
      isRegistered: creds.registered === true
    }

    // Los campos criptográficos sí son críticos. hasMe/isRegistered pueden recuperarse tras handshake.
    const hardChecks = {
      hasNoiseKey: checks.hasNoiseKey,
      hasSignedIdentityKey: checks.hasSignedIdentityKey,
      hasPairingKey: checks.hasPairingKey,
      hasRegistrationId: checks.hasRegistrationId,
      validNextPreKeyId: checks.validNextPreKeyId
    }

    const healthy = Object.values(hardChecks).every(v => v === true)
    
    if (!healthy) {
      console.log(chalk.yellow('⚠️ Salud de sesión:'))
      Object.entries(checks).forEach(([key, value]) => {
        const icon = value ? '✓' : '✗'
        const color = value ? chalk.green : chalk.red
        console.log(color(`   ${icon} ${key}`))
      })
    }
    
    return { healthy, checks }
  } catch (e) {
    console.log(chalk.red(`❌ Error validando sesión: ${e.message}`))
    return { healthy: false, error: e.message }
  }
}

// Ejecutar validación cada vez que startBot se llama
global.validateSessionHealth = validateSessionHealth
let _saveCredsQueue = Promise.resolve()

function queueCredsSave(saveCreds) {
  _saveCredsQueue = _saveCredsQueue
    .then(async () => {
      if (!saveCreds) return
      await saveCreds()
    })
    .catch((e) => {
      console.log(chalk.red(`⚠️ Error en cola de credenciales: ${e.message}`))
    })
  return _saveCredsQueue
}

async function saveCredsWithValidation(saveCreds) {
  try {
    if (!saveCreds) return

    // Serializar escrituras de creds para evitar corrupción por escrituras concurrentes.
    await queueCredsSave(saveCreds)
    
    // ⚠️ NO validar post-escritura (causaba "Unexpected end of JSON input")
    // Baileys escribe de forma atómica, confiamos en eso.
    if (process.env.CREDS_DEBUG) console.log(chalk.gray('✓ Credenciales guardadas'))
  } catch (e) {
    console.log(chalk.red(`⚠️ Error guardando credenciales: ${e.message}`))
    // No llamar a log.error para evitar recursión
  }
}

// Sistema comprimido de tracker de credenciales
const disconnectTracker = {
  _reconnectTimer: null,
  _credsAutoSaveInterval: null,
  consecutive428: 0,
  consecutive401: 0,
  consecutive440: 0,
  last428Time: 0,
  last401Time: 0,
  last440Time: 0,
  forcedRelinkAt: 0,
  failureTimestamps: []  // Para detectar patrón de fallos rápidos
}

const MAX_401_BEFORE_RELINK = 10
const RESET_401_COUNTER_MS = 120000  // 2 minutos para detectar sesión corrupta más rápido
const RELINK_COOLDOWN_MS = 10 * 60 * 1000

function shouldForceRelinkOn401() {
  const now = Date.now()
  
  // Resetear contador si pasó más de 2 minutos sin errores (sesión se recuperó)
  if (now - disconnectTracker.last401Time > RESET_401_COUNTER_MS) {
    disconnectTracker.consecutive401 = 0
  }
  
  disconnectTracker.consecutive401 += 1
  disconnectTracker.last401Time = now
  
  // 🔧 FIX: Forzar relink cuando hay MÁS de 10 errores 401 en 2 minutos
  // Esto indica que la sesión está REALMENTE corrupta, no es un problema temporal de red
  // Umbral bajado a 10 para detectar sesiones inválidas más rápidamente
  // (ej: registered=false, nextPreKeyId corrupto, etc)
  if (disconnectTracker.consecutive401 > MAX_401_BEFORE_RELINK) {
    return true
  }
  
  return false
}

// ⚠️ IMPORTANTE: Circuit Breaker para bucles infinitos
// Si hay 5+ fallos en 30 segundos, entra en "modo espera" exponencial
function updateFailurePattern(errorType) {
  const now = Date.now()
  disconnectTracker.failureTimestamps.push(now)
  
  // Limpiar timestamps más antiguos de 30s
  disconnectTracker.failureTimestamps = disconnectTracker.failureTimestamps.filter(
    ts => now - ts < 30000
  )
  
  const recentFailures = disconnectTracker.failureTimestamps.length
  
  if (recentFailures >= 5) {
    // Espera exponencial: 10s, 20s, 40s, 80s... máximo 2 min
    const timeInCircuitBreaker = Math.min(
      Math.pow(2, recentFailures - 5) * 10000,
      120000
    )
    log.error(`🛑 CIRCUIT BREAKER ACTIVADO: ${recentFailures} fallos en 30s`)
    log.error(`⏳ Esperando ${Math.round(timeInCircuitBreaker / 1000)}s antes de reintentar...`)
    log.error(`💡 Consejo: Revisa que el número NO esté conectado en otro dispositivo/navegador`)
    return timeInCircuitBreaker
  }
  
  return null  // Sin circuit breaker
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
  
  let finalDelay = delayMs
  
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

// Monitoreo de pre-keys (sin podado automático).
// Evitamos borrar pre-keys porque puede romper handshakes pendientes y causar 401/515.
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
      console.log(chalk.yellow('⚠️ Purga de pre-keys deshabilitada por seguridad de sesión.'))
      return
    }

    if (files.length < 20) {
      console.log(chalk.yellow(`⚠️ Pre-keys bajas: ${files.length}. Recomendado: 30+`))
      return
    }

    if (process.env.PREKEYS_DEBUG) {
      if (files.length > 1500) {
        console.log(chalk.gray(`ℹ️ Pre-keys altas: ${files.length} (sin purga automática)`))
      }
    }
  } catch (e) {
    console.log(chalk.red(`❌ Error limpiando pre-keys: ${e.message}`))
  }
}
setInterval(purgePreKeys, 60 * 60 * 1000) // Solo monitoreo cada 60 minutos

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

  // 🔧 FIX v10: Validar salud de sesión ANTES de intentar cargar credenciales
  const sessionHealth = validateSessionHealth()
  if (!sessionHealth.healthy && !sessionHealth.isNew) {
    console.log(chalk.red('⚠️ Sesión en estado anómalo. Intentando reparar...'))
  }

  let { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
  
  // Cachear la versión de Baileys para evitar llamadas repetidas que pueden contribuir
  // a rate limits cuando el bot se reinicia frecuentemente.
  let version
  try {
    const now = Date.now()
    if (!global._baileysVersionCache || (now - global._baileysVersionCache.ts) > 60 * 60 * 1000) {
      const vobj = await fetchLatestBaileysVersion()
      global._baileysVersionCache = { ts: now, version: vobj.version }
    }
    version = global._baileysVersionCache.version
  } catch (e) {
    // Si falla, caer en la versión por defecto que Baileys elija internamente
    console.log(chalk.yellow('⚠️ No se pudo obtener la versión más reciente de Baileys, usando fallback.'))
    version = undefined
  }
  const logger = pino({ level: "silent" })

  console.info = () => {}
  console.debug = () => {}
  
  // 🔧 Mostrar información de cuenta para debugging
  if (state.creds.me) {
    console.log(chalk.cyan(`📱 Cuenta vinculada: ${state.creds.me.name || 'Sin nombre'}`))
    console.log(chalk.cyan(`   ID: ${state.creds.me.id.substring(0, 25)}...`))
    console.log(chalk.cyan(`   Pre-keys disponibles: ${fs.readdirSync(global.sessionName).filter(f => f.startsWith('pre-key-')).length}`))
    console.log(chalk.cyan(`   nextPreKeyId: ${state.creds.nextPreKeyId}\n`))
  }

  const groupMetadataCache = new Map()

  const client = makeWASocket({
    version,
    logger,
    browser: Browsers.macOS('Chrome'),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    getMessage: async () => '',
    keepAliveIntervalMs: 45000,
    maxIdleTimeMs: 60000,
    shouldIgnoreJid: (jid) => jid?.endsWith('@broadcast') || jid === 'status@broadcast',
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
  global._saveCreds = () => saveCredsWithValidation(saveCreds)
  
  // Guardar credenciales cada vez que cambien (muy importante para mantener sesión viva)
  client.ev.on("creds.update", async () => {
    if (process.env.CREDS_DEBUG) console.log(chalk.gray('[CREDS] Cambios detectados, guardando...'))
    await saveCredsWithValidation(saveCreds)
  })

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
      const reason =
        lastDisconnect?.error?.output?.statusCode ||
        lastDisconnect?.error?.data?.statusCode ||
        lastDisconnect?.reason ||
        0
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
      // Configuración de Purga automatica para cuando sabemos que la sesión está inservible
      else if (reason === DisconnectReason.badSession || reason === DisconnectReason.multideviceMismatch) {
        log.error(`⚠️ Sesión corrupta o desajuste Multidispositivo (${reason}). Purgando sesión para prevenir loops...`)
        purgeSession()
        LOGIN_METHOD = await uPLoader()
        requestBotRestart(3000, `borrado por ${reason}`)
      }
      else if (reason === DisconnectReason.connectionReplaced) {
        const now = Date.now()
        if (now - disconnectTracker.last440Time < 60000) {
          disconnectTracker.consecutive440++
        } else {
          disconnectTracker.consecutive440 = 1
        }
        disconnectTracker.last440Time = now

        const delay = disconnectTracker.consecutive440 >= 3 ? 120000 : 30000
        log.warn(`⚠️ Conexión reemplazada por otra sesión (440). Reintentando en ${Math.round(delay / 1000)}s...`)
        log.warn('💡 Cierra WhatsApp Web/sesiones activas duplicadas para estabilizar la conexión.')
        requestBotRestart(delay, '440 connectionReplaced')
      }
      else if (reason === DisconnectReason.forbidden) {
        log.error("❌ Conexión prohibida. Purgando sesión...")
        purgeSession()
        LOGIN_METHOD = await uPLoader()
        requestBotRestart(3000, 'forbidden con sesión purgada')
      }
      else if (reason === 428) {
        // Rate limit normal por reconexiones de Baileys
        log.warn(`⚠️ Reconectando para estabilizar... (428)`)
        requestBotRestart(5000, 'rate limit 428')
      }
      else if (reason === 515) {
        // Stream error (normal en whatsapp)
        log.warn(`⚠️ Sincronizando con WhatsApp... (515)`)
        requestBotRestart(5000, '515 Stream Errored')
      }
      else {
        // Todos los demás errores
        log.warn(`⚠️ Desconexión (${reason}). Reconectando...`)
        requestBotRestart(4000, `desconexión ${reason}`)
      }
    }

    if (connection === "open") {
      // ✅ CONEXIÓN EXITOSA - Resetear TODOS los contadores
      disconnectTracker.consecutive428 = 0
      disconnectTracker.consecutive401 = 0
      disconnectTracker.consecutive440 = 0
      disconnectTracker.last401Time = 0
      disconnectTracker.last440Time = 0
        // 🔧 NUEVO: Intento temprano de reparación en 5+ errores
        if (disconnectTracker.consecutive401 === 5) {
          console.log(chalk.yellow(`🔧 [INTENTO 1] Reparando pre-keys tras 5 errores 401...`))
          repairPreKeySyncOn401(global.client).catch(e => console.log(chalk.gray(`  Reparación 1: ${e.message}`)))
        }
        
        if (disconnectTracker.consecutive401 === 7) {
          console.log(chalk.yellow(`🔧 [INTENTO 2] Reparando pre-keys tras 7 errores 401...`))
          repairPreKeySyncOn401(global.client).catch(e => console.log(chalk.gray(`  Reparación 2: ${e.message}`)))
        }
      disconnectTracker.failureTimestamps = []  // Resetear circuit breaker
      
      // Limpiar timer si aún existe
      if (disconnectTracker._reconnectTimer) {
        clearTimeout(disconnectTracker._reconnectTimer)
        disconnectTracker._reconnectTimer = null
      }
      
      // Backup de sesión al conectar
      backupSession()

      // 🔧 FIX v11: Auto-save cada 5 minutos SOLO (no cada 3) para evitar JSON corruption
      // Baileys maneja creds.update internamente, no necesitamos guardar tan frecuente
      if (disconnectTracker._credsAutoSaveInterval) {
        clearInterval(disconnectTracker._credsAutoSaveInterval)
      }
      disconnectTracker._credsAutoSaveInterval = setInterval(async () => {
        if (global._saveCreds) {
          try {
            await global._saveCreds()
          } catch (e) {
            console.log(chalk.red(`⚠️ Error en auto-save: ${e.message}`))
          }
        }
      }, 5 * 60 * 1000) // Cada 5 minutos (era 3)
      
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

      // Cargar comandos y plugins SOLO una vez tras conexión estable
      try {
        if (!global.commandsLoaded) {
          console.log(chalk.cyan('🔌 Cargando comandos y plugins (post-Open)...'))
          await loadCommandsAndPlugins()
          global.commandsLoaded = true
          console.log(chalk.green('✅ Comandos y plugins cargados.'))
        }
      } catch (e) {
        console.error(chalk.red('❌ Error cargando comandos en post-open:'), e)
      }

      // 🎁 Iniciar scheduler de drops aleatorios
      startDropScheduler(client)

      // 🐉 Auto-actualizar estado de WhatsApp con uptime y estética Lucoa
      if (disconnectTracker._statusInterval) clearInterval(disconnectTracker._statusInterval)
      if (disconnectTracker._statusTimeout) clearTimeout(disconnectTracker._statusTimeout)
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
      disconnectTracker._statusTimeout = setTimeout(updateBotStatus, 120000) // Se envía a los 2 minutos, no de inmediato
      disconnectTracker._statusInterval = setInterval(updateBotStatus, 30 * 60 * 1000) // Cada 30 mins
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
