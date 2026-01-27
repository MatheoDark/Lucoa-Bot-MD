import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'
import axios from 'axios'
import crypto from 'crypto'

// --- 1. TU CLASE SAVETUBE (INTACTA) ---
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
            return r.data.cdn
        } catch { return 'media.savetube.vip' }
    }

    async download(url, isAudio) {
        const id = url.match(this.m)?.[3]
        if (!id) throw new Error('ID inválido')
        const cdn = await this.getCdn()
        const info = await this.is.post(`https://${cdn}/v2/info`, { url: `https://www.youtube.com/watch?v=${id}` })
        const dec = await this.decrypt(info.data.data)
        if (!dec) throw new Error('Error decrypt')
        
        const dl = await this.is.post(`https://${cdn}/download`, {
            id,
            downloadType: isAudio ? 'audio' : 'video',
            quality: isAudio ? '128' : '720',
            key: dec.key
        })
        return { dl: dl.data.data.downloadUrl, title: dec.title }
    }
}

// --- 2. UTILIDADES ---
// Reemplazo seguro de client.getFile para evitar tu error "Result is not a buffer"
async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' })
        return res.data
    } catch { return null }
}

const fetchParallelFirstValid = async (url, apis, timeout = 15000) => {
    return new Promise((resolve, reject) => {
        let settled = false
        let errors = 0
        const timer = setTimeout(() => {
            if (!settled) reject(new Error('Timeout'))
        }, timeout)

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
// 🚀 COMANDO LUCOA PLAY (CON MENÚ RESTAURADO)
// ==========================================
export default {
    command: ['play', 'mp3', 'playaudio', 'ytmp3', 'play2', 'mp4', 'playvideo', 'ytmp4'],
    category: 'downloader',

    run: async ({ client, m, args, command, text }) => {
        try {
            if (!text.trim()) return m.reply('Ara ara~ ¿Qué quieres escuchar? Escribe el nombre o link.')

            let url, title, videoInfo
            const isAutoMode = command !== 'play' // Si usa #play muestra menú, si usa #mp3 descarga directo

            // 1. BÚSQUEDA YOUTUBE
            try {
                if (/http/.test(text)) {
                    url = text
                    const vId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop()
                    videoInfo = await yts({ videoId: vId })
                } else {
                    const search = await yts(text)
                    if (!search.all.length) return m.reply('No encontré nada, tesoro.')
                    videoInfo = search.all[0]
                }
                url = videoInfo.url
                title = videoInfo.title
            } catch { return m.reply('Error buscando en YouTube. 😿') }

            // 2. MENÚ ESTILO LUCOA (Si usa solo #play)
            if (!isAutoMode) {
                const vistas = (videoInfo.views || 0).toLocaleString();
                const canal = videoInfo.author?.name || 'Desconocido';
                const timestamp = videoInfo.timestamp || 'Desconocido';
                const ago = videoInfo.ago || 'Desconocido';

                const infoMessage = `
*𖹭.╭╭ִ╼ׅ࣪ﮩ٨ـﮩ𝗒𝗈𝗎𝗍𝗎𝗏𝖾-𝗉꯭𝗅꯭𝖺꯭𝗒ﮩ٨ـﮩׅ╾࣪╮╮.𖹭*
> ♡ *Título:* ${title}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Duración:* ${timestamp}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Vistas:* ${vistas}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Canal:* ${canal}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Publicado:* ${ago}
*⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ׄۛ۫۫۫۫۫۫ۜ*

*Ara ara~ Responde con:*
🎵 *1* para Audio
🎬 *2* para Video
📂 *3* para Documento
`
                // Descargamos la miniatura con axios (SOLUCIÓN AL ERROR client.getFile)
                let thumb = await getBuffer(videoInfo.thumbnail)
                if (!thumb) thumb = await getBuffer('https://i.imgur.com/4L7dK0O.png')

                // Guardamos estado para esperar respuesta
                global.play_pending = global.play_pending || {}
                global.play_pending[m.chat] = { url, title, thumb, sender: m.sender }

                await client.sendMessage(m.chat, { image: thumb, caption: infoMessage }, { quoted: m })
                return
            }

            // 3. DESCARGA DIRECTA (Si usó #mp3 o #mp4)
            const type = ['mp3', 'playaudio', 'ytmp3'].includes(command) ? 'audio' : 'video'
            await processDownload(client, m, url, type, title, videoInfo.thumbnail)

        } catch (e) {
            console.error(e)
            m.reply(`❌ ${e.message}`)
        }
    },

    // 4. DETECTOR DE RESPUESTA (El Menú interactivo)
    before: async (m, { client }) => {
        const text = m.text?.toLowerCase().trim()
        if (!['1', '2', '3', 'audio', 'video', 'doc'].includes(text)) return false

        const pending = global.play_pending?.[m.chat]
        if (!pending || pending.sender !== m.sender) return false

        delete global.play_pending[m.chat]

        let type = 'audio'
        if (text === '1' || text === 'audio') type = 'audio'
        if (text === '2' || text === 'video') type = 'video'
        if (text === '3' || text === 'doc') type = 'document'

        await processDownload(client, m, pending.url, type, pending.title, pending.thumb)
        return true
    }
}

// --- 5. LOGICA DE DESCARGA (TUS APIS) ---
async function processDownload(client, m, url, type, title, thumb) {
    const isAudio = type === 'audio' || type === 'document'
    m.reply(isAudio ? '🎧 _Ara ara~ Buscando audio..._' : '🎬 _Ara ara~ Buscando video..._')

    try {
        // --- DEFINICIÓN DE TUS APIs (Integradas aquí) ---
        const saveTubeFallback = {
            custom: true,
            run: async (u) => { const sv = new SaveTube(); return await sv.download(u, isAudio) }
        }

        const nekolabsApi = {
            url: (u) => `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(u)}&format=${isAudio ? 'mp3' : '720'}`,
            validate: (r) => r.success && r.result?.downloadUrl,
            parse: (r) => ({ dl: r.result.downloadUrl, title: r.result.title })
        }

        const aioApi = {
            url: (u) => `https://anabot.my.id/api/download/aio?url=${encodeURIComponent(u)}&apikey=freeApikey`,
            validate: (r) => !r.error && r.medias?.length > 0,
            parse: (r) => {
                const media = r.medias.find(x => isAudio ? x.type === 'audio' : x.type === 'video' && x.ext === 'mp4')
                return { dl: media?.url, title: r.title }
            }
        }

        const anabotApi = {
            url: (u) => `https://anabot.my.id/api/download/${isAudio ? 'ytmp3' : 'ytmp4'}?url=${encodeURIComponent(u)}${isAudio ? '' : '&quality=720'}&apikey=freeApikey`,
            validate: (r) => r?.success && r?.data?.result?.urls,
            parse: (r) => ({ dl: r.data.result.urls, title: r.data.result.metadata?.title })
        }

        const nexevoApi = {
            url: (u) => `https://nexevo-api.vercel.app/download/${isAudio ? 'y' : 'y2'}?url=${encodeURIComponent(u)}`,
            validate: (r) => r?.status && r?.result?.url,
            parse: (r) => ({ dl: r.result.url, title: r.result.info?.title })
        }

        // Lista de APIs a probar
        const apis = [nexevoApi, anabotApi, nekolabsApi, aioApi, saveTubeFallback]
        
        // Ejecutar descarga paralela
        const { dl, title: apiTitle } = await fetchParallelFirstValid(url, apis)
        const finalTitle = apiTitle || title || 'Lucoa Media'

        // Procesar Miniatura con Sharp (Si falla, usa buffer normal)
        let thumbBuffer = null
        try {
            if (Buffer.isBuffer(thumb)) {
                thumbBuffer = await sharp(thumb).resize(320, 180).jpeg({ quality: 80 }).toBuffer()
            } else if (typeof thumb === 'string') {
                const buf = await getBuffer(thumb)
                if (buf) thumbBuffer = await sharp(buf).resize(320, 180).jpeg({ quality: 80 }).toBuffer()
            }
        } catch { 
            // Si sharp falla, usamos el buffer original si existe
            thumbBuffer = Buffer.isBuffer(thumb) ? thumb : null 
        }

        // ENVIAR ARCHIVO
        if (type === 'audio') {
            await client.sendMessage(m.chat, { 
                audio: { url: dl }, mimetype: 'audio/mpeg', fileName: `${finalTitle}.mp3`,
                contextInfo: { externalAdReply: { title: finalTitle, body: 'Lucoa Bot', thumbnail: thumbBuffer, mediaType: 1, renderLargerThumbnail: true } }
            }, { quoted: m })
        } else if (type === 'video') {
            await client.sendMessage(m.chat, { 
                video: { url: dl }, mimetype: 'video/mp4', fileName: `${finalTitle}.mp4`, caption: `🎬 ${finalTitle}`,
                jpegThumbnail: thumbBuffer 
            }, { quoted: m })
        } else if (type === 'document') {
            await client.sendMessage(m.chat, { 
                document: { url: dl }, mimetype: 'audio/mpeg', fileName: `${finalTitle}.mp3`, caption: `📂 ${finalTitle}`,
                jpegThumbnail: thumbBuffer 
            }, { quoted: m })
        }

    } catch (e) {
        console.error(e)
        m.reply(`❌ Fallaron todas las APIs: ${e.message}`)
    }
}
