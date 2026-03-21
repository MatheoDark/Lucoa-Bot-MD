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

      // 2. Usar API de TikWM (Es la más estable y gratuita actualmente)
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`
      const res = await fetch(apiUrl)
      const json = await res.json()

      // Validar respuesta
      if (!json || json.code !== 0 || !json.data) {
        throw new Error('🐲 No se pudo obtener el video (╥﹏╥)')
      }

      const data = json.data
      
      // 3. Construir Caption (Información del video)
      const caption = `╭─── ⋆🐉⋆ ───
│ 🎬 *TIKTOK DOWNLOAD*
├───────────────
│ ❀ *Autor:* ${data.author?.nickname || data.author?.unique_id || 'Desconocido'}
│ ❀ *Descripción:* ${data.title || 'Sin descripción'}
│ ❀ *Likes:* ${(data.digg_count || 0).toLocaleString()}
│ ❀ *Comentarios:* ${(data.comment_count || 0).toLocaleString()}
│ ❀ *Compartidos:* ${(data.share_count || 0).toLocaleString()}
│ ❀ *Música:* ${data.music_info?.title || 'Original Sound'}
╰─── ⋆✨⋆ ───`.trim()

      // 4. Enviar Video (Prioridad HD, sino normal)
      const videoUrl = data.hdplay || data.play || data.wmplay
      if (!videoUrl) {
        throw new Error('🐲 La API no devolvió un enlace de video válido')
      }

      try {
        await client.sendMessage(m.chat, {
          video: { url: videoUrl },
          caption: caption,
          gifPlayback: false
        }, { quoted: m })
      } catch {
        // Fallback: descargar el MP4 y enviarlo como buffer (evita bloqueos por hotlink/cdn)
        const mediaRes = await fetch(videoUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Referer: 'https://www.tiktok.com/'
          }
        })

        if (!mediaRes.ok) {
          throw new Error(`No se pudo descargar el video (${mediaRes.status})`)
        }

        const buffer = Buffer.from(await mediaRes.arrayBuffer())
        await client.sendMessage(m.chat, {
          video: buffer,
          mimetype: 'video/mp4',
          fileName: `tiktok_${Date.now()}.mp4`,
          caption: caption,
          gifPlayback: false
        }, { quoted: m })
      }

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
