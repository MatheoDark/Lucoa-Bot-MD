/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🐉 LUCOA-BOT-MD v3.0.0 - Handler Principal
 * ═══════════════════════════════════════════════════════════════════════════
 * Basado en Megumin-Bot-MD v3.0.0
 * Modificado por MatheoDark
 * ═══════════════════════════════════════════════════════════════════════════
 */

import moment from 'moment-timezone'
import chalk from 'chalk'
import gradient from 'gradient-string'
import loadCommandsAndPlugins from './lib/system/commandLoader.js'
import initDB from './lib/system/initDB.js'
import { resolveLidToRealJid } from './lib/utils.js'
import { getCachedGroupMetadata } from './lib/groupCache.js'
import { updateMissionProgress } from './commands/economy/missions.js'

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN GLOBAL
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = Object.freeze({
  DEFAULT_PREFIXES: ['/', '#', '.'],
  DEFAULT_BOT_NAME: 'Lucoa-Bot 🐉',
  DEFAULT_PUSHNAME: 'Sin nombre',
  TIMEZONE: 'America/Santiago',
  VERSION: '3.0.1',
  ALLOW_FROM_ME_FOR_OWNERS: true
})

const ERROR_MESSAGES = Object.freeze({
  owner: (cmd) => `ꕥ El comando *${cmd}* solo puede ser ejecutado por mi Creador.`,
  moderation: (cmd) => `ꕥ El comando *${cmd}* solo puede ser ejecutado por los moderadores.`,
  admin: (cmd) => `ꕥ El comando *${cmd}* solo puede ser ejecutado por los Administradores.`,
  botAdmin: (cmd) => `ꕥ El comando *${cmd}* requiere que yo sea Administradora.`
})

// Cache para prefijos
const prefixCache = new Map()

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

// 🔥 NUEVO: Función para calcular similitud (Levenshtein)
function similitud(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) { matrix[i][j] = matrix[i - 1][j - 1]; }
      else { matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)); }
    }
  }
  return matrix[b.length][a.length];
}

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
// BASE DE DATOS
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
  // 🔧 FIX: Usar timestamp numérico en vez de objeto Date
  // Date objects no sobreviven JSON serialization y causan saves innecesarios
  user.lastSeen = Date.now()
  // Marcar DB como modificada
  if (typeof global.markDBDirty === 'function') global.markDBDirty()
}

// ═══════════════════════════════════════════════════════════════════════════
// JIDs & GRUPOS
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
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════

function logMessage({ pushname, sender, isGroup, groupName, from, command }) {
  if (!command) return // Solo loguear si hay un comando válido para no ensuciar consola

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

  lines.push(chalk.bold.redBright(`${v}⚡ Comando: ${chalk.yellowBright(command)}`))
  lines.push(h)
  console.log(lines.join('\n'))
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS & PLUGINS
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
// CACHÉ DE PREFIJOS
// ═══════════════════════════════════════════════════════════════════════════

function buildPrefixRegex(selfId) {
  const settings = global.db.data.settings?.[selfId] || {}
  const rawPrefijo = settings.prefijo || ''
  const botname = settings.namebot2 || CONFIG.DEFAULT_BOT_NAME

  const cacheKey = `${selfId}:${JSON.stringify(rawPrefijo)}:${botname}`
  const cached = prefixCache.get(cacheKey)
  if (cached) return cached

  const prefas = Array.isArray(rawPrefijo) ? rawPrefijo : rawPrefijo ? [rawPrefijo] : CONFIG.DEFAULT_PREFIXES

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

globalThis.clearPrefixCache = (selfId) => {
  if (selfId) {
    for (const key of prefixCache.keys()) {
      if (key.startsWith(selfId)) prefixCache.delete(key)
    }
  } else {
    prefixCache.clear()
  }
}

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
    { flag: 'isBotAdmin', value: isBotAdmin, type: 'botAdmin' }
  ]

  for (const { flag, value, type } of checks) {
    if (cmdData[flag] && !value) {
      await m.reply(ERROR_MESSAGES[type](command))
      return false
    }
  }

  return true
}

// Inicializar Comandos: movido a `index.js` para retrasar queries pesadas
// loadCommandsAndPlugins() will be called once the socket is fully open to avoid
// triggering many queries at startup that can lead to rate limits.
global.commandsLoaded = global.commandsLoaded || false

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION FLOW
// ═══════════════════════════════════════════════════════════════════════════

export default async (client, m) => {
  try {
    if (!m?.message) return

    const selfId = ensureUserId(client)
    if (!selfId) return

    initializeDBStructure()
    initDB(m, client)

    const sender = m.sender || selfId
    const pushname = m.pushName || CONFIG.DEFAULT_PUSHNAME
    const from = m.key?.remoteJid || m.chat
    const chatId = m.chat || from
    const isGroup = m.isGroup || chatId?.endsWith('@g.us')

    const ownerNumbers = getOwnerNumbers()
    const isOwner = checkIsOwner(sender, ownerNumbers)

    // Anti-loop (Permitir owner)
    if (m.key?.fromMe) {
      if (!CONFIG.ALLOW_FROM_ME_FOR_OWNERS) return
      if (!isOwner) return
    }

    if (await runGlobalMiddlewares('before', m, client, isOwner)) return

    // Verificar Bot Principal
    const chatSettings = (global.db.data.chats[chatId] ||= {})
    chatSettings.primaryBot = chatSettings.primaryBot || null

    const { primaryBot } = chatSettings
    if (primaryBot && selfId !== primaryBot && !isOwner) return

    // ═══════════════════════════════════════════════════════════════════
    //  🎯 RASTREO DE ACTIVIDAD PARA MISIONES DE CHAT
    //  Trackea mensajes, stickers, media, audio y reacciones
    //  Esto corre ANTES del chequeo de prefijo para contar todo
    // ═══════════════════════════════════════════════════════════════════
    if (isGroup && chatSettings.rpg) {
      try {
        const activityUser = global.db.data.users[sender]
        if (activityUser && activityUser.missions) {
          const msg = m.message || {}
          if (msg.conversation || msg.extendedTextMessage) {
            updateMissionProgress(activityUser, 'messages', 1)
          }
          if (msg.stickerMessage) {
            updateMissionProgress(activityUser, 'stickers', 1)
            updateMissionProgress(activityUser, 'messages', 1)
          }
          if (msg.imageMessage || msg.videoMessage) {
            updateMissionProgress(activityUser, 'media', 1)
            updateMissionProgress(activityUser, 'messages', 1)
          }
          if (msg.audioMessage) {
            updateMissionProgress(activityUser, 'audio', 1)
            updateMissionProgress(activityUser, 'messages', 1)
          }
          if (msg.reactionMessage) {
            updateMissionProgress(activityUser, 'reactions', 1)
          }
          if (msg.conversation || msg.extendedTextMessage || msg.stickerMessage || msg.imageMessage || msg.videoMessage || msg.audioMessage) {
            if (!activityUser._activeGroups) activityUser._activeGroups = {}
            const hoy = new Date().toISOString().slice(0, 10)
            if (!activityUser._activeGroups[hoy]) activityUser._activeGroups[hoy] = []
            if (!activityUser._activeGroups[hoy].includes(chatId)) {
              activityUser._activeGroups[hoy].push(chatId)
              updateMissionProgress(activityUser, 'chatgroups', 1)
            }
            for (const key of Object.keys(activityUser._activeGroups)) {
              if (key !== hoy) delete activityUser._activeGroups[key]
            }
          }
        }
      } catch (e) { /* silenciar errores de tracking */ }
    }

    const body = extractMessageBody(m.message)
    let usedPrefix = null

    // Hooks .all
    await runPluginHooks('all', client, m, { usedPrefix }, isOwner)

    const prefixRegex = buildPrefixRegex(selfId)
    globalThis.prefix = prefixRegex

    // Hooks .before
    if (await runPluginHooks('before', client, m, { usedPrefix }, isOwner)) return

    const prefixMatch = body.match(prefixRegex)
    if (!prefixMatch) return // Si no tiene prefijo, IGNORAR

    usedPrefix = prefixMatch[0]

    const noPrefix = body.slice(usedPrefix.length).trim()
    const args = noPrefix.split(/\s+/)
    const command = args.shift()?.toLowerCase() || ''
    const text = args.join(' ')

    // 🛑 🔥 VERIFICACIÓN DE COMANDO (AGREGADO) 🔥
    if (!global.comandos?.has(command)) {
        // 1. Buscamos comandos parecidos
        const allCmds = [...global.comandos.keys()]
        const suggestion = allCmds.find(c => similitud(command, c) <= 2)

        let msg = `❌ El comando *${usedPrefix + command}* no existe.`
        if (suggestion) {
            msg += `\n👾 ¿Quizás quisiste decir: *${usedPrefix + suggestion}*?`
        }

        // 2. Respondemos y terminamos
        return m.reply(msg)
    }

    // Si llegamos aquí, el comando SÍ existe — ahora sí resolver JIDs y metadata
    await resolveMessageJids(m, client)

    let groupName = ''
    let metadata = null
    let groupAdmins = []

    if (isGroup) {
      metadata = await getCachedGroupMetadata(client, from)
      groupName = metadata?.subject || ''
      groupAdmins = await getResolvedGroupAdmins(metadata, client, chatId)
    }

    logMessage({ pushname, sender: m.sender || sender, isGroup, groupName, from, command })

    const cmdData = global.comandos.get(command)

    // Hooks del comando (Before)
    if (typeof cmdData.before === 'function') {
      try {
        const stop = await cmdData.before.call(client, m, { client, command, args, text, usedPrefix })
        if (stop && !isOwner) return
      } catch (err) {
        console.error(chalk.red(`❌ Error en BEFORE del comando ${command}:`), err)
      }
    }

    const senderJid = m.sender || sender
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

        // Contexto
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

      // 🔧 FIX: Marcar DB como modificada después de cada comando
      // Esto asegura que cualquier cambio hecho por el comando se guarde
      if (typeof global.markDBDirty === 'function') global.markDBDirty()
    } catch (err) {
      console.error(chalk.red(`❌ Error ejecutando comando [${command}]:`), err)
      // Mantenemos el aviso de error real (crashes de código)
      await m.reply('❌ Error interno al ejecutar el comando.')
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

  } catch (err) {
    console.error('🔥 Error fatal en main.js:', err)
  }
}
