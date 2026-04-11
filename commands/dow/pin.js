import fetch from 'node-fetch'
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'
import { pipeline } from 'stream'
import { promisify } from 'util'
import sharp from 'sharp'

const streamPipeline = promisify(pipeline)

// 🐲 LUCOA • Pinterest (DuckDuckGo Image Search)
// Busca imágenes de Pinterest via DuckDuckGo para evitar APIs muertas.

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// Cache global para paginación (#pin 2)
global.__lucoaPinCache = global.__lucoaPinCache || Object.create(null)

// Detección de Links
const isPinterestUrl = (s = '') => /(https?:\/\/)?(www\.)?pinterest\.(com|cl|es)\/.+/i.test(s) || /pin\.it\//i.test(s)

const extractUrlFromText = (text = '') => {
  const match = String(text || '').match(/https?:\/\/[^\s]+/i)
  return match ? match[0].replace(/[<>]/g, '') : null
}

function getQuotedText(m) {
  return (
    m?.quoted?.text ||
    m?.quoted?.caption ||
    m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
    m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
    m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption ||
    m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage?.caption ||
    ''
  )
}

const decodeHtml = (s = '') => String(s || '').replace(/&amp;/g, '&').replace(/\\u002F/g, '/')

function decodeJsonEscapes(s = '') {
  return String(s || '')
    .replace(/\\\//g, '/')
    .replace(/\\u002F/gi, '/')
    .replace(/\\u0026/gi, '&')
}

function pickFromMeta(html, propertyName) {
  const escaped = propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const reg = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i')
  const match = html.match(reg)
  return decodeHtml(match?.[1] || '')
}

function findMp4InHtml(html) {
  const match = html.match(/https?:\\\/\\\/[^"'\\s]+\\.mp4[^"'\\s]*/i) || html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/i)
  return decodeHtml(match?.[0] || '')
}

function collectMediaCandidatesFromHtml(html = '') {
  const patterns = [
    /"contentUrl"\s*:\s*"(https?:\\\/\\\/[^"\\]+\\.mp4[^"\\]*)"/gi,
    /"video_url"\s*:\s*"(https?:\\\/\\\/[^"\\]+\\.mp4[^"\\]*)"/gi,
    /"url"\s*:\s*"(https?:\\\/\\\/[^"\\]+\\.mp4[^"\\]*)"/gi,
    /"image"\s*:\s*"(https?:\\\/\\\/[^"\\]+(?:pinimg\\.com|pinimg\\.cn)[^"\\]*)"/gi,
    /"url"\s*:\s*"(https?:\\\/\\\/[^"\\]+(?:pinimg\\.com|pinimg\\.cn)[^"\\]*)"/gi,
    /(https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/gi,
    /(https?:\/\/[^"'\s]+(?:pinimg\.com|pinimg\.cn)[^"'\s]*)/gi
  ]

  const out = []
  for (const reg of patterns) {
    let m
    while ((m = reg.exec(html)) !== null) {
      const raw = m[1] || m[0]
      if (!raw) continue
      const decoded = decodeJsonEscapes(decodeHtml(raw))
      if (!/^https?:\/\//i.test(decoded)) continue
      if (/\.(mp4|m3u8)(\?|$)/i.test(decoded) || /pinimg\.(com|cn)/i.test(decoded)) {
        out.push(decoded)
      }
    }
  }

  return [...new Set(out)]
}

async function fixVideoCodec(url) {
  const tmpDir = path.join(process.cwd(), 'tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

  const timestamp = Date.now()
  const inputPath = path.join(tmpDir, `pin_${timestamp}.mp4`)
  const outputPath = path.join(tmpDir, `pin_${timestamp}_fixed.mp4`)

  // Descargar el video primero
  const response = await fetch(url, {
    headers: { 'User-Agent': UA }
  })
  
  if (!response.ok) throw new Error('Error al descargar el video de Pinterest.')
  await streamPipeline(response.body, fs.createWriteStream(inputPath))

  // Arreglar el codec con FFmpeg para WhatsApp
  return new Promise((resolve) => {
    const cmd = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -movflags +faststart "${outputPath}"`
    exec(cmd, (error) => {
      try { fs.unlinkSync(inputPath) } catch {} // Borrar original
      if (error) {
        // En caso de fallo de FFmpeg, intentamos devolver el buffer desde lo que haya o fallamos
        resolve(null)
      } else {
        const buffer = fs.readFileSync(outputPath)
        try { fs.unlinkSync(outputPath) } catch {} // Borrar procesado
        resolve(buffer)
      }
    })
  })
}

async function downloadMediaBuffer(url, maxRetries = 3) {
  let lastError
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`[PIN] Intento ${i + 1}/${maxRetries} descargar: ${url.substring(0, 80)}...`)
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Referer': 'https://www.pinterest.com/',
          'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8'
        },
        timeout: 20000,
        redirect: 'follow'
      })

      if (!res.ok) {
        lastError = `HTTP ${res.status} ${res.statusText}`
        console.log(`[PIN] Error descarga: ${lastError}, reintentando...`)
        if (i < maxRetries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)))
        continue
      }

      const mime = String(res.headers.get('content-type') || '').toLowerCase()
      const arr = await res.arrayBuffer()
      const buffer = Buffer.from(arr)

      if (!buffer.length) {
        lastError = 'Buffer vacío'
        console.log(`[PIN] Buffer vacío, reintentando...`)
        if (i < maxRetries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)))
        continue
      }

      console.log(`[PIN] ✅ Descargado: ${buffer.length} bytes, tipo: ${mime}`)
      return { buffer, mime, finalUrl: res.url || url }
    } catch (e) {
      lastError = e.message
      console.log(`[PIN] Error intento ${i + 1}: ${lastError}`)
      if (i < maxRetries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }

  throw new Error(`No se pudo descargar después de ${maxRetries} intentos. Último error: ${lastError}`)
}

function detectBufferKind(buffer) {
  if (!buffer || buffer.length < 12) return 'unknown'

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image'
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image'
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image'
  // WEBP (RIFF....WEBP)
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'image'

  // MP4 (....ftyp)
  const box = buffer.toString('ascii', 4, 8)
  if (box === 'ftyp') return 'video'

  return 'unknown'
}

function detectMediaKind({ mime = '', buffer, url = '', preferVideo = false }) {
  const m = String(mime || '').toLowerCase()
  const u = String(url || '').toLowerCase()

  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'video'

  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u)) return 'image'
  if (/\.(mp4|mov|m4v|webm)(\?|$)/i.test(u) || /video\//i.test(u)) return 'video'

  const bySig = detectBufferKind(buffer)
  if (bySig !== 'unknown') return bySig

  return preferVideo ? 'video' : 'unknown'
}

async function normalizeImageBuffer(buffer) {
  if (!buffer || !buffer.length) {
    console.log(`[PIN] Buffer vacío en normalización`)
    return null
  }

  const kind = detectBufferKind(buffer)
  console.log(`[PIN] Normalizando imagen (tipo detectado: ${kind}, tamaño: ${buffer.length} bytes)`)

  try {
    const normalized = await sharp(buffer, { failOnError: false })
      .rotate()
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer()
    
    console.log(`[PIN] ✅ Imagen normalizada: ${normalized.length} bytes`)
    return normalized
  } catch (e) {
    console.log(`[PIN] ⚠️ Error normalizando: ${e.message}. Devolviendo buffer original.`)
    return buffer
  }
}

// ===== 1. MOTOR DE BÚSQUEDA (DUCKDUCKGO) =====
async function searchPinterest(query) {
  const searchQuery = `site:pinterest.com ${query}`
  const headers = { 'User-Agent': UA }

  // Paso 1: Obtener token VQD desde la página de DuckDuckGo
  const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images`
  const tokenRes = await fetch(tokenUrl, { headers, timeout: 15000 })
  if (!tokenRes.ok) throw new Error('No se pudo conectar a DuckDuckGo.')

  const tokenHtml = await tokenRes.text()
  const vqdMatch = tokenHtml.match(/vqd=['"]([^'"]+)['"]/)
  if (!vqdMatch) throw new Error('No se pudo obtener token de búsqueda.')
  const vqd = vqdMatch[1]

  // Paso 2: Buscar imágenes con el token
  const imgUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(searchQuery)}&o=json&p=1&s=0&u=bing&f=,,,,,&l=wt-wt&vqd=${vqd}`
  const imgRes = await fetch(imgUrl, {
    headers: { 'User-Agent': UA, 'Referer': 'https://duckduckgo.com/' },
    timeout: 15000
  })
  if (!imgRes.ok) throw new Error('Error al buscar imágenes.')

  const data = await imgRes.json()
  if (!data.results?.length) throw new Error('No encontré resultados en Pinterest.')

  // Filtrar solo URLs de pinimg.com (imágenes reales de Pinterest)
  const pinResults = data.results
    .filter(r => r.image && /pinimg\.com/i.test(r.image))
    .map(r => ({
      url: r.image,
      thumbnail: r.thumbnail,
      desc: r.title || 'Pinterest',
      author: 'Pinterest',
      saves: 0,
      isVideo: false
    }))

  // Si no hay pinimg, usar todos los resultados igualmente
  const finalResults = pinResults.length ? pinResults : data.results.filter(r => r.image).map(r => ({
    url: r.image,
    thumbnail: r.thumbnail,
    desc: r.title || 'Pinterest',
    author: 'Pinterest',
    saves: 0,
    isVideo: false
  }))

  if (!finalResults.length) throw new Error('No encontré imágenes válidas.')
  return finalResults
}

// ===== 2. DESCARGA DIRECTA POR LINK =====
async function downloadPinterestLink(url) {
  // Intentar resolver el link de Pinterest y extraer la imagen OG
  const headers = {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.pinterest.com/'
  }
  const res = await fetch(url, { headers, timeout: 15000, redirect: 'follow' })
  if (!res.ok) throw new Error('No se pudo acceder al enlace de Pinterest.')

  const html = await res.text()

  // Pinterest a veces publica video en propiedades distintas según región/dispositivo.
  const candidates = [
    pickFromMeta(html, 'og:video:secure_url'),
    pickFromMeta(html, 'og:video:url'),
    pickFromMeta(html, 'og:video'),
    pickFromMeta(html, 'twitter:player:stream'),
    findMp4InHtml(html),
    ...collectMediaCandidatesFromHtml(html),
    pickFromMeta(html, 'og:image'),
    pickFromMeta(html, 'twitter:image')
  ].filter(Boolean)

  const mediaUrl = candidates.find(u => /\.mp4(\?|$)|mime=video|video\//i.test(u)) || candidates[0]

  const title = pickFromMeta(html, 'og:title') || 'Pinterest Media'
  if (!mediaUrl) throw new Error('No se pudo extraer la imagen/video del enlace.')

  const isVideo = /\.mp4(\?|$)|mime=video|video\//i.test(mediaUrl)

  return {
    url: mediaUrl,
    desc: title,
    isVideo
  }
}

// ===== COMANDO PRINCIPAL =====
export default {
  command: ['pin', 'pinterest', 'pinvideo', 'pindl', 'pinterestdl'],
  category: 'downloader',
  run: async ({ client, m, args, text }) => {
    const input = (String(text || '').trim() || args.join(' ').trim())
    const chatId = m.chat
    const quoted = getQuotedText(m)

    if (!input) {
      return m.reply(
        `🐲 *Lucoa Pinterest*\n\n` +
        `🔎 *Buscar:* #pin goku\n` +
        `🔗 *Link:* #pin https://pin.it/...\n` +
        `➡️ *Siguiente:* #pin 2`
      )
    }

    await m.react('🔍')

    try {
      // CASO A: El usuario pide el siguiente resultado (#pin 2)
      if (/^\d+$/.test(input)) {
        const idx = parseInt(input, 10) - 1
        const cache = global.__lucoaPinCache[chatId]

        if (!cache?.results?.length) return m.reply(`🐲 *Primero haz una búsqueda.* (Ej: #pin autos)`)
        if (idx < 0 || idx >= cache.results.length) return m.reply(`🐲 *Solo tengo ${cache.results.length} resultados.*`)

        const item = cache.results[idx]
        const caption = `🐲 *${idx + 1}/${cache.results.length}* • ${item.desc.substring(0, 50)}...`
        
        if (item.isVideo) {
          const fixedBuffer = await fixVideoCodec(item.url)
          if (fixedBuffer) {
            await client.sendMessage(chatId, { video: fixedBuffer, mimetype: 'video/mp4', caption }, { quoted: m })
          } else {
            // Fallback (por si no hay FFmpeg)
            await client.sendMessage(chatId, { video: { url: item.url }, mimetype: 'video/mp4', caption }, { quoted: m })
          }
        } else {
          const { buffer } = await downloadMediaBuffer(item.url)
          const normalized = await normalizeImageBuffer(buffer)
          const finalImage = normalized || buffer
          await client.sendMessage(chatId, { image: finalImage, mimetype: 'image/jpeg', caption }, { quoted: m })
        }
        return m.react('✅')
      }

      // CASO B: El usuario envía un LINK (Descarga directa)
      const directUrl = extractUrlFromText(input) || extractUrlFromText(quoted) || input
      if (isPinterestUrl(directUrl)) {
        const result = await downloadPinterestLink(directUrl)
        const caption = `🐲 *Descarga completada*\n📝 ${result.desc}`

        if (result.isVideo) {
          const fixedBuffer = await fixVideoCodec(result.url)
          try {
            if (fixedBuffer) {
              await client.sendMessage(chatId, { video: fixedBuffer, mimetype: 'video/mp4', fileName: `pinterest_${Date.now()}.mp4`, caption }, { quoted: m })
            } else {
              await client.sendMessage(chatId, { video: { url: result.url }, mimetype: 'video/mp4', fileName: `pinterest_${Date.now()}.mp4`, caption }, { quoted: m })
            }
          } catch {
            await client.sendMessage(chatId, { document: { url: result.url }, mimetype: 'video/mp4', fileName: `pinterest_${Date.now()}.mp4`, caption }, { quoted: m })
          }
        } else {
          const media = await downloadMediaBuffer(result.url)
          const normalized = await normalizeImageBuffer(media.buffer)
          const finalImage = normalized || media.buffer
          await client.sendMessage(chatId, { image: finalImage, mimetype: 'image/jpeg', caption }, { quoted: m })
        }
        return m.react('✅')
      }

      // CASO C: Búsqueda de Texto (Search)
      const results = await searchPinterest(input)
      
      // Guardamos en caché
      global.__lucoaPinCache[chatId] = { query: input, results, ts: Date.now() }
      
      const first = results[0]
      const caption = 
        `╭━━━〔 🐲 𝗟𝗨𝗖𝗢𝗔 • Pinterest 〕━━━⬣\n` +
        `🔎 *Búsqueda:* ${input}\n` +
        `📝 *Desc:* ${first.desc}\n` +
        `👤 *Autor:* ${first.author}\n` +
        `💾 *Guardados:* ${first.saves}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━⬣\n` +
        `👉 Responde con *#pin 2* para ver el siguiente.`

      const { buffer } = await downloadMediaBuffer(first.url)
      const normalized = await normalizeImageBuffer(buffer)
      if (!normalized && !buffer.length) {
        throw new Error('Pinterest no devolvió una imagen válida en el primer resultado.')
      }
      await client.sendMessage(chatId, { image: normalized || buffer, mimetype: 'image/jpeg', caption }, { quoted: m })
      await m.react('✅')

    } catch (e) {
      console.error(`[PIN] ❌ ERROR COMPLETO:`, e)
      await m.react('❌')
      const errorMsg = e.message || String(e)
      m.reply(`🐲 *Error Pinterest:*\n\n${errorMsg}\n\n💡 *Alternativa:* Prueba con #img o usa links directos de imágenes.`)
    }
  }
}
