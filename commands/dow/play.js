import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'
import axios from 'axios'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { exec } from 'child_process'

const streamPipeline = promisify(pipeline)

// ==========================================
// 🛠️ 1. CLASE SAVETUBE (INTACTA)
// ==========================================
class SaveTube {
    constructor() {
        this.ky = 'C5D58EF67A7584E4A29F6C35BBC4EB12'
        this.headers = {
            'content-type': 'application/json',
            'origin': 'https://yt.savetube.me',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
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
            const { data } = await axios.get('https://media.savetube.vip/api/random-cdn', { headers: this.headers })
            return data.cdn || 'media.savetube.vip'
        } catch { return 'media.savetube.vip' }
    }
    async download(url, isAudio) {
        const id = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1]
        if (!id) throw new Error('ID inválido')

        const cdn = await this.getCdn()
        const info = await axios.post(`https://${cdn}/v2/info`, { url: `https://www.youtube.com/watch?v=${id}` }, { headers: this.headers })
        const dec = await this.decrypt(info.data.data)
        if (!dec) throw new Error('Error decrypt SaveTube')

        const dl = await axios.post(`https://${cdn}/download`, {
            id,
            downloadType: isAudio ? 'audio' : 'video',
            quality: isAudio ? '128' : '720',
            key: dec.key
        }, { headers: this.headers })

        return { dl: dl.data.data.downloadUrl, title: dec.title }
    }
}

// ==========================================
// 🛠️ 2. UTILIDADES MEJORADAS
// ==========================================

// Regex robusto para sacar IDs de cualquier link de YT (Shorts, Live, Mobile)
const extractVideoId = (url) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
    return match ? match[1] : null
}

async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' })
        return res.data
    } catch { return null }
}

const sanitizeFileName = (s) => String(s).replace(/[^a-zA-Z0-9]/g, '_')

async function downloadToLocal(url, ext) {
    const tmpDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
    const filePath = path.join(tmpDir, `${Date.now()}.${ext}`)
    
    const response = await axios({
        url, method: 'GET', responseType: 'stream',
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    })

    const contentType = response.headers['content-type']
    if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) {
        throw new Error('El link devolvió una web, no un archivo multimedia.')
    }

    await streamPipeline(response.data, fs.createWriteStream(filePath))
    
    const stats = fs.statSync(filePath)
    if (stats.size < 10000) { // < 10KB es error
        fs.unlinkSync(filePath)
        throw new Error('Archivo corrupto o vacío.')
    }
    return filePath
}

function fixVideoWithFFmpeg(inputPath) {
    return new Promise((resolve) => {
        const outputPath = inputPath.replace('.mp4', '_fixed.mp4')
        const cmd = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset ultrafast -c:a aac -movflags +faststart "${outputPath}"`
        exec(cmd, (error) => {
            if (error) {
                console.log('⚠️ FFmpeg error, enviando original...')
                resolve(inputPath)
            } else {
                try { fs.unlinkSync(inputPath) } catch {}
                resolve(outputPath)
            }
        })
    })
}

const fetchParallelFirstValid = async (url, apis, timeout = 25000) => {
    return new Promise((resolve, reject) => {
        let settled = false
        let errors = 0
        const timer = setTimeout(() => { if (!settled) reject(new Error('Timeout APIS')) }, timeout)

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
        const chatId = m.chat
        
        try {
            // --- MENÚ INTERACTIVO (1, 2, 3) ---
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

            if (!text.trim()) return m.reply('🐲 *Uso:* #play Link o Nombre')

            let videoUrl = null
            let videoInfo = null
            let title = ''

            // --- DETECCIÓN DE LINK O BÚSQUEDA ---
            const videoId = extractVideoId(text) // Usamos el detector mejorado
            
            try {
                if (videoId) {
                    // Es un link válido
                    videoUrl = `https://www.youtube.com/watch?v=${videoId}`
                    videoInfo = await yts({ videoId })
                    title = videoInfo.title
                } else {
                    // Es una búsqueda
                    m.react('🔎')
                    const search = await yts(text)
                    if (!search.all.length) return m.reply('❌ No encontré resultados.')
                    videoInfo = search.all[0]
                    videoUrl = videoInfo.url
                    title = videoInfo.title
                }
            } catch (e) {
                return m.reply('❌ Error buscando en YouTube.')
            }

            // --- EJECUCIÓN DIRECTA (#mp3 / #mp4) ---
            if (['mp3', 'ytmp3', 'audio', 'playaudio'].includes(command)) {
                return await executeDownload(client, m, videoUrl, 'audio', title, videoInfo.thumbnail)
            }
            if (['mp4', 'ytmp4', 'video', 'playvideo'].includes(command)) {
                return await executeDownload(client, m, videoUrl, 'video', title, videoInfo.thumbnail)
            }

            // --- MENÚ PRINCIPAL ---
            const caption = `╭━━━〔 🐲 𝗟𝗨𝗖𝗢𝗔 • Play 〕━━━⬣
┃ 🥥 *Título:* ${title}
┃ ⏱️ *Duración:* ${videoInfo.timestamp}
┃ 👤 *Canal:* ${videoInfo.author.name}
╰━━━━━━━━━━━━━━━━━━━━⬣

Responde con el número:
🎵 *1* Audio (MP3)
🎬 *2* Video (MP4)
📂 *3* Documento`

            // Obtener buffer de miniatura
            let thumb = await getBuffer(videoInfo.thumbnail)
            if (!thumb) thumb = await getBuffer('https://i.imgur.com/4L7dK0O.png')

            const msg = await client.sendMessage(chatId, { image: thumb, caption }, { quoted: m })

            global.play_pending = global.play_pending || {}
            global.play_pending[chatId] = {
                url: videoUrl,
                title: title,
                thumb: videoInfo.thumbnail,
                sender: m.sender,
                key: msg.key
            }

        } catch (e) {
            console.error(e)
            m.reply(`❌ ${e.message}`)
        }
    },

    // --- CAPTURADOR DE RESPUESTAS (before) ---
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
        
        await executeDownload(client, m, pending.url, type, pending.title, pending.thumb)
        return true
    }
}

// ⚙️ FUNCIÓN DE PROCESAMIENTO
async function executeDownload(client, m, url, type, title, thumb) {
    const isAudio = type === 'audio' || type === 'document'
    await m.react(isAudio ? '🎧' : '🎬')

    try {
        // --- 1. CONFIGURACIÓN DE APIS (Añadí Delirius para velocidad) ---
        
        const deliriusApi = {
            url: (u) => `https://delirius-api-oficial.vercel.app/api/${isAudio ? 'ytmp3' : 'ytmp4'}?url=${u}`,
            validate: (r) => r.status && r.data?.download?.url,
            parse: (r) => ({ dl: r.data.download.url, title: r.data.title })
        }

        const nekolabsApi = {
            url: (u) => `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(u)}&format=${isAudio ? 'mp3' : '720'}`,
            validate: (r) => r.success && r.result?.downloadUrl,
            parse: (r) => ({ dl: r.result.downloadUrl, title: r.result.title })
        }

        const anabotApi = {
            url: (u) => `https://anabot.my.id/api/download/${isAudio ? 'ytmp3' : 'ytmp4'}?url=${encodeURIComponent(u)}${isAudio ? '' : '&quality=720'}&apikey=freeApikey`,
            validate: (r) => r?.success && r?.data?.result?.urls,
            parse: (r) => ({ dl: r.data.result.urls, title: r.data.result.metadata?.title })
        }

        const saveTubeFallback = {
            custom: true,
            run: async (u) => { const sv = new SaveTube(); return await sv.download(u, isAudio) }
        }

        // 🚀 PRIORIDAD: Delirius > Nekolabs > Anabot > SaveTube
        const apis = [deliriusApi, nekolabsApi, anabotApi, saveTubeFallback]
        
        const { dl, title: apiTitle } = await fetchParallelFirstValid(url, apis)
        const finalTitle = apiTitle || title || 'Lucoa Media'
        const cleanTitle = sanitizeFileName(finalTitle)

        // --- 2. PROCESAR MINIATURA (Sin advertencias) ---
        let thumbBuffer = null
        try {
            if (thumb) {
                const response = await fetch(thumb)
                const arrayBuffer = await response.arrayBuffer() // ✅ Corregido node-fetch warning
                thumbBuffer = await sharp(Buffer.from(arrayBuffer)).resize(320, 180).jpeg({ quality: 80 }).toBuffer()
            }
        } catch { thumbBuffer = null }

        // --- 3. DESCARGA LOCAL (VPS Optimization) ---
        let localFilePath
        try {
             // Descargamos mp3 o mp4
             localFilePath = await downloadToLocal(dl, isAudio ? 'mp3' : 'mp4')
        } catch (dlErr) {
             throw new Error('API entregó enlace roto, reintenta.')
        }

        // --- 4. FIX VIDEO ---
        if (!isAudio) {
            localFilePath = await fixVideoWithFFmpeg(localFilePath)
        }

        const fileData = fs.readFileSync(localFilePath)

        // --- 5. ENVIAR ---
        if (type === 'audio') {
            await client.sendMessage(m.chat, { 
                audio: fileData, mimetype: 'audio/mpeg', fileName: `${cleanTitle}.mp3`,
                contextInfo: { externalAdReply: { title: finalTitle, body: 'Lucoa Bot', thumbnail: thumbBuffer, mediaType: 1, renderLargerThumbnail: true } }
            }, { quoted: m })
        } else if (type === 'video') {
            await client.sendMessage(m.chat, { 
                video: fileData, mimetype: 'video/mp4', fileName: `${cleanTitle}.mp4`, caption: `🎬 ${finalTitle}`,
                jpegThumbnail: thumbBuffer 
            }, { quoted: m })
        } else if (type === 'document') {
            await client.sendMessage(m.chat, { 
                document: fileData, mimetype: 'audio/mpeg', fileName: `${cleanTitle}.mp3`, caption: `📂 ${finalTitle}`,
                jpegThumbnail: thumbBuffer 
            }, { quoted: m })
        }

        // Limpieza
        try { fs.unlinkSync(localFilePath) } catch {}
        await m.react('✅')

    } catch (e) {
        console.error(e)
        m.reply(`❌ Error: ${e.message}`)
    }
}
