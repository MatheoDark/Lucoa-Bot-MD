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

function purgeSession() {
  try {
    fs.rmSync(global.sessionName, { recursive: true, force: true })
    fs.mkdirSync(global.sessionName, { recursive: true })
    console.log(chalk.cyan("♻️ Sesión reiniciada manualmente."))
  } catch {}
}

function hasMainSession() {
  const credsPath = path.join(global.sessionName, 'creds.json')
  return fs.existsSync(credsPath)
}

async function loadDatabaseSafe() {
  global.db.data ||= {}
  global.db.data.users ||= {}
  global.db.data.chats ||= {}
  global.db.data.settings ||= {}
  global.db.data.sticker ||= {}

  try {
    if (typeof global.loadDatabase === "function") {
      await global.loadDatabase()
    } else if (db.read) {
      await db.read()
    }
  } catch (e) {
    console.error("Error cargando DB:", e)
  }

  if (db.write) {
    setInterval(async () => {
      if (global.db.data) await db.write()
    }, 30 * 1000)
  }
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
    setTimeout(loadBots, 60 * 1000)
    
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

// Anti Rate-Limit Mejorado
const queue = []
let running = false
const DELAY = 500 // ✅ Aumentado: 0ms → 500ms para evitar rate-limit de WhatsApp

function enqueue(task) { queue.push(task); run() }
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
        console.warn('⚠️ Rate limit detectado, esperando 3s...')
        await new Promise(r => setTimeout(r, 3000))
        queue.unshift(job)
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

// ✅ NUEVO: Control de desconexiones frecuentes (anti-spam)
const disconnectTracker = {
  lastDisconnect: 0,
  count: 0,
  maxDisconnectsPerMinute: 3,
  cooldownMs: 30000, // 30 segundos entre desconexiones
  consecutive428: 0   // Contador de 428 consecutivos para backoff
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
  if (!shouldReconnect()) {
    setTimeout(() => delayedReconnect(60000, reason), disconnectTracker.cooldownMs)
    return
  }
  
  console.log(`🔄 Reconectando en ${delayMs}ms... (${reason})`)
  setTimeout(() => startBot(), delayMs)
}

async function startBot() {
  await loadDatabaseSafe()

  const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: "silent" })

  console.info = () => {}
  console.debug = () => {}

  const client = makeWASocket({
    version,
    logger,
    // 🔥 CAMBIO VITAL: Usamos "Ubuntu" para que coincida con tu VPS y evitar error 515
    browser: ['Ubuntu', 'Chrome', '20.0.04'], 
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    // Configuración mejorada para evitar desconexiones
    retryRequestDelayMs: 10000, // Aumentado de 5000 a 10000ms
    getMessage: async () => "",
    keepAliveIntervalMs: 120000, // Aumentado de 60000 a 120000ms (2 minutos)
    maxRetries: 5, // Reintentos máximos
    fetchMessagesOnWS: false,
    downloadHistory: false,
    tcpConnectTimeoutMs: 30000
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
      
      // 🔥 PROTECCIÓN CONTRA EL BORRADO DE SESIÓN
      if (
        reason === DisconnectReason.badSession ||
        reason === DisconnectReason.loggedOut ||
        reason === DisconnectReason.multideviceMismatch
      ) {
        log.warn("⚠️ Sesión inválida. Reiniciando vinculación...")
        purgeSession()
        LOGIN_METHOD = await uPLoader()
        startBot()
      } 
      // ERROR 428: Connection Terminated (Rate limit de WhatsApp)
      else if (reason === 428) {
        disconnectTracker.consecutive428++
        // Backoff exponencial: 2min, 4min, 8min... max 10min
        const backoff428 = Math.min(120000 * Math.pow(2, disconnectTracker.consecutive428 - 1), 600000)
        console.log(chalk.yellow(`⚠️ Error 428: Límite de conexión alcanzado. Esperando ${Math.round(backoff428 / 1000)}s (intento ${disconnectTracker.consecutive428})`))
        delayedReconnect(backoff428, 'Error 428 - Rate Limit')
      }
      // ERROR 515: Stream Errored (Muy común en VPS)
      else if (reason === 515) {
        console.log(chalk.yellow("⚠️ Error 515: Stream Errored. Esperando para reconectar..."))
        delayedReconnect(15000, 'Error 515 - Stream Errored')
      } 
      // OTROS ERRORES
      else {
        console.log(chalk.yellow("⚠️ Desconexión detectada. Reconectando..."))
        delayedReconnect(10000, `Error ${reason}`)
      }
    }

    if (connection === "open") {
      // Reset 428 counter al conectar exitosamente
      disconnectTracker.consecutive428 = 0
      console.log(
        boxen(chalk.bold(' ¡CONECTADO! '), {
          borderStyle: 'round',
          borderColor: 'green',
          title: chalk.green.bold('● ONLINE ●'),
          titleAlignment: 'center',
          float: 'center'
        })
      )
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
  } else {
    LOGIN_METHOD = await uPLoader()
  }

  await startBot()
})()
