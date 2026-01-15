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
// 🛡️ SISTEMA DE DESCARGA (Estilo "Lista de APIs" de tu amigo)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // Aquí definimos la lista de APIs igual que en el código de tu amigo,
    // pero con URLs que SÍ funcionan sin configuración extra.
    const apis = [
        {
            name: 'Delirius',
            async run() {
                const type = isAudio ? 'ytmp3' : 'ytmp4'
                const res = await fetch(`https://delirius-apiofc.vercel.app/download/${type}?url=${encodeURIComponent(url)}`)
                const json = await res.json()
                return json.data?.download?.url || json.data?.url
            }
        },
        {
            name: 'Dreaded',
            async run() {
                const type = isAudio ? 'audio' : 'video'
                const res = await fetch(`https://api.dreaded.site/api/ytdl/${type}?url=${encodeURIComponent(url)}`)
                const json = await res.json()
                return json.result?.downloadLink
            }
        },
        {
            name: 'Cobalt',
            async run() {
                const res = await fetch('https://api.cobalt.tools/api/json', {
                    method: 'POST',
                    headers: { 
                        'Accept': 'application/json', 
                        'Content-Type': 'application/json',
                        'User-Agent': USER_AGENT
                    },
                    body: JSON.stringify({
                        url: url,
                        filenamePattern: "basic",
                        ...(isAudio 
                            ? { audioFormat: "mp3", isAudioOnly: true } 
                            : { videoQuality: "480" }) 
                    })
                })
                const json = await res.json()
                return json?.url
            }
        }
    ]

    // 🔄 BUCLE DE INTENTOS (La lógica de tu amigo)
    for (const api of apis) {
        try {
            console.log(`🔄 Probando motor: ${api.name}...`)
            const link = await api.run()
            if (link) {
                return { dl: link, title: 'Lucoa Media', size: 'Unknown' }
            }
        } catch (e) {
            console.log(`❌ Falló ${api.name}`)
        }
        // Pequeña pausa entre intentos para no saturar
        await new Promise(r => setTimeout(r, 500))
    }

    throw new Error('Todas las APIs fallaron. Intenta más tarde.')
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
        if (!text) return m.reply(`🐉 *Ingresa el nombre o enlace.*\nEjemplo: *#${command} Linkin Park*`)

        try {
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ Video no encontrado.')

            const info = `
*╭─✦ 🐉 LUCOA PLAYER ✦─╮*
│ ❧ *Título:* ${video.title}
│ ❧ *Duración:* ${video.timestamp}
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
