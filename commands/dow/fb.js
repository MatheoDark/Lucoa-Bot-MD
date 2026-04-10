import fetch from 'node-fetch'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

const FB_URL_REGEX = /^https?:\/\/(?:www\.|m\.|mbasic\.)?(?:facebook\.com|fb\.watch|video\.fb\.com)\/\S+/i

function extractUrlFromText(text = '') {
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

function pickFacebookVideoUrl(payload) {
  if (!payload || typeof payload !== 'object') return null

  const nodes = [payload, payload.result, payload.data, payload.response]
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    const candidates = [
      node.url,
      node.video,
      node.videoUrl,
      node.video_url,
      node.download,
      node.downloadUrl,
      node.download_url,
      node.hd,
      node.hd_url,
      node.hdUrl,
      node.sd,
      node.sd_url,
      node.sdUrl
    ]

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) return candidate
      if (candidate && typeof candidate === 'object') {
        const nested = candidate.url || candidate.download || candidate.link
        if (typeof nested === 'string' && /^https?:\/\//i.test(nested)) return nested
      }
    }
  }

  return null
}

async function resolveVideoFromApi(url) {
  const apiBase = global.api?.url || 'https://api.stellarwa.xyz'
  const apiKey = global.api?.key || 'Diamond'
  const endpoints = [
    `${apiBase}/dl/facebookv2?url=${encodeURIComponent(url)}&key=${encodeURIComponent(apiKey)}`,
    `${apiBase}/dl/facebook?url=${encodeURIComponent(url)}&key=${encodeURIComponent(apiKey)}`
  ]

  let lastError = null

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 30000
      })

      if (!res.ok) {
        lastError = new Error(`API ${res.status}`)
        continue
      }

      const contentType = String(res.headers.get('content-type') || '').toLowerCase()

      if (contentType.includes('video/') || contentType.includes('application/octet-stream')) {
        const buffer = Buffer.from(await res.arrayBuffer())
        if (buffer.length > 1024) return { buffer, source: 'direct' }
      }

      const json = await res.json().catch(() => null)
      const videoUrl = pickFacebookVideoUrl(json)
      if (!videoUrl) {
        const msg = json?.message || json?.msg || json?.error || 'respuesta sin URL de video'
        lastError = new Error(String(msg))
        continue
      }

      const mediaRes = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://www.facebook.com/'
        },
        timeout: 60000
      })

      if (!mediaRes.ok) {
        lastError = new Error(`Media ${mediaRes.status}`)
        continue
      }

      const buffer = Buffer.from(await mediaRes.arrayBuffer())
      if (buffer.length <= 1024) {
        lastError = new Error('Archivo de video vacío')
        continue
      }

      return { buffer, source: 'json-url' }
    } catch (e) {
      lastError = new Error(e?.message || 'Error desconocido')
    }
  }

  throw lastError || new Error('No se pudo obtener el video de Facebook')
}

async function resolveVideoWithYtDlp(url) {
  const tmpDir = path.join(process.cwd(), 'tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

  const prefix = `${Date.now()}_${Math.random().toString(36).slice(2)}_fb`
  const outTpl = path.join(tmpDir, `${prefix}.%(ext)s`)

  try {
    const cmd = `yt-dlp -f "bv*[height<=1080]+ba/b[height<=1080]/best" --merge-output-format mp4 --no-playlist --no-warnings -o "${outTpl}" "${url}"`
    await execAsync(cmd, { timeout: 120000, maxBuffer: 100 * 1024 * 1024 })

    const file = fs.readdirSync(tmpDir).find((f) => f.startsWith(prefix) && !f.endsWith('.part') && !f.endsWith('.temp'))
    if (!file) throw new Error('yt-dlp no generó archivo')

    const fullPath = path.join(tmpDir, file)
    const buffer = fs.readFileSync(fullPath)
    try { fs.unlinkSync(fullPath) } catch {}

    if (buffer.length <= 1024) throw new Error('yt-dlp devolvió archivo vacío')
    return buffer
  } catch (e) {
    const leftovers = fs.readdirSync(tmpDir).filter((f) => f.startsWith(prefix))
    for (const f of leftovers) {
      try { fs.unlinkSync(path.join(tmpDir, f)) } catch {}
    }
    throw new Error(`yt-dlp: ${e?.message || 'error de descarga'}`)
  }
}

export default {
  command: ['fb', 'facebook'],
  category: 'downloader',
  run: async ({ client, m, args, text }) => {
    const input = String(text || '').trim() || (Array.isArray(args) ? args.join(' ') : String(args || ''))
    const quoted = getQuotedText(m)
    const fbUrl = extractUrlFromText(input) || extractUrlFromText(quoted) || args?.[0]

    if (!fbUrl) {
      return m.reply('🐲 Ingresa un enlace de *Facebook* (◕ᴗ◕)')
    }

    if (!FB_URL_REGEX.test(fbUrl)) {
      return m.reply('🐲 Envía un link de Facebook válido (◕︿◕)')
    }

    try {
      await m.react('⏳')
      let buffer
      try {
        const apiResult = await resolveVideoFromApi(fbUrl)
        buffer = apiResult.buffer
      } catch (apiErr) {
        console.log(`[FB] API falló, probando yt-dlp: ${apiErr.message}`)
        buffer = await resolveVideoWithYtDlp(fbUrl)
      }

      const caption = `╭─── ⋆🐉⋆ ───\n│ 📘 *Facebook Download*\n├───────────────\n│ 🔗 ${fbUrl}\n╰─── ⋆✨⋆ ───`

      await client.sendMessage(
        m.chat,
        { video: buffer, caption, mimetype: 'video/mp4', fileName: `facebook_${Date.now()}.mp4` },
        { quoted: m }
      )
      await m.react('✅')
    } catch (e) {
      await m.react('❌')
      await m.reply(`🐲 Error en Facebook: ${e.message || 'intenta más tarde'} (╥﹏╥)`)
    }
  }
}
