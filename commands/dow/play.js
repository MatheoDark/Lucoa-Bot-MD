import yts from 'yt-search'
import fetch from 'node-fetch'
import axios from 'axios'
import crypto from 'crypto'

const limit = 100 // Límite en MB

// ==========================================
// 🛠️ 1. TU CLASE SAVETUBE (ORIGINAL)
// ==========================================
class SaveTube {
  constructor() {
    this.ky = 'C5D58EF67A7584E4A29F6C35BBC4EB12'
    this.m = /^((?:https?:)?\/\/)?((?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?([a-zA-Z0-9_-]{11})/
    this.is = axios.create({
      headers: {
        'content-type': 'application/json',
        origin: 'https://yt.savetube.me',
        'user-agent': 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0'
      }
    })
  }

  async decrypt(enc) {
    try {
        const [sr, ky] = [Buffer.from(enc, 'base64'), Buffer.from(this.ky, 'hex')]
        const [iv, dt] = [sr.slice(0, 16), sr.slice(16)]
        const dc = crypto.createDecipheriv('aes-128-cbc', ky, iv)
        return JSON.parse(Buffer.concat([dc.update(dt), dc.final()]).toString())
    } catch { return null }
  }

  async getCdn() {
    try {
        const r = await this.is.get('https://media.savetube.vip/api/random-cdn')
        return r.data.cdn || 'media.savetube.vip'
    } catch { return 'media.savetube.vip' }
  }

  async download(url, isAudio) {
    const id = url.match(this.m)?.[3]
    if (!id) throw new Error('ID inválido')

    const cdn = await this.getCdn()
    const info = await this.is.post(`https://${cdn}/v2/info`, { url: `https://www.youtube.com/watch?v=${id}` })
    
    const dec = await this.decrypt(info.data.data)
    if (!dec) throw new Error('Fallo al desencriptar')

    const dl = await this.is.post(`https://${cdn}/download`, {
      id,
      downloadType: isAudio ? 'audio' : 'video',
      quality: isAudio ? '128' : '720',
      key: dec.key
    })

    return { dl: dl.data.data.downloadUrl, title: dec.title }
  }
}

// ==========================================
// 🛠️ 2. TU FUNCIÓN PARALELA (ORIGINAL)
// ==========================================
const fetchParallelFirstValid = async (url, apis, timeout = 15000) => {
  return new Promise((resolve, reject) => {
    let settled = false
    let errors = 0
    const timer = setTimeout(() => { if (!settled) reject(new Error('Timeout')) }, timeout)

    apis.forEach(api => {
      ;(async () => {
        try {
          let result
          if (api.custom) {
            result = await api.run(url)
          } else {
            const res = await fetch(api.url(url))
            const json = await res.json()
            if (api.validate(json)) result = await api.parse(json)
          }

          if (result?.dl && !settled) {
            settled = true
            clearTimeout(timer)
            resolve(result)
          } else { errors++ }
        } catch { errors++ }

        if (errors === apis.length && !settled) {
          clearTimeout(timer)
          reject(new Error('Todas las APIs fallaron'))
        }
      })()
    })
  })
}

// ==========================================
// 🚀 3. COMANDO PRINCIPAL
// ==========================================
export default {
  command: ['play', 'mp3', 'playaudio', 'ytmp3', 'play2', 'mp4', 'playvideo', 'ytmp4'],
  category: 'downloader',
  
  run: async ({ client, m, args, command, text }) => {
    try {
      const chatId = m.chat

      // 1. LÓGICA DE MENÚ (1, 2, 3)
      if (global.play_pending?.[chatId] && /^[1-3]$/.test(text.trim())) {
          const pending = global.play_pending[chatId]
          if (pending.sender !== m.sender) return 
          
          const selection = text.trim()
          let type = 'audio'
          if (selection === '2') type = 'video'
          if (selection === '3') type = 'document'
          
          delete global.play_pending[chatId]
          return await executeDownload(client, m, pending.url, type, pending.title, pending.thumb)
      }

      if (!text.trim()) return m.reply('✎ Ingresa el nombre o URL de YouTube.')

      // 2. BUSCAR EN YOUTUBE
      let url, title, videoInfo, thumb
      if (/https?:\/\//.test(text)) {
        url = text
        try {
            const id = text.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1]
            videoInfo = await yts({ videoId: id })
        } catch { return m.reply('❌ Link inválido.') }
      } else {
        const search = await yts(text)
        if (!search.all.length) return m.reply('✎ No encontré nada.')
        videoInfo = search.all[0]
      }
      
      url = videoInfo.url
      title = videoInfo.title
      thumb = videoInfo.thumbnail

      // 3. SI EL COMANDO ES DIRECTO (#mp3 o #mp4), SALTAR MENÚ
      if (['mp3', 'ytmp3', 'playaudio'].includes(command)) {
          return await executeDownload(client, m, url, 'audio', title, thumb)
      }
      if (['mp4', 'ytmp4', 'playvideo'].includes(command)) {
          return await executeDownload(client, m, url, 'video', title, thumb)
      }

      // 4. MOSTRAR MENÚ (Estilo Lucoa)
      const infoMsg = `
*𖹭.╭╭ִ╼ׅ࣪ﮩ٨ـﮩ𝗒𝗈𝗎𝗍𝗎𝗏𝖾-𝗉꯭𝗅꯭𝖺꯭𝗒ﮩ٨ـﮩׅ╾࣪╮╮.𖹭*
> ♡ *Título:* ${title}
> ♡ *Duración:* ${videoInfo.timestamp}
> ♡ *Vistas:* ${videoInfo.views}
> ♡ *Canal:* ${videoInfo.author.name}
> ♡ *Publicado:* ${videoInfo.ago}
*⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ*

*Responde con:*
🎵 *1* Audio
🎬 *2* Video
📂 *3* Documento
`
      const msg = await client.sendMessage(m.chat, { image: { url: thumb }, caption: infoMsg }, { quoted: m })

      global.play_pending = global.play_pending || {}
      global.play_pending[chatId] = { url, title, thumb, sender: m.sender, key: msg.key }

    } catch (e) {
      console.error(e)
      m.reply(`❌ Error: ${e.message}`)
    }
  }
}

// ⚙️ FUNCIÓN DE DESCARGA (Lógica de tu código original)
async function executeDownload(client, m, url, type, title, thumb) {
    const isAudio = type === 'audio' || type === 'document'
    await m.react(isAudio ? '🎧' : '🎬')

    // TUS APIS ORIGINALES
    const nekolabsApi = {
        url: (u) => `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(u)}&format=${isAudio ? 'mp3' : '720'}`,
        validate: (r) => r.success && r.result?.downloadUrl,
        parse: (r) => ({ dl: r.result.downloadUrl, title: r.result.title })
    }

    const anabotApi = {
        url: (u) => `https://anabot.my.id/api/download/${isAudio ? 'ytmp3' : 'ytmp4'}?url=${encodeURIComponent(u)}&apikey=freeApikey`,
        validate: (r) => r?.data?.result?.urls,
        parse: (r) => ({ dl: r.data.result.urls, title: r.data.result.metadata?.title })
    }

    const nexevoApi = {
        url: (u) => `https://nexevo-api.vercel.app/download/${isAudio ? 'y' : 'y2'}?url=${encodeURIComponent(u)}`,
        validate: (r) => r?.status && r?.result?.url,
        parse: (r) => ({ dl: r.result.url, title: r.result.info?.title })
    }

    const saveTubeFallback = {
        custom: true,
        run: async (u) => { const sv = new SaveTube(); return await sv.download(u, isAudio) }
    }

    // Orden de prioridad
    const apis = [nexevoApi, anabotApi, nekolabsApi, saveTubeFallback]

    try {
        const { dl } = await fetchParallelFirstValid(url, apis)
        if (!dl) return m.reply('❌ No se pudo obtener el enlace.')

        // Miniatura (Sin error de deprecación)
        let thumbBuffer = null
        try {
            if (thumb) {
                const response = await fetch(thumb)
                const arrayBuffer = await response.arrayBuffer() // ✅ Arreglado
                thumbBuffer = Buffer.from(arrayBuffer)
            }
        } catch {}

        if (type === 'audio') {
            await client.sendMessage(m.chat, { 
                audio: { url: dl }, 
                mimetype: 'audio/mpeg', 
                fileName: `${title}.mp3`,
                contextInfo: { externalAdReply: { title, body: 'Lucoa Bot 🐉', thumbnail: thumbBuffer, mediaType: 1, renderLargerThumbnail: true } }
            }, { quoted: m })

        } else if (type === 'video') {
            // Verificar tamaño
            try {
                const head = await fetch(dl, { method: 'HEAD' })
                const size = parseInt(head.headers.get('content-length') || 0) / (1024 * 1024)
                
                if (size > limit) {
                    await client.sendMessage(m.chat, { document: { url: dl }, fileName: `${title}.mp4`, mimetype: 'video/mp4', caption: `📂 Archivo pesado (${size.toFixed(2)}MB)` }, { quoted: m })
                } else {
                    await client.sendMessage(m.chat, { video: { url: dl }, fileName: `${title}.mp4`, mimetype: 'video/mp4', caption: `🎬 ${title}`, jpegThumbnail: thumbBuffer }, { quoted: m })
                }
            } catch {
                // Si falla el HEAD, enviar a ciegas
                await client.sendMessage(m.chat, { video: { url: dl }, fileName: `${title}.mp4`, mimetype: 'video/mp4', caption: `🎬 ${title}`, jpegThumbnail: thumbBuffer }, { quoted: m })
            }

        } else if (type === 'document') {
            await client.sendMessage(m.chat, { 
                document: { url: dl }, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, caption: `📂 ${title}`, jpegThumbnail: thumbBuffer 
            }, { quoted: m })
        }

        await m.react('✅')

    } catch (e) {
        console.error(e)
        m.reply(`❌ Error: ${e.message}`)
    }
}
