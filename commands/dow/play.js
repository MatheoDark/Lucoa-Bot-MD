import yts from 'yt-search'
import axios from 'axios'
import fetch from 'node-fetch'
import { ytmp3, ytmp4 } from 'ruhend-scraper'

// --- CONFIGURACIÓN ---
const PENDING_TTL_MS = 60 * 1000

// --- UTILIDADES ---
const sanitizeFileName = (s = '') => String(s).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Lucoa_Media'

async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' })
        return res.data
    } catch {
        return null
    }
}

// ==========================================
// 🛡️ MOTOR DE RESPALDO: Y2MATE (MANUAL)
// ==========================================
async function y2mateScraper(url, isAudio) {
    try {
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://www.y2mate.com',
            'Referer': 'https://www.y2mate.com/es'
        }

        // 1. Analizar
        const analyzeBody = new URLSearchParams()
        analyzeBody.append('k_query', url)
        analyzeBody.append('k_page', 'home')
        analyzeBody.append('hl', 'es')
        analyzeBody.append('q_auto', '0')

        const analyzeRes = await fetch('https://www.y2mate.com/mates/analyzeV2/ajax', { method: 'POST', headers, body: analyzeBody })
        const analyzeJson = await analyzeRes.json()
        if (!analyzeJson || !analyzeJson.links) return null

        const vid = analyzeJson.vid
        let targetKey = null

        // 2. Elegir calidad
        if (isAudio) {
            const mp3 = analyzeJson.links.mp3
            if (mp3) targetKey = Object.values(mp3)[0].k // Primera opción MP3
        } else {
            const mp4 = analyzeJson.links.mp4
            if (mp4) {
                // Priorizar 720p o Auto, sino la primera
                const vals = Object.values(mp4)
                targetKey = (vals.find(v => v.q === '720p') || vals.find(v => v.q === 'auto') || vals[0]).k
            }
        }

        if (!targetKey) return null

        // 3. Convertir
        const convertBody = new URLSearchParams()
        convertBody.append('vid', vid)
        convertBody.append('k', targetKey)

        const convertRes = await fetch('https://www.y2mate.com/mates/convertV2/ajax', { method: 'POST', headers, body: convertBody })
        const convertJson = await convertRes.json()

        if (convertJson.status === 'ok' && convertJson.dlink) {
            return { dl: convertJson.dlink, title: convertJson.title }
        }
    } catch (e) {
        console.log('Y2Mate Error:', e.message)
    }
    return null
}

// ==========================================
// 🛡️ GESTOR INTELIGENTE DE DESCARGAS
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // --- INTENTO 1: RUHEND SCRAPER (Librería) ---
    try {
        console.log('🔄 Tier 1: Ruhend Scraper...')
        const data = isAudio ? await ytmp3(url) : await ytmp4(url)
        const link = data.audio || data.video || data.url || data.download
        if (link) return { dl: link, title: data.title || 'Lucoa Media' }
    } catch (e) { console.log('❌ Ruhend falló, pasando al siguiente...') }

    // --- INTENTO 2: Y2MATE MANUAL (Scraper Local) ---
    try {
        console.log('🔄 Tier 2: Y2Mate Manual...')
        const data = await y2mateScraper(url, isAudio)
        if (data) return data
    } catch (e) { console.log('❌ Y2Mate falló, pasando al siguiente...') }

    // --- INTENTO 3: COBALT API (Último recurso) ---
    try {
        console.log('🔄 Tier 3: Cobalt API...')
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
        if (json?.url) return { dl: json.url, title: 'Lucoa Media' }
    } catch (e) { console.log('❌ Cobalt falló.') }

    throw new Error('No pude descargar esta canción. Intenta con otra.')
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

// ==========================================
// 🚀 EXPORT DEL COMANDO
// ==========================================
export default {
    command: ['play', 'mp3', 'mp4'],
    category: 'downloader',

    // --- ESCUCHA LAS RESPUESTAS 1, 2, 3 ---
    before: async (m, { client }) => {
        const text = m.text?.trim()
        if (!['1', '2', '3'].includes(text)) return false

        const pending = getPending(m.chat)
        if (!pending || pending.sender !== m.sender) return false

        delete global.__playPending[m.chat] // Limpiar pendiente
        const isAudio = (text === '1' || text === '3')

        await m.reply(isAudio ? '🎧 *Procesando audio...*' : '🎬 *Procesando video...*')

        try {
            const { dl, title } = await getDownloadLink(pending.url, isAudio)
            const safeTitle = sanitizeFileName(title || pending.title)
            const thumbBuffer = await getBuffer(pending.thumbnail)

            // OPCIÓN 1: AUDIO (PLAYER)
            if (text === '1') {
                await client.sendMessage(m.chat, {
                    audio: { url: dl },
                    mimetype: 'audio/mpeg',
                    fileName: safeTitle + '.mp3',
                    contextInfo: {
                        externalAdReply: {
                            title: title,
                            body: "🐉 Lucoa Player",
                            thumbnail: thumbBuffer,
                            sourceUrl: pending.url,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m })
            }
            // OPCIÓN 2: VIDEO
            else if (text === '2') {
                await client.sendMessage(m.chat, {
                    video: { url: dl },
                    caption: `🎬 *${title}*`,
                    mimetype: 'video/mp4',
                    fileName: safeTitle + '.mp4',
                    jpegThumbnail: thumbBuffer
                }, { quoted: m })
            }
            // OPCIÓN 3: DOCUMENTO
            else if (text === '3') {
                await client.sendMessage(m.chat, {
                    document: { url: dl },
                    mimetype: 'audio/mpeg',
                    fileName: safeTitle + '.mp3',
                    caption: `📂 *${title}*`,
                    jpegThumbnail: thumbBuffer
                }, { quoted: m })
            }

        } catch (e) {
            console.error(e)
            m.reply(`⚠️ Error: ${e.message}`)
        }
        return true
    },

    // --- BÚSQUEDA PRINCIPAL ---
    run: async ({ client, m, text, command }) => {
        if (!text) return m.reply(`🐉 *¿Qué deseas reproducir?*\nEjemplo: *#${command} Bad Bunny*`)

        try {
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ No encontrado.')

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
            m.reply('❌ Error al buscar en YouTube.')
        }
    }
}
