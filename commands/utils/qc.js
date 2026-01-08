import axios from 'axios'
import fs from 'fs'
import { resolveLidToRealJid } from '../../lib/utils.js'

const FALLBACK_PP = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'
const FALLBACK_NAME = 'Personita'
const MAX_LEN = 40

const onlyDigits = (s = '') => String(s).replace(/\D/g, '')
const escapeRegExp = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function ensureJid(x) {
  if (!x) return null
  const s = String(x)
  if (s.includes('@')) return s
  const n = onlyDigits(s)
  return n ? `${n}@s.whatsapp.net` : null
}

function getContextParticipant(m) {
  const msg = m?.message || {}
  const ctx =
    msg?.extendedTextMessage?.contextInfo ||
    msg?.imageMessage?.contextInfo ||
    msg?.videoMessage?.contextInfo ||
    msg?.documentMessage?.contextInfo ||
    null
  return ctx?.participant || null
}

async function resolveWho(client, m, whoRaw) {
  let who = ensureJid(whoRaw)
  if (!who) return null

  // En grupos: resolver LID -> JID real
  if (m.chat?.endsWith('@g.us')) {
    const real = await resolveLidToRealJid(who, client, m.chat).catch(() => null)
    if (real) who = ensureJid(real) || who
  }
  return who
}

// ✅ Prioridad #1: alias guardado con #setname (es el mismo campo .name en db.users[jid])
function getNameFromUsersDB(who) {
  const n = global?.db?.data?.users?.[who]?.name
  return n && String(n).trim() ? String(n).trim() : null
}

// Extra: algunos bots guardan users por chat
function getNameFromChatDB(m, who) {
  const n = global?.db?.data?.chats?.[m.chat]?.users?.[who]?.name
  return n && String(n).trim() ? String(n).trim() : null
}

async function getNameFromGroupMetadata(client, m, who) {
  if (!m.chat?.endsWith('@g.us') || typeof client.groupMetadata !== 'function') return null
  const md = await client.groupMetadata(m.chat).catch(() => null)
  const parts = md?.participants || []
  if (!parts.length) return null

  const targetNum = onlyDigits(who)
  const p =
    parts.find(x => x.id === who) ||
    parts.find(x => onlyDigits(x.id) === targetNum)

  const n = p?.notify || p?.name || p?.displayName
  return n && String(n).trim() ? String(n).trim() : null
}

async function getDisplayName(client, m, who) {
  // 0) quoted name (si el wrapper lo trae)
  const qn = m.quoted?.pushName || m.quoted?.name || m.quoted?.notify
  if (qn && String(qn).trim()) return String(qn).trim()

  // 1) DB principal (aquí vive setname y también el name del main)
  const dbName = getNameFromUsersDB(who)
  if (dbName) return dbName

  // 2) DB por chat (si existe)
  const chatName = getNameFromChatDB(m, who)
  if (chatName) return chatName

  // 3) getName si existe
  try {
    if (typeof client.getName === 'function') {
      const n = await client.getName(who)
      if (n && String(n).trim()) return String(n).trim()
    }
  } catch {}

  // 4) metadata del grupo
  try {
    const n2 = await getNameFromGroupMetadata(client, m, who)
    if (n2) return n2
  } catch {}

  return FALLBACK_NAME
}

async function getProfilePic(client, who) {
  try {
    if (typeof client.profilePictureUrl === 'function') {
      try {
        const pp = await client.profilePictureUrl(who, 'image')
        if (pp) return pp
      } catch {
        const pp = await client.profilePictureUrl(who)
        if (pp) return pp
      }
    }
  } catch {}
  return FALLBACK_PP
}

export default {
  command: ['qc'],
  category: 'utils',
  run: async ({ client, m, args, usedPrefix, command }) => {
    try {
      // ── Texto (como referencia) ──
      let text = ''
      if (args?.length) text = args.join(' ')
      else if (m.quoted?.text) text = m.quoted.text
      else return m.reply(`📌 Te faltó el texto!\nEj: *${usedPrefix || '#'}${command || 'qc'} Hola*`)

      text = String(text).trim()
      if (!text) return m.reply('📌 Te faltó el texto!')

      // ── Anti-mención owner (como ref) ──
      const owners = (global.owner || [])
        .map(o => Array.isArray(o) ? o[0] : o)
        .map(x => onlyDigits(x))
        .filter(Boolean)

      const senderNum = onlyDigits(m.sender)
      const esOwner = owners.includes(senderNum)

      if (!esOwner && owners.length) {
        const textoMin = text.toLowerCase()
        const mencionados = (m.mentionedJid || []).map(jid => onlyDigits(jid))

        // Verificar menciones directas o números completos de owner
        const seMencionaOwner = owners.some(owner => {
          // Verificar si el owner está en la lista de mencionados
          if (mencionados.includes(owner)) return true
          // Verificar mención directa con @ (número completo)
          if (textoMin.includes(`@${owner}`)) return true
          // Verificar si el número completo del owner aparece como palabra independiente
          const ownerRegex = new RegExp(`\\b${owner}\\b`)
          if (ownerRegex.test(text)) return true
          return false
        })

        if (seMencionaOwner) {
          return m.reply(
            `🌸 *Ara ara~... ¿mencionar a uno de mis creadores?*\n` +
            `💢 No puedo traicionar a mis creadores...`
          )
        }
      }

      // ── WHO: mención > citado > sender (ref + mejora) ──
      const mentioned = Array.isArray(m.mentionedJid) ? m.mentionedJid : []
      let whoRaw = mentioned[0] || null

      if (!whoRaw && m.quoted) {
        whoRaw =
          m.quoted?.sender ||
          m.quoted?.participant ||
          m.quoted?.key?.participant ||
          getContextParticipant(m) ||
          null
      }

      if (!whoRaw) {
        whoRaw = m.key?.fromMe ? client.user?.id : m.sender
      }

      const who = await resolveWho(client, m, whoRaw)
      if (!who) return m.reply('❌ No pude identificar al usuario.')

      // ── Quitar mención del texto (como ref) ──
      const whoBase = who.includes('@') ? who.split('@')[0] : who
      const mentionRegex = new RegExp(`@${escapeRegExp(whoBase)}\\s*`, 'g')
      const mishi = text.replace(mentionRegex, '').trim()

      if (mishi.length > MAX_LEN) return m.reply(`📌 El texto no puede tener más de ${MAX_LEN} caracteres`)

      // ── Foto + nombre ──
      const pp = await getProfilePic(client, who)
      const nombre = await getDisplayName(client, m, who)

      // ── Quote API ──
      const payload = {
        type: 'quote',
        format: 'png',
        backgroundColor: '#000000',
        width: 512,
        height: 768,
        scale: 2,
        messages: [{
          entities: [],
          avatar: true,
          from: { id: 1, name: nombre, photo: { url: pp } },
          text: mishi,
          replyMessage: {}
        }]
      }

      const res = await axios.post('https://bot.lyo.su/quote/generate', payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      })

      const b64 = res?.data?.result?.image
      if (!b64) return m.reply('❌ La API no devolvió imagen.')

      const buffer = Buffer.from(b64, 'base64')

      // ── Pack/author (igual estilo tu sticker.js + setmeta) ──
      const user = global?.db?.data?.users?.[m.sender] || {}
      const clientUserId = client.user?.id || ''
      const botId = clientUserId ? clientUserId.split(':')[0] + '@s.whatsapp.net' : ''
      const botSettings = (botId && global?.db?.data?.settings?.[botId]) || {}
      const botname = botSettings.namebot || botSettings.namebot2 || 'Lucoa'
      const username = user.name || m.pushName || 'Usuario'

      const packname = user.metadatos || 'Lucoa-Bot'
      const author =
        user.metadatos2 ||
        `Socket:\n↳@${botname}\n👹Usuario:\n↳@${username}`

      // ── Enviar sticker ──
      if (typeof client.sendImageAsSticker === 'function') {
        const enc = await client.sendImageAsSticker(m.chat, buffer, m, { packname, author })
        if (enc && typeof enc === 'string') {
          try { fs.unlinkSync(enc) } catch {}
        }
      } else {
        await client.sendMessage(m.chat, { sticker: buffer }, { quoted: m })
      }

    } catch (e) {
      console.error('[qc] error:', e?.response?.status, e?.message || e)
      m.reply(`❌ Error al crear QC.${e?.response?.status ? ` (HTTP ${e.response.status})` : ''}`)
    }
  }
}
