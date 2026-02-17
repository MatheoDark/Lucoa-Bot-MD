import yts from 'yt-search'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pipeline } from 'stream'
import { promisify } from 'util'

// 🗑️ ELIMINAMOS RUHEND-SCRAPER PORQUE ESTÁ ROTO
// import ruhend from 'ruhend-scraper' <--- BORRADO

const streamPipeline = promisify(pipeline)

// ==========================================
// 🛠️ 1. CLASE SAVETUBE (Tu respaldo manual)
// ==========================================
class SaveTube {
    constructor() {
        this.ky = 'C5D58EF67A7584E4A29F6C35BBC4EB12'
        this.headers = {
            'content-type': 'application/json',
            'origin': 'https://yt.savetube.me',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
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

    async download(url, type) {
        const id = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1]
        if (!id) throw new Error('ID no válido')

        const cdn = await this.getCdn()
        const infoUrl = `https://${cdn}/v2/info`
        const { data: infoData } = await axios.post(infoUrl, { url: `https://www.youtube.com/watch?v=${id}` }, { headers: this.headers })
        
        const decrypted = await this.decrypt(infoData.data)
        if (!decrypted) throw new Error('Fallo al desencriptar SaveTube')

        const dlUrl = `https://${cdn}/download`
        const body = {
            id,
            downloadType: type === 'audio' ? 'audio' : 'video',
            quality: type === 'audio' ? '128' : '720',
            key: decrypted.key
        }
        
        const { data: dlData } = await axios.post(dlUrl, body, { headers: this.headers })
        if (!dlData.data?.downloadUrl) throw new Error('SaveTube no devolvió URL')
        
        return {
            url: dlData.data.downloadUrl,
            title: decrypted.title || 'YouTube Media',
            source: 'SaveTube'
        }
    }
}

// ==========================================
// 🛠️ 2. UTILIDADES
// ==========================================

const cleanYtUrl = (text) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const match = text.match(regex)
    return match ? `https://www.youtube.com/watch?v=${match[1]}` : null
}

async function downloadFile(url, extension) {
    const tmpDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
    const filePath = path.join(tmpDir, `${Date.now()}.${extension}`)

    try {
        const response = await axios({
            url, method: 'GET', responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        })
        await streamPipeline(response.data, fs.createWriteStream(filePath))
        const stats = fs.statSync(filePath)
        if (stats.size < 10000) { 
            fs.unlinkSync(filePath)
            throw new Error('Archivo corrupto (0kb)')
        }
        return filePath
    } catch (e) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
        throw e
    }
}

// ==========================================
// 🔄 3. GESTOR DE APIS (Solo APIs rápidas)
// ==========================================
async function getMediaUrl(url, type) {
    const isAudio = type === 'audio'

    // 🟡 INTENTO 1: Delirius API (Muy estable)
    try {
        console.log('Probando Delirius...')
        const apiUrl = `https://delirius-api-oficial.vercel.app/api/${isAudio ? 'ytmp3' : 'ytmp4'}?url=${url}`
        const { data } = await axios.get(apiUrl)
        if (data.status && data.data?.download?.url) {
            return { url: data.data.download.url, title: data.data.title, source: 'Delirius' }
        }
    } catch (e) { console.log('Delirius falló.') }

    // 🟠 INTENTO 2: Vreden API (Respaldo)
    try {
        console.log('Probando Vreden...')
        const apiUrl = `https://api.vreden.my.id/api/${isAudio ? 'ytmp3' : 'ytmp4'}?url=${url}&cp=kb`
        const { data } = await axios.get(apiUrl)
        if (data.status && data.result?.download?.url) {
            return { url: data.result.download.url, title: data.result.metadata.title, source: 'Vreden' }
        }
    } catch (e) { console.log('Vreden falló.') }

    // 🔴 INTENTO 3 (FINAL): SaveTube (Manual)
    try {
        console.log('Probando SaveTube Manual...')
        const manual = new SaveTube()
        return await manual.download(url, type)
    } catch (e) {
        console.error('Manual falló:', e.message)
    }

    throw new Error('Todas las APIs fallaron. Intenta de nuevo.')
}

// ==========================================
// 🚀 4. COMANDO
// ==========================================
export default {
    command: ['play', 'mp3', 'mp4', 'ytmp3', 'ytmp4', 'video', 'audio'],
    category: 'downloader',

    run: async ({ client, m, args, command, text }) => {
        const chatId = m.chat
        
        // --- SELECCIÓN EN MENÚ (1, 2, 3) ---
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

        if (!text) return m.reply(`🐲 *Uso:* #play Link o Nombre`)

        await m.react('🔍') // Reacción para saber que está buscando

        let videoUrl = null
        let videoInfo = null

        // Detectar si es Link o Búsqueda
        const directLink = cleanYtUrl(text)
        
        try {
            if (directLink) {
                videoUrl = directLink
                const id = directLink.split('v=')[1]
                videoInfo = await yts({ videoId: id })
            } else {
                const search = await yts(text)
                if (!search.all.length) return m.reply('❌ No encontré nada.')
                videoInfo = search.all[0]
                videoUrl = videoInfo.url
            }
        } catch (e) {
            return m.reply('❌ Error buscando en YouTube (yt-search falló).')
        }

        // Ejecución directa (#mp3, #mp4)
        if (['mp3', 'ytmp3', 'audio'].includes(command)) {
            return await executeDownload(client, m, videoUrl, 'audio', videoInfo.title, videoInfo.thumbnail)
        }
        if (['mp4', 'ytmp4', 'video'].includes(command)) {
            return await executeDownload(client, m, videoUrl, 'video', videoInfo.title, videoInfo.thumbnail)
        }

        // MENÚ PRINCIPAL
        const caption = `╭━━━〔 🐲 𝗟𝗨𝗖𝗢𝗔 • Play 〕━━━⬣
┃ 🥥 *Título:* ${videoInfo.title}
┃ ⏱️ *Duración:* ${videoInfo.timestamp}
┃ 👤 *Canal:* ${videoInfo.author.name}
╰━━━━━━━━━━━━━━━━━━━━⬣

Responde con el número:
🎵 *1* Audio (MP3)
🎬 *2* Video (MP4)
📂 *3* Documento`

        const msg = await client.sendMessage(chatId, { 
            image: { url: videoInfo.thumbnail }, 
            caption 
        }, { quoted: m })

        global.play_pending = global.play_pending || {}
        global.play_pending[chatId] = {
            url: videoUrl,
            title: videoInfo.title,
            thumb: videoInfo.thumbnail,
            sender: m.sender,
            key: msg.key
        }
    }
}

// ⚙️ FUNCIÓN EJECUTORA
async function executeDownload(client, m, url, type, title, thumb) {
    const isAudio = type === 'audio' || type === 'document'
    await m.react(isAudio ? '🎧' : '🎬')

    try {
        const media = await getMediaUrl(url, isAudio ? 'audio' : 'video')
        
        // Descargar al VPS
        const filePath = await downloadFile(media.url, isAudio ? 'mp3' : 'mp4')
        const fileName = `${title.replace(/[^a-zA-Z0-9 ]/g, '')}.${isAudio ? 'mp3' : 'mp4'}`

        // Enviar
        if (type === 'audio') {
            await client.sendMessage(m.chat, { 
                audio: { url: filePath }, 
                mimetype: 'audio/mpeg', 
                fileName: fileName,
                contextInfo: {
                    externalAdReply: {
                        title: title,
                        body: `Fuente: ${media.source}`,
                        thumbnailUrl: thumb,
                        sourceUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })
        } 
        else if (type === 'video') {
            await client.sendMessage(m.chat, { 
                video: { url: filePath }, 
                caption: `🐲 ${title}`, 
                mimetype: 'video/mp4',
                fileName: fileName 
            }, { quoted: m })
        } 
        else if (type === 'document') {
            await client.sendMessage(m.chat, { 
                document: { url: filePath }, 
                mimetype: 'audio/mpeg', 
                fileName: fileName,
                caption: `📂 ${title}`
            }, { quoted: m })
        }

        fs.unlinkSync(filePath)
        await m.react('✅')

    } catch (e) {
        console.error(e)
        await m.react('❌')
        m.reply(`⚠️ ${e.message}`)
    }
}
