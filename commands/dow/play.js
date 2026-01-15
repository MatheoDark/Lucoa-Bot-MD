import yts from 'yt-search'
import axios from 'axios'
import fetch from 'node-fetch'

// --- CONFIGURACIÓN ---
const PENDING_TTL_MS = 60 * 1000
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
// 🛡️ NUEVO SISTEMA DE DESCARGA (APIs Públicas)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // ---------------------------------------------------------
    // 🔄 MOTOR 1: AGATZ (Muy estable para MD bots)
    // ---------------------------------------------------------
    try {
        console.log("🔄 Tier 1: Probando Agatz API...")
        const type = isAudio ? 'mp3' : 'mp4'
        const apiUrl = `https://api.agatz.xyz/api/yt${type}?url=${encodeURIComponent(url)}`
        
        const res = await fetch(apiUrl)
        const json = await res.json()

        if (json.status === 200 && json.data && json.data.downloadUrl) {
            return { 
                dl: json.data.downloadUrl, 
                title: json.data.title || 'Lucoa Media',
                size: 'Unknown'
            }
        }
    } catch (e) {
        console.log("❌ Falló Agatz:", e.message)
    }

    // ---------------------------------------------------------
    // 🔄 MOTOR 2: COBALT (Configuración corregida)
    // ---------------------------------------------------------
    try {
        console.log("🔄 Tier 2: Probando Cobalt Tools...")
        
        const payload = {
            url: url,
            filenamePattern: "basic",
            // Si es audio, pedimos mp3, si es video, dejamos que decida (o forzamos 720/max)
            ...(isAudio ? { audioFormat: "mp3", isAudioOnly: true } : { videoQuality: "720" })
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
        
        // Cobalt a veces devuelve "stream" o "url"
        if (json?.url) {
            return { dl: json.url, title: 'Lucoa Media', size: 'Unknown' }
        }
    } catch (e) {
        console.log("❌ Falló Cobalt:", e.message)
    }

    // Si todo falla
    throw new Error('Servidores ocupados. Intenta en 1 minuto.')
}

// --- ENVÍO DE MEDIA ---
async function sendMedia(client, m, dl, title, thumbBuffer, option, originalUrl) {
    const safeTitle = sanitizeFileName(title)
    
    // OPCIÓN 1: AUDIO (Con Carátula Grande)
    if (option === '1') {
        const msg = {
            audio: { url: dl },
            mimetype: 'audio/mpeg',
            fileName: safeTitle + '.mp3',
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "🐉 Lucoa Bot Music",
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

// --- GESTIÓN DE SESIÓN (PENDIENTES) ---
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
        // Solo actuamos si es 1, 2 o 3 y hay algo pendiente
        if (text !== '1' && text !== '2' && text !== '3') return false

        const pending = getPending(m.chat)
        if (!pending || pending.sender !== m.sender) return false

        // Limpiamos el pendiente para que no se use dos veces
        delete global.__playPending[m.chat]
        
        // 1 y 3 son Audio, 2 es Video
        const needAudioLink = (text === '1' || text === '3')

        await m.reply(needAudioLink ? '🎧 *Procesando audio...*' : '🎬 *Procesando video...*')

        try {
            const thumbBuffer = await getBuffer(pending.thumbnail)
            // Aquí llamamos a la nueva función sin depender de librerías locales
            const { dl, title } = await getDownloadLink(pending.url, needAudioLink)
            
            await sendMedia(client, m, dl, title || pending.title, thumbBuffer, text, pending.url)
            
        } catch (e) {
            console.error(e)
            m.reply(`⚠️ ${e.message || 'Error desconocido'}`)
        }
        return true
    },

    // --- COMANDO PRINCIPAL ---
    run: async ({ client, m, text, args, command }) => {
        if (!text) return m.reply(`🐉 *Ingresa el nombre o enlace.*\nEjemplo: *#${command} Bad Bunny*`)

        try {
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ No encontrado.')

            const info = `
*╭─✦ 🐉 LUCOA PLAYER ✦─╮*
│ ❧ *Título:* ${video.title}
│ ❧ *Duración:* ${video.timestamp}
│ ❧ *Autor:* ${video.author.name}
╰───────────────⬫

*Responde con el número:*
1️⃣ Audio (Con Portada)
2️⃣ Video (MP4)
3️⃣ Documento (MP3)`

            await client.sendMessage(m.chat, { 
                image: { url: video.thumbnail }, 
                caption: info 
            }, { quoted: m })

            setPending(m.chat, m.sender, { url: video.url, title: video.title, thumbnail: video.thumbnail })

        } catch (e) {
            console.error(e)
            m.reply('❌ Error al buscar en YouTube.')
        }
    }
}
