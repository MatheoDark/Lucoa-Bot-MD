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
        const outputPath = inputPath.replace('.mp4', '_fixed.mp4')
        const cmd = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -movflags +faststart "${outputPath}"`
        exec(cmd, (error) => {
            if (error) {
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

    // 1. SaveTube (via ytscraper)
    try {
        const res = isAudio ? await ytmp3(url) : await ytmp4(url)
        if (res.status && res.download?.status && res.download?.url) {
            return { dl: res.download.url, title: res.metadata?.title, source: 'SaveTube' }
        }
    } catch (e) { errors.push(`SaveTube: ${e.message}`) }

    // 2. ogmp3 (apiapi.lat)
    try {
        const format = isAudio ? '320' : '720'
        const type = isAudio ? 'audio' : 'video'
        const res = await ogmp3.download(url, format, type)
        if (res.status && res.result?.download) {
            return { dl: res.result.download, title: res.result.title, source: 'ogmp3' }
        }
    } catch (e) { errors.push(`ogmp3: ${e.message}`) }

    // 3. Vreden API
    try {
        const res = isAudio ? await apimp3(url) : await apimp4(url)
        if (res?.status && res?.download?.url) {
            return { dl: res.download.url, title: res.metadata?.title, source: 'Vreden' }
        }
    } catch (e) { errors.push(`Vreden: ${e.message}`) }

    // 4. Nekolabs API
    try {
        const apiUrl = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(url)}&format=${isAudio ? 'mp3' : '720'}`
        const res = await fetch(apiUrl)
        const json = await res.json()
        if (json.success && json.result?.downloadUrl) {
            return { dl: json.result.downloadUrl, title: json.result.title, source: 'Nekolabs' }
        }
    } catch (e) { errors.push(`Nekolabs: ${e.message}`) }

    // 5. Anabot API
    try {
        const endpoint = isAudio ? 'ytmp3' : 'ytmp4'
        const apiUrl = `https://anabot.my.id/api/download/${endpoint}?url=${encodeURIComponent(url)}${isAudio ? '' : '&quality=720'}&apikey=freeApikey`
        const res = await fetch(apiUrl)
        const json = await res.json()
        if (json?.data?.result?.urls) {
            return { dl: json.data.result.urls, title: json.data.result.metadata?.title, source: 'Anabot' }
        }
    } catch (e) { errors.push(`Anabot: ${e.message}`) }

    throw new Error('Todas las APIs fallaron. Intenta de nuevo más tarde.')
}

// ==========================================
// 🚀 COMANDO PRINCIPAL
// ==========================================
export default {
    command: ['song', 'yta', 'ytaudio', 'video', 'ytv', 'ytvideo'],
    category: 'downloader',

    run: async ({ client, m, args, command, text }) => {
        if (!text?.trim()) return m.reply(`🐲 *Uso:* #${command} <nombre o link de YouTube>`)

        const isVideo = ['video', 'ytv', 'ytvideo'].includes(command)
        const isAudio = !isVideo

        let url, title, videoInfo

        // --- BÚSQUEDA ---
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

        await m.react(isAudio ? '🎧' : '🎬')

        try {
            const { dl, source } = await getDownloadUrl(url, isAudio)
            if (!dl) return m.reply('❌ No se pudo obtener el enlace de descarga.')

            // Miniatura
            let thumbBuffer = null
            try {
                if (videoInfo.thumbnail) {
                    const response = await fetch(videoInfo.thumbnail)
                    const arrayBuffer = await response.arrayBuffer()
                    thumbBuffer = await sharp(Buffer.from(arrayBuffer)).resize(320, 180).jpeg({ quality: 80 }).toBuffer()
                }
            } catch {}

            // Descarga a archivo local
            let localFilePath = await downloadToLocal(dl, isAudio ? 'mp3' : 'mp4')

            // Fix Video si es necesario
            if (isVideo) {
                localFilePath = await fixVideoWithFFmpeg(localFilePath)
            }

            const fileData = fs.readFileSync(localFilePath)
            const cleanTitle = sanitizeFileName(title)

            if (isAudio) {
                await client.sendMessage(m.chat, {
                    audio: fileData,
                    mimetype: 'audio/mpeg',
                    fileName: `${cleanTitle}.mp3`,
                    contextInfo: {
                        externalAdReply: {
                            title: title,
                            body: `${videoInfo.author?.name || ''} • ${videoInfo.timestamp || ''}`,
                            thumbnail: thumbBuffer,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m })
            } else {
                await client.sendMessage(m.chat, {
                    video: fileData,
                    mimetype: 'video/mp4',
                    fileName: `${cleanTitle}.mp4`,
                    caption: `🎬 *${title}*\n👤 ${videoInfo.author?.name || ''}\n⏱️ ${videoInfo.timestamp || ''}`,
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
}
