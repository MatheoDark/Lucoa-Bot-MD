import yts from 'yt-search'
import axios from 'axios'
import fetch from 'node-fetch'
import { ytmp3, ytmp4 } from 'ruhend-scraper' // Usamos tu librería instalada

// --- CONFIGURACIÓN ---
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
// 🛡️ SCRAPER MANUAL Y2MATE (Respaldo Blindado)
// ==========================================
// Esto simula ser un usuario en la web de Y2Mate si las librerías fallan
async function y2mateScraper(url, isAudio) {
    try {
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://www.y2mate.com',
            'Referer': 'https://www.y2mate.com/es'
        }

        // Paso 1: Analizar Video
        const analyzeBody = new URLSearchParams()
        analyzeBody.append('k_query', url)
        analyzeBody.append('k_page', 'home')
        analyzeBody.append('hl', 'es')
        analyzeBody.append('q_auto', '0')

        const analyzeRes = await fetch('https://www.y2mate.com/mates/analyzeV2/ajax', {
            method: 'POST',
            headers,
            body: analyzeBody
        })
        const analyzeJson = await analyzeRes.json()
        
        if (!analyzeJson || !analyzeJson.links) throw new Error('Y2Mate Analyze Failed')

        const vid = analyzeJson.vid
        let targetKey = null

        // Paso 2: Seleccionar calidad/formato
        if (isAudio) {
            // Buscar mp3 (generalmente key "mp3128" o similar en la lista "mp3")
            const mp3Options = analyzeJson.links.mp3
            if (mp3Options) {
                // Tomamos la primera opción (usualmente 128kbps)
                targetKey = Object.values(mp3Options)[0].k
            }
        } else {
            // Buscar video (mp4)
            const mp4Options = analyzeJson.links.mp4
            if (mp4Options) {
                // Intentamos buscar 720p, si no, la que sea 'auto' o la primera disponible
                const values = Object.values(mp4Options)
                const best = values.find(v => v.q === '720p') || values.find(v => v.q === 'auto') || values[0]
                targetKey = best.k
            }
        }

        if (!targetKey) throw new Error('No se encontró formato compatible en Y2Mate')

        // Paso 3: Convertir
        const convertBody = new URLSearchParams()
        convertBody.append('vid', vid)
        convertBody.append('k', targetKey)

        const convertRes = await fetch('https://www.y2mate.com/mates/convertV2/ajax', {
            method: 'POST',
            headers,
            body: convertBody
        })
        const convertJson = await convertRes.json()

        if (convertJson.status === 'ok' && convertJson.dlink) {
            return { dl: convertJson.dlink, title: convertJson.title || 'Lucoa Media' }
        }
        
    } catch (e) {
        console.log('❌ Falló Y2Mate Scraper:', e.message)
    }
    return null
}

// ==========================================
// 🛡️ GESTOR DE DESCARGAS (SCRAPERS)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // ---------------------------------------------------------
    // 🥇 OPCIÓN 1: RUHEND SCRAPER (Tu librería instalada)
    // ---------------------------------------------------------
    try {
        console.log("🔄 Tier 1: Ruhend Scraper...")
        // Ruhend usa funciones separadas para mp3 y mp4
        const data = isAudio ? await ytmp3(url) : await ytmp4(url)
        
        // Ruhend a veces devuelve data.audio/data.video o data.url directamente
        const link = data.audio || data.video || data.url || data.download
        const title = data.title || data.metadata?.title
        
        if (link) {
            return { dl: link, title: title || 'Lucoa Media', size: 'Unknown' }
        }
    } catch (e) {
        console.log("❌ Falló Ruhend:", e.message)
    }

    // ---------------------------------------------------------
    // 🥈 OPCIÓN 2: Y2MATE MANUAL (Código inyectado arriba)
    // ---------------------------------------------------------
    try {
        console.log("🔄 Tier 2: Y2Mate Scraper Local...")
        const data = await y2mateScraper(url, isAudio)
        if (data) return data
    } catch (e) {
        console.log("❌ Falló Y2Mate")
    }

    // ---------------------------------------------------------
    // 🥉 OPCIÓN 3: COBALT (Respaldo final)
    // ---------------------------------------------------------
    try {
        console.log("🔄 Tier 3: Cobalt API...")
        const res = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: { 
                'Accept': 'application/json', 
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0' 
            },
            body: JSON.stringify({
                url: url,
                filenamePattern: "basic",
                ...(isAudio ? { audioFormat: "mp3", isAudioOnly: true } : { videoQuality: "480" })
            })
        })
        const json = await res.json()
        if (json?.url) return { dl: json.url, title: 'Lucoa Media', size: 'Unknown' }
    } catch (e) {
        console.log("❌ Falló Cobalt")
    }

    throw new Error('❌ Fallaron todos los scrapers. YouTube está difícil hoy.')
}

// --- ENVÍO DE MEDIA ---
async function sendMedia(client, m, dl, title, thumbBuffer, option, originalUrl) {
    const safeTitle = sanitizeFileName(title)
    
    if (option === '1') { // AUDIO
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
    } else if (option === '2') { // VIDEO
        const msg = {
            video: { url: dl },
            caption: `🎬 *${title}*`,
            mimetype: 'video/mp4',
            fileName: safeTitle + '.mp4',
            jpegThumbnail: thumbBuffer
        }
        return await client.sendMessage(m.chat, msg, { quoted: m })
    } else if (option === '3') { // DOCUMENTO
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

    before: async (m, { client }) => {
        const text = m.text?.trim()
        if (text !== '1' && text !== '2' && text !== '3') return false
        const pending = getPending(m.chat)
        if (!pending || pending.sender !== m.sender) return false
        delete global.__playPending[m.chat]
        
        const needAudioLink = (text === '1' || text === '3')
        await m.reply(needAudioLink ? '🎧 *Iniciando Scraper... (Audio)*' : '🎬 *Iniciando Scraper... (Video)*')

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

    run: async ({ client, m, text, command }) => {
        if (!text) return m.reply(`🐉 *Ingresa título o enlace.*`)
        try {
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ No encontrado.')
            
            const info = `
*╭─✦ 🐉 LUCOA SCRAPER ✦─╮*
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
