import fetch from 'node-fetch'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

const TIKTOK_URL_REGEX = /^https?:\/\/(?:www\.|vm\.|vt\.|m\.|t\.)?tiktok\.com\/.+/i

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

async function normalizeTikTokUrl(rawUrl) {
  const input = String(rawUrl || '').trim()
  if (!input) return null

  let candidate = input
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`

  try {
    const res = await fetch(candidate, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    })

    const finalUrl = res?.url || candidate
    return TIKTOK_URL_REGEX.test(finalUrl) ? finalUrl : null
  } catch {
    return TIKTOK_URL_REGEX.test(candidate) ? candidate : null
  }
}

async function downloadBuffer(videoUrl, source) {
  try {
    const res = await fetch(videoUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/'
      }
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    console.log(`[TIKTOK] ${source}: ${(buffer.length / 1024 / 1024).toFixed(1)}MB descargado`)
    return buffer
  } catch (e) {
    console.log(`[TIKTOK] ${source} fallback falló: ${e.message}`)
    return null
  }
}

async function downloadTikTokVideo(url) {
  const errors = []
  const MIN_SIZE = 300000 // 300KB mínimo

  // 1. Intentar con TikWM
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`
    const res = await fetch(apiUrl, { timeout: 15000 })
    const json = await res.json()

    if (json?.code === 0 && json?.data) {
      const data = json.data
      const videoUrl = data.download?.url || data.hdplay || data.play || data.wmplay
      
      if (videoUrl) {
        const buffer = await downloadBuffer(videoUrl, 'TikWM')
        if (buffer && buffer.length > MIN_SIZE) {
          return { buffer, data, source: 'TikWM' }
        }
      }
    }
    errors.push('TikWM: incompleto')
  } catch (e) {
    errors.push(`TikWM: ${e.message.slice(0, 30)}`)
  }

  // 2. Fallback: TikSave API (más estable)
  try {
    const apiUrl = `https://www.tiksave.com/v1/download?url=${encodeURIComponent(url)}`
    const res = await fetch(apiUrl, { timeout: 15000 })
    const json = await res.json()

    if (json?.video) {
      const buffer = await downloadBuffer(json.video, 'TikSave')
      if (buffer && buffer.length > MIN_SIZE) {
        return { buffer, data: json, source: 'TikSave' }
      }
    }
    errors.push('TikSave: incompleto')
  } catch (e) {
    errors.push(`TikSave: ${e.message.slice(0, 30)}`)
  }

  // 3. Fallback: Douyin API (TikTok chino - más estable)
  try {
    const apiUrl = `https://api.douyin.wtf/download?url=${encodeURIComponent(url)}`
    const res = await fetch(apiUrl, { timeout: 15000 })
    const json = await res.json()

    if (json?.video_url || json?.download_url) {
      const videoUrl = json.video_url || json.download_url
      const buffer = await downloadBuffer(videoUrl, 'Douyin')
      if (buffer && buffer.length > MIN_SIZE) {
        return { buffer, data: json, source: 'Douyin' }
      }
    }
    errors.push('Douyin: incompleto')
  } catch (e) {
    errors.push(`Douyin: ${e.message.slice(0, 30)}`)
  }

  // 4. Fallback FINAL: yt-dlp local (más confiable)
  try {
    const tmpDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
    const outputFile = path.join(tmpDir, `${Date.now()}_tiktok.mp4`)

    console.log('[TIKTOK] Usando yt-dlp como fallback...')
    // Descargar con mejor formato: video + audio mezclado
    const { stdout } = await execAsync(
      `yt-dlp -f 'best[ext=mp4]/best' --merge-output-format mp4 --no-warnings --quiet -o "${outputFile}" "${url}"`,
      { timeout: 120000, maxBuffer: 100 * 1024 * 1024 }
    )

    if (fs.existsSync(outputFile)) {
      const buffer = fs.readFileSync(outputFile)
      const sizeMB = buffer.length / 1024 / 1024
      console.log(`[TIKTOK] yt-dlp descargó: ${sizeMB.toFixed(1)}MB`)
      
      if (buffer && buffer.length > MIN_SIZE) {
        try { fs.unlinkSync(outputFile) } catch {}
        return { buffer, data: { source: 'yt-dlp' }, source: 'yt-dlp' }
      }
    }
    errors.push(`yt-dlp: ${fs.existsSync(outputFile) ? 'pequeño' : 'sin archivo'}`)
  } catch (e) {
    errors.push(`yt-dlp: ${e.message.slice(0, 40)}`)
  }

  throw new Error(`Todas las APIs fallaron: ${errors.slice(-2).join(' | ')}`)
}

export default {
  command: ['tiktok', 'tt', 'tiktokdl', 'ttdl'],
  category: 'downloader',
  desc: 'Descarga videos de TikTok sin marca de agua.',
  
  run: async ({ client, m, args, text }) => {
    try {
      // 1. Validar si hay enlace
      const input = text?.trim() || (Array.isArray(args) ? args.join(' ') : String(args || ''))
      const quoted = getQuotedText(m)
      const urlRaw = extractUrlFromText(input) || extractUrlFromText(quoted) || args?.[0] || ''
      const url = await normalizeTikTokUrl(urlRaw)

      if (!url) {
        return m.reply(`🐲 Ingresa un enlace de TikTok (◕ᴗ◕)\n│ Ejemplo: /tiktok https://vm.tiktok.com/XYZ`)
      }

      // Reacción de "Buscando"
      await client.sendMessage(m.chat, { react: { text: "⏳", key: m.key } })

      // 2. Descargar video con múltiples APIs fallback
      const { buffer, data, source } = await downloadTikTokVideo(url)
      
      // 3. Construir Caption
      const caption = `╭─── ⋆🐉⋆ ───
│ 🎬 *TIKTOK DOWNLOAD*
├───────────────
│ ❀ *Autor:* ${data?.author?.nickname || data?.author?.unique_id || data?.author || 'Desconocido'}
│ ❀ *Descripción:* ${data?.title || data?.description || 'Sin descripción'}
│ ❀ *Fuente:* ${source}
╰─── ⋆✨⋆ ───`.trim()

      // 4. Enviar buffer de video (ya validado como > 500KB)
      await client.sendMessage(m.chat, {
        video: buffer,
        mimetype: 'video/mp4',
        fileName: `tiktok_${Date.now()}.mp4`,
        caption: caption,
        gifPlayback: false
      }, { quoted: m })

      // Reacción de éxito
      await client.sendMessage(m.chat, { react: { text: "✅", key: m.key } })

      // Opcional: Enviar Audio si el usuario lo pide (puedes agregar lógica extra aquí)

    } catch (e) {
      console.error(e)
      // Reacción de error
      await client.sendMessage(m.chat, { react: { text: "❌", key: m.key } })
      m.reply(`🐲 Error al descargar (╥﹏╥)\n│ ${e.message || 'Intenta más tarde'}`)
    }
  }
}
