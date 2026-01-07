import "./settings.js"
import handler from "./main.js"
import events from "./commands/events.js"

import {
  Browsers,
  makeWASocket,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  jidDecode,
  DisconnectReason,
} from "@whiskeysockets/baileys"

import cfonts from "cfonts"
import pino from "pino"
import chalk from "chalk"
import fs from "fs"
import path from "path"
import boxen from "boxen"
import readline from "readline"
import os from "os"
import qrcode from "qrcode-terminal"
import { smsg } from "./lib/message.js"
import db from "./lib/system/database.js"
import { startSubBot } from "./lib/subs.js"
import { exec } from "child_process"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const log = {
  info: (msg) => console.log(chalk.bgBlue.white.bold("INFO"), chalk.white(msg)),
  success: (msg) => console.log(chalk.bgGreen.white.bold("SUCCESS"), chalk.greenBright(msg)),
  warn: (msg) => console.log(chalk.bgYellowBright.blueBright.bold("WARNING"), chalk.yellow(msg)),
  warning: (msg) => console.log(chalk.bgYellowBright.red.bold("WARNING"), chalk.yellow(msg)),
  error: (msg) => console.log(chalk.bgRed.white.bold("ERROR"), chalk.redBright(msg)),
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) =>
  new Promise((resolve) => rl.question(text, (answer) => resolve(answer.trim())))

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

/** Detecta sesión por defecto si settings.js no la define */
function ensureSessionName() {
  if (global.sessionName) return

  const candidates = [
    path.join(__dirname, "Sessions", "Lucoa-Session"),
    path.join(__dirname, "Sessions", "Owner"),
    path.join(__dirname, "Sessions"),
  ]
  global.sessionName = candidates.find((p) => fs.existsSync(p)) || candidates[0]
  fs.mkdirSync(global.sessionName, { recursive: true })
}

function purgeSession() {
  try {
    fs.rmSync(global.sessionName, { recursive: true, force: true })
  } catch {}
  fs.mkdirSync(global.sessionName, { recursive: true })
}

/** DB safe init: evita global.db undefined dentro de smsg() */
async function loadDatabaseSafe() {
  global.db = db

  // Si su proyecto ya define global.loadDatabase en settings.js, úselo
  if (typeof global.loadDatabase === "function") {
    try {
      await global.loadDatabase()
    } catch (e) {
      log.warn(`Fallo global.loadDatabase(): ${e?.message || e}`)
    }
  }

  // Fallback mínimo (LowDB / similares)
  try {
    if (typeof db.read === "function") await db.read()
  } catch {}

  db.data ||= {}
  db.data.users ||= {}
  db.data.chats ||= {}
  db.data.settings ||= {}
  db.data.stats ||= {}
  db.data.msgs ||= {}
  db.data.sticker ||= {}

  // Guardado periódico si existe write()
  if (typeof db.write === "function") {
    setInterval(async () => {
      try {
        if (db?.data) await db.write()
      } catch {}
    }, 30_000).unref?.()
  }
}

export async function uPLoader() {
  // Para PM2 / modo no interactivo: forzamos QR
  console.log(chalk.yellow.bold("\nModo Automático activado (PM2). Generando QR...\n"))
  return "1" // 1 = QR, 2 = Pairing-code
}

const BOT_TYPES = [{ name: "SubBot", folder: "./Sessions/Subs", starter: startSubBot }]
const reconnecting = new Set()
global.conns = global.conns || []

async function loadBots() {
  for (const { folder, starter } of BOT_TYPES) {
    if (!fs.existsSync(folder)) continue
    const botIds = fs.readdirSync(folder)

    for (const userId of botIds) {
      const sessionPath = path.join(folder, userId)
      const credsPath = path.join(sessionPath, "creds.json")
      if (!fs.existsSync(credsPath)) continue
      if (global.conns.some((conn) => conn.userId === userId)) continue
      if (reconnecting.has(userId)) continue

      try {
        reconnecting.add(userId)
        await starter(null, null, "Auto reconexión", false, userId, sessionPath)
      } catch (e) {
        reconnecting.delete(userId)
      }

      await new Promise((res) => setTimeout(res, 2500))
    }
  }

  setTimeout(loadBots, 60 * 1000)
}

function hasMainSession() {
  const credsPath = path.join(global.sessionName, "creds.json")
  if (!fs.existsSync(credsPath)) return false
  try {
    const creds = JSON.parse(fs.readFileSync(credsPath))
    return !!creds.registered
  } catch {
    return false
  }
}

// --- Queue sendMessage (anti rate) ---
const queue = []
let running = false
const DELAY = 800

function enqueue(task) {
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
    } catch (e) {
      if (String(e).includes("rate-overlimit")) {
        console.log("⚠️ Rate limit detectado, reintentando…")
        await new Promise((r) => setTimeout(r, 2000))
        queue.unshift(job)
      } else {
        console.error("Send error:", e)
      }
    }
    await new Promise((r) => setTimeout(r, DELAY))
  }

  running = false
}

export function patchSendMessage(client) {
  if (client._sendMessagePatched) return
  client._sendMessagePatched = true

  const original = client.sendMessage.bind(client)
  client.sendMessage = (jid, content, options = {}) =>
    new Promise((resolve) => {
      enqueue(async () => resolve(await original(jid, content, options)))
    })
}

let LOGIN_METHOD = null

async function startBot() {
  ensureSessionName()
  await loadDatabaseSafe()

  const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: "silent" })

  const client = makeWASocket({
    version,
    logger,
    browser: Browsers.macOS("Chrome"),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    getMessage: async () => "",
    keepAliveIntervalMs: 45000,
    maxIdleTimeMs: 60000,
  })

  patchSendMessage(client)
  global.client = client

  client.ev.on("creds.update", saveCreds)

  // Pairing-code (opcional)
  if (!client.authState.creds.registered && LOGIN_METHOD === "2") {
    console.clear()
    console.log(
      chalk.bold.redBright("\nIngrese su número de WhatsApp\n") +
        chalk.yellowBright("Ejemplo: +57301XXXXXXX\n"),
    )

    const fixed = await question(chalk.magentaBright("➤ Número: "))
    const phoneNumber = normalizePhoneForPairing(fixed)

    try {
      const pairing = await client.requestPairingCode(phoneNumber)
      console.log(
        chalk.bgMagenta.white.bold("\n CÓDIGO DE VINCULACIÓN ") +
          "\n\n" +
          chalk.white.bold(pairing) +
          "\n",
      )
    } catch (err) {
      console.log(chalk.red("❌ Error al generar código"))
      purgeSession()
      process.exit(1)
    }
  }

  client.sendText = (jid, text, quoted = "", options) =>
    client.sendMessage(jid, { text, ...options }, { quoted })

  client.ev.on("connection.update", async (update) => {
    const { qr, connection, lastDisconnect, isNewLogin, receivedPendingNotifications } = update

    if (qr && LOGIN_METHOD === "1") {
      console.clear()
      console.log(chalk.cyan.bold("📸 ESCANEA ESTE CÓDIGO QR\n"))
      qrcode.generate(qr, { small: true })
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode || 0

      if (
        reason === DisconnectReason.connectionLost ||
        reason === DisconnectReason.connectionClosed ||
        reason === DisconnectReason.restartRequired ||
        reason === DisconnectReason.timedOut
      ) {
        log.warning("Conexión cerrada, intentando reconectarse…")
        return startBot()
      }

      if (reason === DisconnectReason.badSession) {
        log.warning("BadSession: eliminando sesión y reiniciando…")
        purgeSession()
        return startBot()
      }

      if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.forbidden) {
        log.warning("Sesión cerrada/loggedOut: eliminando sesión para volver a escanear…")
        purgeSession()
        process.exit(1) // PM2 reinicia
      }

      if (reason === DisconnectReason.multideviceMismatch) {
        log.warning("Multi-device mismatch: reinicie vinculando nuevamente.")
        purgeSession()
        process.exit(1)
      }

      client.end(`Desconexión desconocida: ${reason}|${connection}`)
    }

    if (connection === "open") {
      console.log(
        boxen(chalk.bold(" ¡CONECTADO CON WHATSAPP! "), {
          borderStyle: "round",
          borderColor: "green",
          title: chalk.green.bold("● CONEXIÓN ●"),
          titleAlignment: "center",
          float: "center",
        }),
      )
    }

    if (isNewLogin) log.info("Nuevo dispositivo detectado")

    if (receivedPendingNotifications === "true") {
      log.warn("Por favor espere aproximadamente 1 minuto…")
      client.ev.flush()
    }
  })

  // Decode JID helper
  client.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {}
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid
    }
    return jid
  }

  // Inicializar events una vez (si su módulo lo hace)
  try {
    await events(client)
  } catch (err) {
    console.log(chalk.gray(`[ BOT ] → events(): ${err?.message || err}`))
  }

  // Mensajes
  client.ev.on("messages.upsert", async ({ messages, type }) => {
    try {
      let m = messages?.[0]
      if (!m?.message) return

      m.message =
        Object.keys(m.message)[0] === "ephemeralMessage"
          ? m.message.ephemeralMessage.message
          : m.message

      if (m.key?.remoteJid === "status@broadcast") return
      if (!client.public && !m.key.fromMe && type === "notify") return
      if (m.key?.id?.startsWith("BAE5") && m.key.id.length === 16) return

      // ✅ aquí ya existe global.db.data
      m = await smsg(client, m)
      handler(client, m, { messages, type })
    } catch (err) {
      console.log(err)
    }
  })
}

// --- Boot ---
;(async () => {
  // Sub-bots
  loadBots().catch(() => {})

  ensureSessionName()
  await loadDatabaseSafe()
  console.log(chalk.gray("[ ✿ ] Base de datos cargada correctamente."))

  const hasSession = hasMainSession()
  LOGIN_METHOD = hasSession ? null : await uPLoader()

  await startBot()
})()
