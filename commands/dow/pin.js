import fetch from 'node-fetch'

// 🐲 LUCOA • Pinterest (NEVI API Search + Link DL) — New Core

// ===== NEVI API (Python) =====
const NEVI_API_URL = 'http://neviapi.ddns.net:5000'
const NEVI_API_KEY = 'ellen'

// ===== Headers =====
const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-CL,es;q=0.9,en;q=0.7',
  Referer: 'https://www.google.com/'
}

// Cache por chat para selector (#pin 2)
global.__lucoaPinCache = global.__lucoaPinCache || Object.create(null)

// ===== Utils =====
const isPinIt = (s = '') => /https?:\/\/(www\.)?pin\.it\//i.test(s)
const isPinterestUrl = (s = '') =>
  /(https?:\/\/)?(www\.)?pinterest\.(com|cl|es)\/.+/i.test(s) || /pin\.it\//i.test(s)
const isMp4 = (u = '') => /\.mp4(\?|$)/i.test(u)

function normalizePinUrl(url) {
  const m = url.match(/\/pin\/(\d+)/i)
  if (m?.[1]) return `https://www.pinterest.com/pin/${m[1]}/`
  return url
}

async function expandUrl(url) {
  try {
    const res = await fetch(url, { headers, redirect: 'follow', method: 'GET' })
    return res.url || url
  } catch {
    return url
  }
}

async function safeJsonResponse(res) {
  const ct = (res.headers.get('content-type') || '').toLowerCase()
  const txt = await res.text()
  const looksJson =
    ct.includes('application/json') || txt.trim().startsWith('{') || txt.trim().startsWith('[')
  if (!looksJson) return null
  try {
    return JSON.parse(txt)
  } catch {
    return null
  }
}

// Mejorar calidad: convertir 60x60 a 236x o 736x
function upgradePinimg(url = '') {
  // Mantener thumbnails de video tal cual (sirven igual)
  if (url.includes('/videos/thumbnails/')) return url

  // Subir tamaño de miniaturas cuadradas
  // 60x60 -> 736x (mejor) o 236x (más liviano)
  return url
    .replace('/60x60/', '/736x/')
    .replace('/75x75/', '/736x/')
    .replace('/136x136/', '/736x/')
}

// Filtrar basura y priorizar mejores tamaños
function rankUrls(urls = []) {
  const cleaned = [...new Set(urls)].filter(Boolean).map(upgradePinimg)

  // Preferir 736x / 564x / 474x / 236x, evitar 60x60
  const score = (u) => {
    const s = u.toLowerCase()
    if (s.includes('/736x/')) return 100
    if (s.includes('/564x/')) return 90
    if (s.includes('/474x/')) return 80
    if (s.includes('/236x/')) return 70
    if (s.includes('/videos/thumbnails/')) return 60
    if (s.includes('/60x60/')) return 10
    return 30
  }

  return cleaned.sort((a, b) => score(b) - score(a)).slice(0, 10)
}

// ===== NEVI Search (Texto) =====
async function searchViaNevi(query) {
  const res = await fetch(`${NEVI_API_URL}/pinterest`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'X-API-KEY': NEVI_API_KEY
    },
    body: JSON.stringify({ query })
  })

  if (!res.ok) throw new Error(`NEVI API HTTP ${res.status}`)

  const json = await safeJsonResponse(res)
  if (!json) throw new Error('NEVI API no devolvió JSON')

  // Su respuesta real:
  // { message, query, status:"success", urls:[...] }
  if (json.status !== 'success' || !Array.isArray(json.urls)) {
    throw new Error(json.message || 'NEVI API devolvió error')
  }

  return rankUrls(json.urls)
}

// ===== Pinterest Link Download (mp4 -> oEmbed img) =====
async function fetchHtml(url) {
  // directo
  try {
    const r = await fetch(url, { headers, redirect: 'follow' })
    if (r.ok) return await r.text()
  } catch {}

  // fallback server-side
  const jina = `https://r.jina.ai/http${url.startsWith('https://') ? 's' : ''}://${url.replace(
    /^https?:\/\//,
    ''
  )}`
  const r2 = await fetch(jina, { headers })
  if (!r2.ok) throw new Error(`Bloqueo HTML (jina ${r2.status})`)
  return await r2.text()
}

function extractMp4FromHtml(html = '') {
  return (
    html.match(/https?:\/\/v\.pinimg\.com\/[^"'\\\s]+\.mp4[^"'\\\s]*/i)?.[0] ||
    html.match(/https?:\/\/i\.pinimg\.com\/[^"'\\\s]+\.mp4[^"'\\\s]*/i)?.[0] ||
    null
  )
}

async function oembed(pinUrl) {
  const u = encodeURIComponent(pinUrl)
  const res = await fetch(`https://www.pinterest.com/oembed.json?url=${u}`, { headers })
  const json = await safeJsonResponse(res)
  if (!json) throw new Error('oEmbed no disponible')
  const thumb = json.thumbnail_url || json.thumbnail_url_with_size
  if (!thumb) throw new Error('oEmbed sin thumbnail_url')
  return upgradePinimg(thumb)
}

async function downloadFromPinterestUrl(inputUrl) {
  const expanded = isPinIt(inputUrl) ? await expandUrl(inputUrl) : inputUrl
  const pinUrl = normalizePinUrl(expanded)

  // mp4
  try {
    const html = await fetchHtml(pinUrl)
    const mp4 = extractMp4FromHtml(html)
    if (mp4) return { mediaUrl: mp4, originalUrl: pinUrl, isVideo: true, source: 'MP4' }
  } catch {
    // seguimos
  }

  // imagen
  const img = await oembed(pinUrl)
  return { mediaUrl: img, originalUrl: pinUrl, isVideo: false, source: 'oEmbed' }
}

// ===== Safe send =====
async function safeSend(client, m, url, caption) {
  try {
    if (isMp4(url)) {
      return await client.sendMessage(m.chat, { video: { url }, caption }, { quoted: m })
    }
    return await client.sendMessage(m.chat, { image: { url }, caption }, { quoted: m })
  } catch {}

  const mimetype = isMp4(url) ? 'video/mp4' : 'image/jpeg'
  const fileName = isMp4(url) ? 'lucoa_pinterest.mp4' : 'lucoa_pinterest.jpg'
  return client.sendMessage(
    m.chat,
    { document: { url }, mimetype, fileName, caption },
    { quoted: m }
  )
}

// ===== Command =====
export default {
  command: ['pin', 'pinterest'],
  category: 'downloader',
  run: async ({ client, m, args }) => {
    const input = args.join(' ').trim()
    const name = m.pushName || 'Proxy'
    const chatId = m.chat

    if (!input) {
      return m.reply(
        `🐲 *Ara ara~* ${name}\n\n` +
          `🔎 *Buscar:* #pin goku ssj4\n` +
          `📌 *Link:*   #pin https://pin.it/xxxxx\n` +
          `🎯 *Elegir:* #pin 2 (después de buscar)`
      )
    }

    await client.sendMessage(m.chat, { react: { text: '🐲', key: m.key } })
    await client.sendMessage(m.chat, { react: { text: '🔄', key: m.key } })

    // ===== Selector (#pin 2) =====
    if (/^\d+$/.test(input)) {
      const idx = parseInt(input, 10) - 1
      const cache = global.__lucoaPinCache[chatId]

      if (!cache?.urls?.length) {
        await m.react('❌')
        return m.reply(`🐲 *No hay resultados guardados.* Use primero: *#pin goku*`)
      }
      if (idx < 0 || idx >= cache.urls.length) {
        await m.react('❌')
        return m.reply(`🐲 *Elija entre 1 y ${cache.urls.length}*`)
      }

      const url = cache.urls[idx]
      const caption =
        `╭━━━〔 🐲 𝗟𝗨𝗖𝗢𝗔 • Pinterest 〕━━━⬣\n` +
        `✨ *Proxy:* ${name}\n` +
        `🎯 *Selección:* ${idx + 1}/${cache.urls.length}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━⬣\n` +
        `🪽 *Lucoa Service*`

      await safeSend(client, m, url, caption)
      await m.react('✅')
      return
    }

    // ===== Link mode =====
    if (isPinterestUrl(input)) {
      try {
        const dl = await downloadFromPinterestUrl(input)
        const caption =
          `╭━━━〔 🐲 𝗟𝗨𝗖𝗢𝗔 • Pinterest 〕━━━⬣\n` +
          `✨ *Proxy:* ${name}\n` +
          `${dl.isVideo ? '📹' : '🖼️'} *Tipo:* ${dl.isVideo ? 'Video' : 'Imagen'}\n` +
          `🔗 *Origen:* ${dl.originalUrl}\n` +
          `📡 *Fuente:* ${dl.source}\n` +
          `╰━━━━━━━━━━━━━━━━━━━━⬣\n` +
          `🪽 *Lucoa Service*`

        await safeSend(client, m, dl.mediaUrl, caption)
        await m.react('✅')
        return
      } catch (e) {
        await m.react('❌')
        return m.reply(`🐲 *Ara ara…* no pude con ese link.\nDetalles: ${e?.message || e}`)
      }
    }

    // ===== Text mode (NEVI API) =====
    try {
      const urls = await searchViaNevi(input)

      if (!urls.length) {
        await m.react('❌')
        return m.reply(`🐲 *No encontré nada…* (NEVI API sin resultados)`)
      }

      // guardar cache
      global.__lucoaPinCache[chatId] = { q: input, urls, ts: Date.now() }

      // enviar el primero
      const caption =
        `╭━━━〔 🐲 𝗟𝗨𝗖𝗢𝗔 • Pinterest Search 〕━━━⬣\n` +
        `🔎 *Búsqueda:* ${input}\n` +
        `✨ *Proxy:* ${name}\n` +
        `🖼️ *Resultado:* 1/${urls.length}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━⬣\n` +
        `🎯 Use: *#pin 2* para otro.\n` +
        `🪽 *Lucoa Service*`

      await safeSend(client, m, urls[0], caption)
      await m.react('✅')
    } catch (e) {
      await m.react('❌')
      m.reply(
        `🐲 *Anomalía crítica, ${name}.*\n` +
          `Falló la búsqueda con NEVI API.\n\n` +
          `Detalles: ${e?.message || e}`
      )
    }
  }
}
