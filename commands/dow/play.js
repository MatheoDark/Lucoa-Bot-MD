import yts from 'yt-search'
import axios from 'axios'
import fetch from 'node-fetch'

// --- CONFIGURACIÓN ---
const PENDING_TTL_MS = 60 * 1000
// User Agent rotativo para engañar a las APIs y que no nos bloqueen
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// --- UTILIDADES ---
const sanitizeFileName = (s = '') => String(s).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Lucoa_Media'

// --- MINIATURAS ---
async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' })
        return res.data
    } catch {
        return null
    }
}

// ==========================================
// 🛡️ SISTEMA DE DESCARGA (APIs ACTUALIZADAS 2025)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // ---------------------------------------------------------
    // 🔄 MOTOR 1: DELIRIUS API (Muy rápida y estable)
    // ---------------------------------------------------------
    try {
        console.log("🔄 Tier 1: Probando Delirius...")
        const type = isAudio ? 'ytmp3' : 'ytmp4'
        const apiUrl = `https://delirius-apiofc.vercel.app/download/${type}?url=${encodeURIComponent(url)}`
        
        const res = await fetch(apiUrl)
        const json = await res.json()

        // Delirius suele devolver data.download.url o data.url
        const downloadUrl = json.data?.download?.url || json.data?.url
        
        if (json.status && downloadUrl) {
            return { 
                dl: downloadUrl, 
                title: json.data?.title || json.data?.filename || 'Lucoa Media',
                size: 'Unknown'
            }
        }
    } catch (e) {
        console.log("❌ Falló Delirius")
    }

    // ---------------------------------------------------------
    // 🔄 MOTOR 2: DREADED API (Backup Sólido)
    // ---------------------------------------------------------
    try {
        console.log("🔄 Tier 2: Probando Dreaded...")
        const type = isAudio ? 'audio' : 'video' // Dreaded usa 'audio'/'video'
        const apiUrl = `https://api.dreaded.site/api/ytdl/${type}?url=${encodeURIComponent(url)}`
        
        const res = await fetch(apiUrl)
        const json = await res.json()

        if (json.status && json.result && json.result.downloadLink) {
            return { 
                dl: json.result.downloadLink, 
                title: json.result.title || 'Lucoa Media',
                size: 'Unknown' 
            }
        }
    } catch (e) {
        console.log("❌ Falló Dreaded")
    }

    // ---------------------------------------------------------
    // 🔄 MOTOR 3: COBALT (Último recurso - Configuración agresiva)
    // ---------------------------------------------------------
    try {
        console.log("🔄 Tier 3: Probando Cobalt...")
        
        const payload = {
            url: url,
            filenamePattern: "basic",
            // Forzamos configuraciones compatibles
            ...(isAudio 
                ? { audioFormat: "mp3", isAudioOnly: true } 
                : { videoQuality: "480" }) // Bajamos calidad a 480p para asegurar descarga rápida
        }

        const res = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: { 
                'Accept': 'application/json', 
                'Content-Type': 'application/json',
                'User-Agent': USER_AGENT
            },
            body: JSON.stringify(payload)
        })

        const json = await res.json()
        
        if (json?.url) {
            return { dl: json.url, title: 'Lucoa Media', size: 'Unknown' }
        }
    } catch (e) {
        console.log("❌ Falló Cobalt")
    }

    // Si todo falla
    throw new Error('❌ No se pudo descargar. Intenta con otra canción.')
}

// --- ENVÍO DE MEDIA ---
async function sendMedia(client, m, dl, title, thumbBuffer, option, originalUrl) {
    const safeTitle = sanitizeFileName(title)
    
    // OPCIÓN 1: AUDIO (Con Carátula)
    if (option === '1') {
        const msg = {
            audio: { url: dl },
            mimetype: 'audio/mpeg',
            fileName: safeTitle + '.mp3',
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "🐉 Lucoa Bot Player",
                    thumbnail: thumbBuffer,
                    sourceUrl: originalUrl,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }
        return await client.sendMessage(m.chat, msg, { quoted: m })
    } 
    
    // OPCIÓN 2: VIDEO
    else if (option === '2') {
        const msg = {
            video: { url: dl },
            caption: `🎬 *${title}*`,
            mimetype: 'video/mp4',
            fileName: safeTitle + '.mp4',
            jpegThumbnail: thumbBuffer
        }
        return await client.sendMessage(m.chat, msg, { quoted: m })
    }

    // OPCIÓN 3: DOCUMENTO
    else if (option === '3') {
        const msg = {
            document: { url: dl },
            mimetype: 'audio/mpeg',
            fileName: safeTitle + '.mp3',
            caption: `📂 *${title}*`,
            jpegThumbnail: thumbBuffer
        }
        return await client.sendMessage(m.chat, msg, { quoted: m })
    }
}

// --- GESTIÓN DE PENDIENTES ---
function setPending(chatId, sender, data) {
    if (!global.__playPending) global.__playPending = {}
    global.__playPending[chatId] = { sender, ...data, expires: Date.now() + PENDING_TTL_MS }
}

function getPending(chatId) {
    const data = global.__playPending?.[chatId]
    if (data && Date.now() > data.expires) {
        delete global.__playPending[chatId]
        return null
    }
    return data
}

export default {
    command: ['play', 'mp3', 'mp4'],
    category: 'downloader',

    // --- CAPTURA RESPUESTA "1", "2" o "3" ---
    before: async (m, { client }) => {
        const text = m.text?.trim()
        if (text !== '1' && text !== '2' && text !== '3') return false

        const pending = getPending(m.chat)
        if (!pending || pending.sender !== m.sender) return false

        delete global.__playPending[m.chat]
        
        const needAudioLink = (text === '1' || text === '3')

        await m.reply(needAudioLink ? '🎧 *Descargando audio...*' : '🎬 *Descargando video...*')

        try {
            const thumbBuffer = await getBuffer(pending.thumbnail)
            const { dl, title } = await getDownloadLink(pending.url, needAudioLink)
            
            await sendMedia(client, m, dl, title || pending.title, thumbBuffer, text, pending.url)
            
        } catch (e) {
            console.error(e)
            m.reply(`⚠️ ${e.message}`)
        }
        return true
    },

    // --- COMANDO PRINCIPAL ---
    run: async ({ client, m, text, command }) => {
        if (!text) return m.reply(`🐉 *Ingresa el título.*\nEjemplo: *#${command} Linkin Park*`)

        try {
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ Video no encontrado.')

            const info = `
*╭─✦ 🐉 LUCOA PLAYER ✦─╮*
│ ❧ *Título:* ${video.title}
│ ❧ *Tiempo:* ${video.timestamp}
│ ❧ *Canal:* ${video.author.name}
╰───────────────⬫

*Responde con el número:*
1️⃣ Audio (Normal)
2️⃣ Video (MP4)
3️⃣ Documento (Archivo)`

            await client.sendMessage(m.chat, { 
                image: { url: video.thumbnail }, 
                caption: info 
            }, { quoted: m })

            setPending(m.chat, m.sender, { url: video.url, title: video.title, thumbnail: video.thumbnail })

        } catch (e) {
            console.error(e)
            m.reply('❌ Error al buscar.')
        }
    }
}
    }
}
