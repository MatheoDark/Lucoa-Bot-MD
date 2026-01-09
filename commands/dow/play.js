import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'
import axios from 'axios'

const LIMIT_MB = 100
const PENDING_TTL_MS = 60 * 1000

const isHttpUrl = (s = '') => /^https?:\/\//i.test(String(s || ''))
const isYTUrl = (url) =>
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/).+$/i.test(
    String(url || '')
  )

// ───────────────────────────────────────────────
// 🌐 Fetch seguro: timeout + retry (evita UND_ERR_BODY_TIMEOUT)
// ───────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchSafe(url, options = {}, cfg = {}) {
  const {
    timeout = 45000,
    retries = 2,
    retryDelay = 700,
    retryOn = (e) => {
      const code = e?.cause?.code || e?.code
      return (
        code === 'UND_ERR_BODY_TIMEOUT' ||
        code === 'UND_ERR_CONNECT_TIMEOUT' ||
        code === 'UND_ERR_SOCKET' ||
        code === 'UND_ERR_HEADERS_TIMEOUT' ||
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'EAI_AGAIN' ||
        code === 'AbortError'
      )
    }
  } = cfg

  let lastErr
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeout)

    try {
      const res = await fetch(url, { ...options, signal: controller.signal })
      return res
    } catch (e) {
      lastErr = e
      if (i < retries && retryOn(e)) {
        await sleep(retryDelay * (i + 1))
        continue
      }
      throw e
    } finally {
      clearTimeout(t)
    }
  }
  throw lastErr
}

async function fetchJsonSafe(url, cfg = {}) {
  const res = await fetchSafe(url, {}, cfg)
  const txt = await res.text().catch(() => '')
  let data
  try {
    data = JSON.parse(txt)
  } catch {
    data = null
  }
  return { ok: res.ok, status: res.status, data, raw: txt }
}

async function headSizeMB(url) {
  try {
    const res = await axios.head(url, { timeout: 20000, maxRedirects: 5 })
    const cl = res?.headers?.['content-length']
    if (!cl) return null
    const bytes = parseInt(cl, 10)
    if (!Number.isFinite(bytes)) return null
    return bytes / (1024 * 1024)
  } catch {
    return null
  }
}

// ───────────────────────────────────────────────
// 🧯 Auto-disable StellarWA cuando está sin saldo / rate-limit
// ───────────────────────────────────────────────
let STELLAR_DISABLED_UNTIL = 0
const stellarDisabled = () => Date.now() < STELLAR_DISABLED_UNTIL
const disableStellarFor = (ms) => (STELLAR_DISABLED_UNTIL = Date.now() + ms)
const isStellarEndpoint = (s = '') => String(s).includes('api.stellarwa.xyz')
const isNoCreditMsg = (msg = '') => {
  const m = String(msg).toLowerCase()
  return (
    m.includes('se ha acabado tu saldo') ||
    m.includes('no tienes solicitudes disponibles') ||
    m.includes('sin solicitudes disponibles') ||
    m.includes('saldo') ||
    m.includes('solicitudes disponibles')
  )
}

const fetchWithFallback = async (ytUrl, primaryApi, fallbackApis) => {
  const allApis = [primaryApi, ...fallbackApis]

  const apis = allApis.filter((api) => {
    try {
      const probe = api.url('https://youtu.be/dQw4w9WgXcQ')
      if (isStellarEndpoint(probe) && stellarDisabled()) return false
      return true
    } catch {
      return true
    }
  })

  for (const api of apis) {
    const endpoint = api.url(ytUrl)
    const isStellar = isStellarEndpoint(endpoint)

    try {
      const { ok, status, data } = await fetchJsonSafe(endpoint, {
        timeout: 45000,
        retries: 2
      })

      if (!ok || !data) {
        if (status === 429 && isStellar) disableStellarFor(10 * 60 * 1000)
        continue
      }

      if (isStellar && (data?.code === 429 || isNoCreditMsg(data?.message))) {
        disableStellarFor(10 * 60 * 1000)
        continue
      }

      if (api.validate(data)) return api.parse(data)
    } catch {
      // fallback
    }
  }

  throw new Error('All APIs failed')
}

// ───────────────────────────────────────────────
// 🧩 Helpers
// ───────────────────────────────────────────────
const sanitizeFileName = (s = '') =>
  String(s)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Lucoa'

async function buildThumbBuffer(thumbUrl) {
  if (!isHttpUrl(thumbUrl)) return null
  try {
    const res = await fetchSafe(thumbUrl, {}, { timeout: 25000, retries: 1 })
    const ab = await res.arrayBuffer()
    return await sharp(Buffer.from(ab)).resize(320, 180).jpeg({ quality: 80 }).toBuffer()
  } catch {
    return null
  }
}

function pickQuality(isAudio) {
  // ✅ StellarWA valid
  const quAudio = ['92', '128', '256', '320']
  const quVideo = ['144', '360', '480', '720', '1080']
  const qu = isAudio ? quAudio : quVideo
  return qu[Math.floor(Math.random() * qu.length)]
}

async function resolveVideoInfo(queryOrUrl) {
  if (isYTUrl(queryOrUrl)) {
    const u = new URL(queryOrUrl)
    const id = u.searchParams.get('v') || queryOrUrl.split('/').pop()
    const info = await yts({ videoId: id })
    return info?.videos?.[0] || info
  }

  const search = await yts(queryOrUrl)
  return search?.videos?.[0] || search?.all?.[0] || null
}

function ensurePendingStore() {
  if (!global.__playPending) global.__playPending = Object.create(null)
  return global.__playPending
}

function setPending(chatId, sender, payload) {
  const store = ensurePendingStore()
  store[chatId] = {
    sender,
    ...payload,
    expiresAt: Date.now() + PENDING_TTL_MS
  }
}

function getPending(chatId) {
  const store = ensurePendingStore()
  const item = store[chatId]
  if (!item) return null
  if (Date.now() > item.expiresAt) {
    delete store[chatId]
    return null
  }
  return item
}

function clearPending(chatId) {
  const store = ensurePendingStore()
  delete store[chatId]
}

// ───────────────────────────────────────────────
// 📦 Envío media
// ───────────────────────────────────────────────
async function sendAudio(client, m, dl, title, thumbBuffer) {
  if (!isHttpUrl(dl)) return m.reply('✎ Enlace de descarga inválido.')
  const safeTitle = sanitizeFileName(title)

  await client.sendMessage(
    m.chat,
    {
      document: { url: dl },
      mimetype: 'audio/mpeg',
      fileName: `${safeTitle}.mp3`,
      jpegThumbnail: thumbBuffer || undefined
    },
    { quoted: m }
  )
}

async function sendVideo(client, m, dl, title, thumbBuffer) {
  if (!isHttpUrl(dl)) return m.reply('✎ Enlace de descarga inválido.')
  const safeTitle = sanitizeFileName(title)
  const devCaption = typeof dev !== 'undefined' ? dev : ''

  const sizeMb = await headSizeMB(dl)
  const exceedsLimit = sizeMb ? sizeMb >= LIMIT_MB : true

  if (exceedsLimit) {
    await client.sendMessage(
      m.chat,
      {
        document: { url: dl },
        fileName: `${safeTitle}.mp4`,
        mimetype: 'video/mp4',
        caption: devCaption
      },
      { quoted: m }
    )
  } else {
    await client.sendMessage(
      m.chat,
      {
        video: { url: dl },
        fileName: `${safeTitle}.mp4`,
        mimetype: 'video/mp4',
        jpegThumbnail: thumbBuffer || undefined
      },
      { quoted: m }
    )
  }
}

// ───────────────────────────────────────────────
// 🔻 Descarga por API (mp3/mp4)
// ───────────────────────────────────────────────
async function getDownloadLink(url, isAudio) {
  const quality = pickQuality(isAudio)

  const primaryApi = {
    url: (yt) =>
      `${api.url}/dl/${isAudio ? 'ytmp3' : 'ytmp4'}?url=${encodeURIComponent(
        yt
      )}&quality=${quality}&key=${api.key}`,
    validate: (r) => r?.status && r?.data?.dl && r?.data?.title,
    parse: (r) => ({ dl: r.data.dl, title: r.data.title })
  }

  const nekolabsApi = {
    url: (yt) =>
      `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(
        yt
      )}&format=${isAudio ? 'mp3' : '720'}`,
    validate: (r) => r?.success && r?.result?.downloadUrl,
    parse: (r) => ({ dl: r.result.downloadUrl, title: r.result.title })
  }

  const aioApi = {
    url: (yt) =>
      `https://anabot.my.id/api/download/aio?url=${encodeURIComponent(yt)}&apikey=freeApikey`,
    validate: (r) => !r?.error && Array.isArray(r?.medias) && r.medias.length > 0,
    parse: (r) => {
      const media = r.medias.find((mm) =>
        isAudio
          ? mm.type === 'audio' && ['m4a', 'opus'].includes(mm.ext)
          : mm.type === 'video' && mm.ext === 'mp4' && mm.height <= 720
      )
      if (!media) throw new Error('No suitable media format found')
      return { dl: media.url, title: r.title || 'Desconocido' }
    }
  }

  return fetchWithFallback(url, primaryApi, [nekolabsApi, aioApi])
}

// ───────────────────────────────────────────────
// ✅ EXPORT
// ───────────────────────────────────────────────
export default {
  command: ['play', 'mp3', 'playaudio', 'ytmp3', 'play2', 'mp4', 'playvideo', 'ytmp4'],
  category: 'downloader',

  // 🧠 Captura respuesta "1" o "2" SIN prefijo
  before: async (m, { client }) => {
    try {
      const text = (m?.text || m?.body || '').trim()
      if (text !== '1' && text !== '2') return

      const pending = getPending(m.chat)
      if (!pending) return

      // Solo el mismo usuario que pidió el play puede elegir
      if (pending.sender && pending.sender !== m.sender) return

      const isAudio = text === '1'
      clearPending(m.chat)

      await m.reply(isAudio ? '🎧 Listo, preparando tu audio...' : '🎬 Listo, preparando tu video...')

      const { url, title, thumbnail } = pending
      const thumbBuffer = await buildThumbBuffer(thumbnail)

      const { dl, title: apiTitle } = await getDownloadLink(url, isAudio)
      const finalTitle = apiTitle || title || 'Desconocido'

      if (isAudio) await sendAudio(client, m, dl, finalTitle, thumbBuffer)
      else await sendVideo(client, m, dl, finalTitle, thumbBuffer)
    } catch (e) {
      clearPending(m.chat)
      const code = e?.cause?.code || e?.code
      if (code === 'UND_ERR_BODY_TIMEOUT') {
        return m.reply('⏳ El servidor tardó demasiado.\nInténtalo otra vez en unos segundos.')
      }
      return m.reply(`Error:\n${e.message}`)
    }
  },

  run: async ({ client, m, args, command, text }) => {
    try {
      const q = String(text || '').trim()
      if (!q) return client.sendMessage(m.chat, { text: '✎ Ingresa el nombre o una URL de YouTube.' }, { quoted: m })

      // Directos
      const isAudioCmd = ['mp3', 'ytmp3', 'playaudio'].includes(command)
      const isVideoCmd = ['mp4', 'ytmp4', 'playvideo', 'play2'].includes(command)

      // 1) Resolver video
      const videoInfo = await resolveVideoInfo(q).catch(() => null)
      if (!videoInfo?.url) return m.reply('✎ No se encontraron resultados.')

      const url = videoInfo.url
      const title = videoInfo.title || 'Desconocido'
      const vistas = (videoInfo.views || 0).toLocaleString()
      const canal = videoInfo.author?.name || 'Desconocido'
      const timestamp = videoInfo.timestamp || videoInfo.duration?.toString?.() || 'Desconocido'
      const ago = videoInfo.ago || 'Desconocido'
      const thumb = videoInfo.thumbnail

      // Estética
      const infoMessage = `
*𖹭.╭╭ִ╼ׅ࣪ﮩ٨ـﮩ𝗒𝗈𝗎𝗍𝗎𝗏𝖾-𝗉꯭𝗅꯭𝖺꯭𝗒ﮩ٨ـﮩׅ╾࣪╮╮.𖹭*
> ♡ *Título:* ${title}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Duración:* ${timestamp}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Vistas:* ${vistas}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Canal:* ${canal}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Publicado:* ${ago}
*⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ׄۛ۫۫۫۫۫۫ۜ*`

      // 2) Si es comando directo mp3/mp4 -> descarga y envía
      if (isAudioCmd || isVideoCmd) {
        const isAudio = isAudioCmd
        const thumbBuffer = await buildThumbBuffer(thumb)
        const { dl, title: apiTitle } = await getDownloadLink(url, isAudio)
        const finalTitle = apiTitle || title

        if (isAudio) await sendAudio(client, m, dl, finalTitle, thumbBuffer)
        else await sendVideo(client, m, dl, finalTitle, thumbBuffer)
        return
      }

      // 3) Si es #play -> preview + menú numérico
      if (isHttpUrl(thumb)) {
        await client.sendMessage(m.chat, { image: { url: thumb }, caption: infoMessage }, { quoted: m })
      } else {
        await client.sendMessage(m.chat, { text: infoMessage }, { quoted: m })
      }

      // Guardar sesión por chat
      setPending(m.chat, m.sender, { url, title, thumbnail: thumb })

      // Menú numérico (infalible)
      const menu = `🎵 *Selecciona formato (responde con el número)*

1️⃣ *Audio (MP3)*
2️⃣ *Video (MP4)*

⏳ Tienes *60 segundos* para responder.

🧩 Backup:
• *#mp3* ${url}
• *#mp4* ${url}`

      await client.sendMessage(m.chat, { text: menu }, { quoted: m })
    } catch (e) {
      const code = e?.cause?.code || e?.code
      if (code === 'UND_ERR_BODY_TIMEOUT') {
        return m.reply('⏳ El servidor tardó demasiado.\nInténtalo otra vez en unos segundos.')
      }
      m.reply(`Error:\n${e.message}\n${e?.stack || e}`)
    }
  }
}
