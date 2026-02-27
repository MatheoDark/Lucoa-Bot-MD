import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { exec } from 'child_process'
import { ytmp3, ytmp4, apimp3, apimp4, get_id } from '../../lib/ytscraper.js'
import { ogmp3 } from '../../lib/youtubedl.js'

const streamPipeline = promisify(pipeline)
const limit = 200 // Límite MB

// ==========================================
// 🛠️ UTILIDADES
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

function fixVideoWithFFmpeg(inputPath) {
    return new Promise((resolve) => {
        console.log(`[INFO] 🛠️ Convirtiendo para WhatsApp Móvil (Ultrafast)...`)
        const outputPath = inputPath.replace('.mp4', '_fixed.mp4')
        const cmd = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -movflags +faststart "${outputPath}"`
        
        exec(cmd, (error) => {
            if (error) {
                console.log('⚠️ FFmpeg falló, enviando original.')
                resolve(inputPath)
            } else {
                try { fs.unlinkSync(inputPath) } catch {}
                resolve(outputPath)
            }
        })
    })
}

// ==========================================
// 🔄 DESCARGA CON MÚLTIPLES FALLBACKS
// ==========================================
async function getDownloadUrl(url, isAudio) {
    const errors = []

    // 1. SaveTube (via ytscraper - dominio .vip)
    try {
        console.log('[INFO] 🔄 Intentando SaveTube...')
        const res = isAudio ? await ytmp3(url) : await ytmp4(url)
        if (res.status && res.download?.status && res.download?.url) {
            console.log('[INFO] ✅ SaveTube OK')
            return { dl: res.download.url, title: res.metadata?.title, source: 'SaveTube' }
        }
    } catch (e) { errors.push(`SaveTube: ${e.message}`) }

    // 2. Vreden API (fallback)
    try {
        console.log('[INFO] 🔄 Intentando Vreden API...')
        const res = isAudio ? await apimp3(url) : await apimp4(url)
        if (res?.status && res?.download?.url) {
            console.log('[INFO] ✅ Vreden API OK')
            return { dl: res.download.url, title: res.metadata?.title, source: 'Vreden' }
        }
    } catch (e) { errors.push(`Vreden: ${e.message}`) }

    // 3. ogmp3 (último fallback)
    try {
        console.log('[INFO] 🔄 Intentando ogmp3...')
        const format = isAudio ? '320' : '720'
        const type = isAudio ? 'audio' : 'video'
        const res = await ogmp3.download(url, format, type)
        if (res.status && res.result?.download) {
            console.log('[INFO] ✅ ogmp3 OK')
            return { dl: res.result.download, title: res.result.title, source: 'ogmp3' }
        }
    } catch (e) { errors.push(`ogmp3: ${e.message}`) }

    console.error('[ERROR] Todas las APIs fallaron:', errors)
    throw new Error('Todas las APIs fallaron. Intenta de nuevo más tarde.')
}

// ==========================================
// 🚀 COMANDO PRINCIPAL
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
                const id = get_id(text)
                if (id) {
                    videoInfo = await yts({ videoId: id })
                } else {
                    return m.reply('❌ Link inválido.')
                }
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

    try {
        const { dl, source } = await getDownloadUrl(url, isAudio)
        if (!dl) return m.reply('❌ No se pudo obtener el enlace de descarga.')

        // Miniatura
        let thumbBuffer = null
        try {
            if (thumb) {
                const response = await fetch(thumb)
                const arrayBuffer = await response.arrayBuffer()
                thumbBuffer = await sharp(Buffer.from(arrayBuffer)).resize(320, 180).jpeg({ quality: 80 }).toBuffer()
            }
        } catch {}

        // Descarga a archivo local
        let localFilePath = await downloadToLocal(dl, isAudio ? 'mp3' : 'mp4')

        // Fix Video (codec compatible con WhatsApp móvil)
        if (!isAudio) {
            localFilePath = await fixVideoWithFFmpeg(localFilePath)
        }

        const fileData = fs.readFileSync(localFilePath)
        const cleanTitle = sanitizeFileName(title)

        console.log(`[INFO] 📤 Enviando archivo... (${source})`)

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
