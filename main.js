/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🐉 LUCOA-BOT-MD v3.0.0 - Handler Principal
 * ═══════════════════════════════════════════════════════════════════════════
 * Basado en Megumin-Bot-MD v3.0.0
 * Arquitectura moderna con export default { command, run }
 *
 * @author MatheoDark
 * @version 3.0.0
 * ═══════════════════════════════════════════════════════════════════════════
 */

import moment from 'moment-timezone'
import chalk from 'chalk'
import gradient from 'gradient-string'
import loadCommandsAndPlugins from './lib/system/commandLoader.js'
import initDB from './lib/system/initDB.js'
import { resolveLidToRealJid } from './lib/utils.js'

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN GLOBAL
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = Object.freeze({
  DEFAULT_PREFIXES: ['/', '#', '.'],
  DEFAULT_BOT_NAME: 'Lucoa-Bot 🐉',
  DEFAULT_PUSHNAME: 'Sin nombre',
  TIMEZONE: 'America/Santiago',
  VERSION: '3.0.0',
  // Permitir ejecutar comandos desde el mismo número del bot SOLO si eres owner:
  ALLOW_FROM_ME_FOR_OWNERS: true
})

const ERROR_MESSAGES = Object.freeze({
  owner: (cmd) => `ꕥ El comando *${cmd}* solo puede ser ejecutado por mi Creador (MatheoDark).`,
  moderation: (cmd) => `ꕥ El comando *${cmd}* solo puede ser ejecutado por los moderadores.`,
  admin: (cmd) => `ꕥ El comando *${cmd}* solo puede ser ejecutado por los Administradores del Grupo.`,
  botAdmin: (cmd) => `ꕥ El comando *${cmd}* solo puede ser ejecutado si yo soy Administradora del Grupo.`,
  notFound: (cmd, prefix) =>
    `ꕤ El comando *${cmd}* no existe.\n✎ Usa *${prefix}help* para ver la lista de comandos disponibles.`
})

// Cache para prefijos (evita recalcular en cada mensaje)
const prefixCache = new Map()

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

function ensureUserId(client) {
  const raw =
    client?.user?.id ||
    client?.user?.jid ||
    client?.authState?.creds?.me?.id ||
    client?.authState?.creds?.me?.jid

  if (!raw) return null

  const cleaned = String(raw).replace(/:\d+/, '')
  const jid = cleaned.includes('@') ? cleaned : `${cleaned}@s.whatsapp.net`

  client.user = client.user || {}
  client.user.id = jid
  return jid
}

function normalizeToJid(phone) {
  if (!phone) return null
  const base = typeof phone === 'number' ? phone.toString() : String(phone).replace(/\D/g, '')
  return base ? `${base}@s.whatsapp.net` : null
}

function extractNumber(jid) {
  return String(jid || '').split('@')[0].replace(/\D/g, '')
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getOwnerNumbers() {
  return (global.owner || [])
    .map((o) => (Array.isArray(o) ? o[0] : o))
    .map((n) => extractNumber(n))
    .filter(Boolean)
}

function checkIsOwner(senderJid, ownerNumbers) {
  return ownerNumbers.includes(extractNumber(senderJid))
}

// ═══════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN DE BASE DE DATOS
// ═══════════════════════════════════════════════════════════════════════════

function initializeDBStructure() {
  global.db = global.db || { data: {} }
  global.db.data = global.db.data || {}
  global.db.data.chats = global.db.data.chats || {}
  global.db.data.users = global.db.data.users || {}
  global.db.data.settings = global.db.data.settings || {}
}

function updateUserStats(sender, pushname, command) {
  global.db.data.users = global.db.data.users || {}
  const user = (global.db.data.users[sender] ||= {})

  user.name = (pushname || CONFIG.DEFAULT_PUSHNAME).trim()
  user.usedcommands = (user.usedcommands || 0) + 1
  user.exp = (user.exp || 0) + Math.floor(Math.random() * 100)
  user.lastCommand = command
  user.lastSeen = new Date()
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLUCIÓN DE JIDs (LID → JID Real)
// ═══════════════════════════════════════════════════════════════════════════

async function resolveMessageJids(m, client) {
  const chatId = m.chat
  const isGroup = chatId?.endsWith('@g.us')
  if (!isGroup) return

  if (m.sender) {
    const realSender = await resolveLidToRealJid(m.sender, client, chatId)
    if (realSender) m.sender = realSender
  }

  if (m.key?.participant) {
    const realParticipant = await resolveLidToRealJid(m.key.participant, client, chatId)
    if (realParticipant) m.key.participant = realParticipant
  }

  if (Array.isArray(m.mentionedJid) && m.mentionedJid.length > 0) {
    const resolved = await Promise.all(
      m.mentionedJid.map((jid) => resolveLidToRealJid(jid, client, chatId))
    )
    m.mentionedJid = m.mentionedJid.map((jid, i) => resolved[i] || jid)
  }
}

async function getResolvedGroupAdmins(metadata, client, chatId) {
  if (!metadata?.participants) return []

  const adminPromises = metadata.participants
    .filter((p) => p.admin)
    .map(async (p) => {
      const realJid = await resolveLidToRealJid(p.id, client, chatId)
      return realJid || p.id
    })

  return Promise.all(adminPromises)
}

// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA DE LOGGING
// ═══════════════════════════════════════════════════════════════════════════

function logMessage({ pushname, sender, isGroup, groupName, from, command }) {
  const h = chalk.bold.blue('★━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━★')
  const v = chalk.bold.white('┃ ')
  const time = moment().tz(CONFIG.TIMEZONE).format('DD/MM/YY HH:mm:ss')

  const lines = [
    '',
    h,
    chalk.bold.yellow(`${v}📅 Fecha: ${chalk.whiteBright(time)}`),
    chalk.bold.blueBright(`${v}👤 Usuario: ${chalk.whiteBright(pushname)}`),
    chalk.bold.magentaBright(`${v}📱 Remitente: ${gradient('deepskyblue', 'darkorchid')(sender)}`)
  ]

  if (isGroup) {
    lines.push(chalk.bold.cyanBright(`${v}💬 Grupo: ${chalk.greenBright(groupName)}`))
    lines.push(chalk.bold.cyanBright(`${v}🆔 ID: ${gradient('violet', 'midnightblue')(from)}`))
  } else {
    lines.push(chalk.bold.greenBright(`${v}💬 Chat privado`))
  }

  if (command) {
    lines.push(chalk.bold.redBright(`${v}⚡ Comando: ${chalk.yellowBright(command)}`))
  }

  lines.push(h)
  console.log(lines.join('\n'))
}

// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA DE MIDDLEWARES Y PLUGINS
// ═══════════════════════════════════════════════════════════════════════════

async function runGlobalMiddlewares(type, m, client, isOwner = false) {
  const middlewares = global.middlewares?.[type]
  if (!middlewares?.length) return false

  for (const middleware of middlewares) {
    try {
      const stop = await middleware(m, { client })
      if (stop === true && type === 'before' && !isOwner) return true
      if (stop === true && type === 'after') return true
    } catch (err) {
      console.error(chalk.red(`❌ Error en middleware ${type.toUpperCase()}:`), err)
    }
  }
  return false
}

async function runPluginHooks(hookName, client, m, options = {}, isOwner = false) {
  for (const name in global.plugins) {
    const plugin = global.plugins[name]
    const hook = plugin?.[hookName]
    if (typeof hook !== 'function') continue

    try {
      const result = await hook.call(client, m, { client, ...options })
      if (hookName === 'before' && result === true && !isOwner) return true
    } catch (err) {
      console.error(chalk.red(`❌ Error en plugin.${hookName} -> ${name}:`), err)
    }
  }
  return false
}

// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA DE COMANDOS
// ═══════════════════════════════════════════════════════════════════════════

function buildPrefixRegex(selfId) {
  const settings = global.db.data.settings?.[selfId] || {}
  const rawPrefijo = settings.prefijo || ''
  const botname = settings.namebot2 || CONFIG.DEFAULT_BOT_NAME

  const cacheKey = `${selfId}:${JSON.stringify(rawPrefijo)}:${botname}`
  const cached = prefixCache.get(cacheKey)
  if (cached) return cached

  const prefas = Array.isArray(rawPrefijo)
    ? rawPrefijo
    : rawPrefijo
      ? [rawPrefijo]
      : CONFIG.DEFAULT_PREFIXES

  const firstWord = botname.split(' ')[0]
  const shortForms = [botname.charAt(0), firstWord, firstWord.slice(0, 2), firstWord.slice(0, 3)].filter(Boolean)

  const prefixes = [botname, ...shortForms]
  const prefijosEscapados = prefas.map(escapeRegExp).join('')
  const nombresEscapados = prefixes.map(escapeRegExp).join('|')

  const regex = new RegExp(`^(${nombresEscapados})?[${prefijosEscapados}]+`, 'i')

  prefixCache.set(cacheKey, regex)
  if (prefixCache.size > 100) {
    const firstKey = prefixCache.keys().next().value
    prefixCache.delete(firstKey)
  }

  return regex
}

function clearPrefixCache(selfId) {
  if (selfId) {
    for (const key of prefixCache.keys()) {
      if (key.startsWith(selfId)) prefixCache.delete(key)
    }
  } else {
    prefixCache.clear()
  }
}
globalThis.clearPrefixCache = clearPrefixCache

function extractMessageBody(message) {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    message?.buttonsResponseMessage?.selectedButtonId ||
    message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    message?.templateButtonReplyMessage?.selectedId ||
    ''
  )
}

async function checkPermissions(cmdData, command, m, permissions) {
  const { isOwner, isModeration, isAdmin, isBotAdmin } = permissions

  const checks = [
    { flag: 'isOwner', value: isOwner, type: 'owner' },
    { flag: 'isModeration', value: isModeration, type: 'moderation' },
    { flag: 'isAdmin', value: isAdmin, type: 'admin' },
    { flag: 'botAdmin', value: isBotAdmin, type: 'botAdmin' },
    { flag: 'isBotAdmin', value: isBotAdmin, type: 'botAdmin' } // compat
  ]

  for (const { flag, value, type } of checks) {
    if (cmdData[flag] && !value) {
      await m.reply(ERROR_MESSAGES[type](command))
      return false
    }
  }

  return true
}

// ═══════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN DEL LOADER (UNA SOLA VEZ)
// ═══════════════════════════════════════════════════════════════════════════

loadCommandsAndPlugins()

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default async (client, m) => {
  if (!m?.message) return

  const selfId = ensureUserId(client)
  if (!selfId) return

  initializeDBStructure()
  initDB(m, client)

  await resolveMessageJids(m, client)

  const sender = m.sender || selfId
  const pushname = m.pushName || CONFIG.DEFAULT_PUSHNAME
  const from = m.key?.remoteJid || m.chat
  const chatId = m.chat || from
  const isGroup = m.isGroup || chatId?.endsWith('@g.us')

  const ownerNumbers = getOwnerNumbers()
  const isOwner = checkIsOwner(sender, ownerNumbers)

  // ✅ Anti-loop: ignorar mensajes del bot, EXCEPTO si eres owner y quieres testear
  if (m.key?.fromMe) {
    if (!CONFIG.ALLOW_FROM_ME_FOR_OWNERS) return
    if (!isOwner) return
  }

  if (await runGlobalMiddlewares('before', m, client, isOwner)) return

  const chatSettings = (global.db.data.chats[chatId] ||= {})
  chatSettings.primaryBot = chatSettings.primaryBot || null

  const { primaryBot } = chatSettings
  if (primaryBot && selfId !== primaryBot && !isOwner) return

  let groupName = ''
  let metadata = null
  let groupAdmins = []

  if (isGroup) {
    metadata = await client.groupMetadata(from).catch(() => null)
    groupName = metadata?.subject || ''
    groupAdmins = await getResolvedGroupAdmins(metadata, client, chatId)
  }

  const body = extractMessageBody(m.message)
  let usedPrefix = null

  await runPluginHooks('all', client, m, { usedPrefix }, isOwner)

  const prefixRegex = buildPrefixRegex(selfId)
  globalThis.prefix = prefixRegex

  if (await runPluginHooks('before', client, m, { usedPrefix }, isOwner)) return

  const prefixMatch = body.match(prefixRegex)
  if (!prefixMatch) return

  usedPrefix = prefixMatch[0]

  const noPrefix = body.slice(usedPrefix.length).trim()
  const args = noPrefix.split(/\s+/)
  const command = args.shift()?.toLowerCase() || ''
  const text = args.join(' ')

  logMessage({ pushname, sender, isGroup, groupName, from, command })

  if (!global.comandos?.has(command)) {
    return m.reply(ERROR_MESSAGES.notFound(command, usedPrefix))
  }

  const cmdData = global.comandos.get(command)

  if (typeof cmdData.before === 'function') {
    try {
      const stop = await cmdData.before.call(client, m, { client, command, args, text, usedPrefix })
      if (stop && !isOwner) return
    } catch (err) {
      console.error(chalk.red(`❌ Error en BEFORE del comando ${command}:`), err)
    }
  }

  const senderJid = (await resolveLidToRealJid(sender, client, chatId)) || sender
  const botJid = (await resolveLidToRealJid(selfId, client, chatId)) || selfId

  const isAdmin = isGroup && groupAdmins.includes(senderJid)
  const isBotAdmin = isGroup && groupAdmins.includes(botJid)

  const mods = Array.isArray(global.mods) ? global.mods : []
  const modsJids = mods.map(normalizeToJid).filter(Boolean)
  const isModeration = modsJids.includes(senderJid)

  const hasPermission = await checkPermissions(cmdData, command, m, {
    isOwner,
    isModeration,
    isAdmin,
    isBotAdmin
  })
  if (!hasPermission) return

  try {
    updateUserStats(senderJid, pushname, command)

    await cmdData.run({
      client,
      m,
      args,
      command,
      text,
      usedPrefix,
      prefix: usedPrefix,

      // Contexto adicional
      isOwner,
      isAdmin,
      isBotAdmin,
      isModeration,
      isGroup,
      sender: senderJid,
      pushname,
      groupName,
      metadata,
      chatId,
      groupAdmins,

      // Utilidades
      ownerNumbers,
      selfId
    })
  } catch (err) {
    console.error(chalk.red(`❌ Error ejecutando comando [${command}]:`), err)
    await m.reply('❌ Error al ejecutar el comando:\n' + (err.message || err))
  }

  await runPluginHooks('after', client, m, { usedPrefix }, isOwner)

  if (typeof cmdData.after === 'function') {
    try {
      await cmdData.after.call(client, m, { client, command, usedPrefix })
    } catch (err) {
      console.error(chalk.red(`❌ Error en AFTER del comando ${command}:`), err)
    }
  }

  await runGlobalMiddlewares('after', m, client, isOwner)
}
