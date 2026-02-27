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
const limit = 200 // Límite MB

// ==========================================
// 🛠️ 1. CLASE SAVETUBE (MANUAL)
// ==========================================
class SaveTube {
    constructor() {
        this.ky = 'C5D58EF67A7584E4A29F6C35BBC4EB12'
        this.m = /^((?:https?:)?\/\/)?((?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?([a-zA-Z0-9_-]{11})/
        this.is = axios.create({
            headers: {
                'content-type': 'application/json',
                origin: 'https://yt.savetube.me',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
        if (!dec) throw new Error('Fallo decrypt SaveTube')
        
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
// 🛠️ 2. UTILIDADES (CON ARREGLO PARA MÓVIL)
// ==========================================
async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' })
        return res.data
    } catch { return null }
}

const sanitizeFileName = (s) => String(s).replace(/[^a-zA-Z0-9]/g, '_')

async function downloadToLocal(url, ext) {
    console.log(`[INFO] ⬇️ Descargando archivo: ${ext}`)
    const tmpDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
    const filePath = path.join(tmpDir, `${Date.now()}.${ext}`)
    
    try {
        const response = await axios({
            url, method: 'GET', responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        })
        await streamPipeline(response.data, fs.createWriteStream(filePath))
        return filePath
    } catch (e) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
        throw e
    }
}

// 🔥 AQUÍ ESTÁ EL ARREGLO PARA MÓVIL
function fixVideoWithFFmpeg(inputPath) {
    return new Promise((resolve) => {
        console.log(`[INFO] 🛠️ Convirtiendo para WhatsApp Móvil (Ultrafast)...`)
        const outputPath = inputPath.replace('.mp4', '_fixed.mp4')
        
        // EXPLICACIÓN DEL CAMBIO:
        // -c:v libx264: Obliga a usar el formato compatible con Android/iOS.
        // -preset ultrafast: Lo hace a la máxima velocidad posible (casi instantáneo).
        // -pix_fmt yuv420p: Vital para que WhatsApp reconozca los colores.
        // -c:a aac: Asegura que el audio se escuche.
        
        const cmd = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -movflags +faststart "${outputPath}"`
        
        exec(cmd, (error) => {
            if (error) {
                console.log('⚠️ FFmpeg falló, enviando original (puede fallar en móvil).')
                resolve(inputPath)
            } else {
                try { fs.unlinkSync(inputPath) } catch {}
                resolve(outputPath)
            }
        })
    })
}

// API FETCHER PARALELO
const fetchParallelFirstValid = async (url, apis, timeout = 25000) => {
    return new Promise((resolve, reject) => {
        let settled = false
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true
                reject(new Error('Timeout: Ninguna API respondió a tiempo. Intenta de nuevo.'))
            }
        }, timeout)

        let apiErrors = []
        let apiCount = apis.length
        let completedCount = 0

        apis.forEach((api, index) => {
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
                        console.log(`[INFO] ✅ API Ganadora: ${result.source || 'Desconocida'}`)
                        clearTimeout(timer)
                        resolve(result)
                    } else {
                        completedCount++
                        if (completedCount === apiCount && !settled) {
                            settled = true
                            clearTimeout(timer)
                            reject(new Error('Todas las APIs fallaron. Intenta con otro enlace.'))
                        }
                    }
                } catch (err) {
                    apiErrors[index] = err.message
                    completedCount++
                    console.warn(`⚠️ API ${index + 1} falló: ${err.message}`)
                    
                    if (completedCount === apiCount && !settled) {
                        settled = true
                        clearTimeout(timer)
                        reject(new Error(`Todas las APIs fallaron: ${apiErrors.filter(Boolean).join(', ')}`))
                    }
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
        
        // --- MENÚ RESPUESTA ---
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

        let url, title, videoInfo
        
        // --- BÚSQUEDA ---
        console.log(`[INFO] 🔎 Buscando: ${text}`)
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

        // --- DIRECTO ---
        if (['mp3', 'ytmp3', 'playaudio'].includes(command)) {
            return await executeDownload(client, m, url, 'audio', title, videoInfo.thumbnail)
        }
        if (['mp4', 'ytmp4', 'playvideo'].includes(command)) {
            return await executeDownload(client, m, url, 'video', title, videoInfo.thumbnail)
        }

        // --- MENÚ ---
        const caption = `╭━━━〔 🐲 𝗟𝗨𝗖𝗢𝗔 • Play 〕━━━⬣
┃ 🥥 *Título:* ${title}
┃ ⏱️ *Duración:* ${videoInfo.timestamp}
┃ 👤 *Canal:* ${videoInfo.author.name}
╰━━━━━━━━━━━━━━━━━━━━⬣

Responde con el número:
🎵 *1* Audio (MP3)
🎬 *2* Video (MP4)
📂 *3* Documento`

        let thumb = await getBuffer(videoInfo.thumbnail)
        const msg = await client.sendMessage(chatId, { image: thumb || undefined, caption }, { quoted: m })

        global.play_pending = global.play_pending || {}
        global.play_pending[chatId] = {
            url, title, thumb: videoInfo.thumbnail, sender: m.sender, key: msg.key
        }
    },

    before: async (m, { client }) => {
        if (!global.play_pending?.[m.chat]) return false
        if (m.key.fromMe) return false
        const text = m.text?.toLowerCase().trim()
        if (!['1', '2', '3'].includes(text)) return false
        const pending = global.play_pending[m.chat]
        if (pending.sender !== m.sender) return false
        delete global.play_pending[m.chat]
        
        let type = 'audio'
        if (text === '2') type = 'video'
        if (text === '3') type = 'document'
        
        await executeDownload(client, m, pending.url, type, pending.title, pending.thumb)
        return true
    }
}

// ⚙️ FUNCIÓN EJECUTORA
async function executeDownload(client, m, url, type, title, thumb) {
    const isAudio = type === 'audio' || type === 'document'
    await m.react(isAudio ? '🎧' : '🎬')

    // CONFIGURACIÓN DE APIS (Solo las rápidas + Manual)
    const nekolabsApi = {
        url: (u) => `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(u)}&format=${isAudio ? 'mp3' : '720'}`,
        validate: (r) => r.success && r.result?.downloadUrl,
        parse: (r) => ({ dl: r.result.downloadUrl, title: r.result.title, source: 'Nekolabs' })
    }

    const anabotApi = {
        url: (u) => `https://anabot.my.id/api/download/${isAudio ? 'ytmp3' : 'ytmp4'}?url=${encodeURIComponent(u)}${isAudio ? '' : '&quality=720'}&apikey=freeApikey`,
        validate: (r) => r?.data?.result?.urls,
        parse: (r) => ({ dl: r.data.result.urls, title: r.data.result.metadata?.title, source: 'Anabot' })
    }

    const saveTubeFallback = {
        custom: true,
        run: async (u) => { 
            console.log('[INFO] ⚠️ Usando modo Manual (SaveTube)...')
            const sv = new SaveTube()
            const res = await sv.download(u, isAudio)
            return { ...res, source: 'SaveTube Manual' }
        }
    }

    // Orden de prioridad
    const apis = [nekolabsApi, anabotApi, saveTubeFallback]

    try {
        const { dl, source } = await fetchParallelFirstValid(url, apis)
        if (!dl) return m.reply('❌ No se pudo obtener el enlace.')

        // Miniatura
        let thumbBuffer = null
        try {
            if (thumb) {
                const response = await fetch(thumb)
                const arrayBuffer = await response.arrayBuffer()
                thumbBuffer = await sharp(Buffer.from(arrayBuffer)).resize(320, 180).jpeg({ quality: 80 }).toBuffer()
            }
        } catch {}

        // Descarga
        let localFilePath = await downloadToLocal(dl, isAudio ? 'mp3' : 'mp4')

        // Fix Video (SOLO SI ES VIDEO, REPARAMOS EL CODEC)
        if (!isAudio) {
            localFilePath = await fixVideoWithFFmpeg(localFilePath)
        }

        const fileData = fs.readFileSync(localFilePath)
        const cleanTitle = sanitizeFileName(title)

        console.log(`[INFO] 📤 Enviando archivo...`)

        if (type === 'audio') {
            await client.sendMessage(m.chat, { 
                audio: fileData, mimetype: 'audio/mpeg', fileName: `${cleanTitle}.mp3`,
                contextInfo: { externalAdReply: { title: title, body: `Fuente: ${source}`, thumbnail: thumbBuffer, mediaType: 1, renderLargerThumbnail: true } }
            }, { quoted: m })

        } else if (type === 'video') {
            await client.sendMessage(m.chat, { 
                video: fileData, mimetype: 'video/mp4', fileName: `${cleanTitle}.mp4`, caption: `🎬 ${title}`,
                jpegThumbnail: thumbBuffer 
            }, { quoted: m })

        } else if (type === 'document') {
            await client.sendMessage(m.chat, { 
                document: fileData, mimetype: 'audio/mpeg', fileName: `${cleanTitle}.mp3`, caption: `📂 ${title}`,
                jpegThumbnail: thumbBuffer 
            }, { quoted: m })
        }

        try { fs.unlinkSync(localFilePath) } catch {}
        await m.react('✅')

    } catch (e) {
        console.error(e)
        m.reply(`❌ Error: ${e.message}`)
    }
}
