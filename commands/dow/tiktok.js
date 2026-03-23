import fetch from 'node-fetch'

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
        if (buffer && buffer.length > 500000) {
          return { buffer, data, source: 'TikWM' }
        }
      }
    }
    errors.push('TikWM: sin video válido')
  } catch (e) {
    errors.push(`TikWM: ${e.message}`)
  }

  // 2. Fallback: Snaptik API
  try {
    const apiUrl = `https://api.snaptik.io/download?url=${encodeURIComponent(url)}`
    const res = await fetch(apiUrl, { timeout: 15000 })
    const json = await res.json()

    if (json?.data?.video) {
      const buffer = await downloadBuffer(json.data.video, 'Snaptik')
      if (buffer && buffer.length > 500000) {
        return { buffer, data: json.data, source: 'Snaptik' }
      }
    }
    errors.push('Snaptik: sin video válido')
  } catch (e) {
    errors.push(`Snaptik: ${e.message}`)
  }

  // 3. Fallback: Music API
  try {
    const apiUrl = `https://api.app.music.com/download?url=${encodeURIComponent(url)}`
    const res = await fetch(apiUrl, { timeout: 15000 })
    const json = await res.json()

    if (json?.video_url || json?.url) {
      const videoUrl = json.video_url || json.url
      const buffer = await downloadBuffer(videoUrl, 'Music.com')
      if (buffer && buffer.length > 500000) {
        return { buffer, data: json, source: 'Music.com' }
      }
    }
    errors.push('Music.com: sin video válido')
  } catch (e) {
    errors.push(`Music.com: ${e.message}`)
  }

  throw new Error(`No se pudo descargar: ${errors.join(' | ')}`)
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
