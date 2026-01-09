import yts from 'yt-search'
import axios from 'axios'
import fetch from 'node-fetch'

// --- IMPORTAMOS TUS LIBRERÍAS LOCALES ---
import { ytmp3, ytmp4 } from '../../lib/ytscraper.js'
import { ogmp3 } from '../../lib/youtubedl.js'

const PENDING_TTL_MS = 60 * 1000

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
// 🛡️ SISTEMA DE DESCARGA (Fuerza Bruta)
// ==========================================
async function getDownloadLink(url, isAudio) {
    // 1. YtScraper (Local)
    try {
        console.log("🔄 Tier 1: Probando YtScraper...")
        const data = isAudio ? await ytmp3(url) : await ytmp4(url)
        if (data.status && data.download.url) {
            return { dl: data.download.url, title: data.metadata.title, size: 'Unknown' }
        }
    } catch (e) { console.log("❌ Falló YtScraper") }

    // 2. OGMP3 (Local 2)
    try {
        console.log("🔄 Tier 2: Probando OGMP3...")
        const quality = isAudio ? '128' : '720'
        const type = isAudio ? 'audio' : 'video'
        const data = await ogmp3.download(url, quality, type)
        if (data.status && data.result.download) {
            return { dl: data.result.download, title: data.result.title, size: 'Unknown' }
        }
    } catch (e) { console.log("❌ Falló OGMP3") }

    // 3. Cobalt (Respaldo externo)
    try {
        console.log("🔄 Tier 3: Probando Cobalt...")
        const res = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url, vQuality: isAudio ? '128' : '720', isAudioOnly: isAudio })
        })
        const json = await res.json()
        if (json?.url) return { dl: json.url, title: 'Lucoa Media', size: 'Unknown' }
    } catch (e) { console.log("❌ Falló Cobalt") }

    throw new Error('No pude descargar el archivo. Intenta de nuevo.')
}

// --- ENVÍO DE MEDIA (SEGÚN LA OPCIÓN ELEGIDA) ---
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

    // OPCIÓN 3: DOCUMENTO (Archivo MP3 con foto miniatura)
    else if (option === '3') {
        const msg = {
            document: { url: dl },
            mimetype: 'audio/mpeg',
            fileName: safeTitle + '.mp3',
            caption: `📂 *${title}*`,
            jpegThumbnail: thumbBuffer // Esto pone la foto en el icono del archivo
        }
        return await client.sendMessage(m.chat, msg, { quoted: m })
    }
}

// --- GESTIÓN DE SESIÓN ---
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
        if (text !== '1' && text !== '2' && text !== '3') return

        const pending = getPending(m.chat)
        if (!pending || pending.sender !== m.sender) return

        delete global.__playPending[m.chat]
        
        // Si elige 1 (Audio) o 3 (Documento), necesitamos el enlace de audio (mp3)
        // Si elige 2, es video (mp4)
        const needAudioLink = (text === '1' || text === '3')

        await m.reply(needAudioLink ? '🎧 *Procesando audio...*' : '🎬 *Procesando video...*')

        try {
            const thumbBuffer = await getBuffer(pending.thumbnail)
            const { dl, title } = await getDownloadLink(pending.url, needAudioLink)
            
            // Enviamos pasando la opción elegida (text = "1", "2" o "3")
            await sendMedia(client, m, dl, title || pending.title, thumbBuffer, text, pending.url)
            
        } catch (e) {
            console.error(e)
            m.reply(`⚠️ Hubo un error procesando el archivo.`)
        }
        return true
    },

    // --- COMANDO PRINCIPAL ---
    run: async ({ client, m, text }) => {
        if (!text) return m.reply('¿Qué canción busco?')

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
            m.reply('❌ Error al buscar.')
        }
    }
}
