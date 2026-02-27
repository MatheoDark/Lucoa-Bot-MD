import fetch from 'node-fetch';
import {format} from 'util';

// ✅ Validador de URLs seguro
const isValidAndSafeURL = (url) => {
  try {
    const parsed = new URL(url)
    
    // Rechazar hosts locales/privados
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0']
    if (blockedHosts.includes(parsed.hostname)) {
      return false
    }
    
    // Rechazar IPs privadas (192.168.*, 10.*, 172.16-31.*)
    const ipMatch = parsed.hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
    if (ipMatch) {
      const [, a, b] = ipMatch
      if (a === '192' && b === '168') return false // 192.168.x.x
      if (a === '10') return false // 10.x.x.x
      if (a === '172' && (b >= '16' && b <= '31')) return false // 172.16-31.x.x
    }
    
    return true
  } catch {
    return false
  }
}

export default {
  command: ['get'],
  category: 'utils',
  run: async ({client, m, args}) => {
    const text = args[0]
    if (!text) return m.reply('《✧》 Ingresa un enlace para realizar la solicitud.')

    if (!/^https?:\/\//.test(text))
      return m.reply('《✧》 Ingresa un enlace válido que comience en *https://* o *http://*')

    // ✅ NUEVO: Validar seguridad de URL
    if (!isValidAndSafeURL(text)) {
      return m.reply('《✧》 ❌ URL bloqueada por seguridad (host local/privado).')
    }

    try {
      const response = await fetch(text)
      const contentType = response.headers.get('content-type') || ''
      const contentLength = parseInt(response.headers.get('content-length') || '0')
      const ext = text.split('.').pop().toLowerCase()

      if (contentLength > 100 * 1024 * 1024) {
        throw new Error(`Archivo demasiado grande: ${contentLength} bytes (máx: 100MB)`)
      }

      const buffer = await response.buffer()

      if (/image\/(jpeg|png|gif|webp)/.test(contentType) || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        return await client.sendMessage(m.chat, { image: buffer, caption: `《✧》 Imagen desde: ${text}` }, { quoted: m })
      }

      if (/video\/(mp4|webm|ogg)/.test(contentType) || ['mp4', 'webm', 'ogg'].includes(ext)) {
        return await client.sendMessage(m.chat, { video: buffer, caption: `《✧》 Video desde: ${text}` }, { quoted: m })
      }

      if (/audio\/(mpeg|ogg|mp3|wav)/.test(contentType) || ['mp3', 'wav', 'ogg'].includes(ext) || contentType === 'application/octet-stream') {
        const mime = contentType.startsWith('audio/') ? contentType : 'audio/mpeg'
        return await client.sendMessage(m.chat, { audio: buffer, mimetype: mime }, { quoted: m })
      }

      let content = buffer.toString()
      try {
        content = format(JSON.parse(content))
      } catch (e) {}

      return await m.reply(`${content}`)

    } catch (e) {
      await m.reply(msgglobal)
    }
  }
};
