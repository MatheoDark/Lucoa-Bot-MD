import yts from 'yt-search'
import axios from 'axios'

// --- CONFIGURACIÓN ---
const PENDING_TTL_MS = 60 * 1000

// Headers rotativos para evitar bloqueo
const FAKE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json'
}

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
// 🛡️ GESTOR DE DESCARGAS (FIX COBALT + YASIYA)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // Lista de Motores
    const apis = [
        {
            // TIER 1: COBALT (Corregido el error 400)
            name: 'Cobalt Tools',
            async run() {
                const payload = {
                    url: url,
                    filenamePattern: "basic",
                    // CORRECCIÓN CRÍTICA: Cobalt usa 'vQuality' no 'videoQuality'
                    ...(isAudio 
                        ? { isAudioOnly: true } 
                        : { vQuality: "480" }) // 480p es más rápido y falla menos
                }
                
                const { data } = await axios.post('https://api.cobalt.tools/api/json', payload, { 
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0' // Header simple para Cobalt
                    }
                })
                
                return data?.url
            }
        },
        {
            // TIER 2: YASIYA (Muy permisiva con VPS)
            name: 'Yasiya API',
            async run() {
                const type = isAudio ? 'ytmp3' : 'ytmp4'
                const { data } = await axios.get(`https://www.dark-yasiya-api.site/api/search/${type}?url=${encodeURIComponent(url)}`)
                return data.result?.dl_link || data.result?.url
            }
        },
        {
            // TIER 3: DELIRIUS (Proxy)
            name: 'Delirius API',
            async run() {
                const type = isAudio ? 'ytmp3' : 'ytmp4'
                const { data } = await axios.get(`https://delirius-apiofc.vercel.app/download/${type}?url=${encodeURIComponent(url)}`)
                return data.data?.download?.url || data.data?.url
            }
        },
        {
            // TIER 4: WIDIPE (Backup final)
            name: 'Widipe',
            async run() {
                const { data } = await axios.get(`https://widipe.com.pl/api/ytdl?url=${encodeURIComponent(url)}`)
                return isAudio ? data.result?.mp3 : data.result?.mp4
            }
        }
    ]

    // 🔄 BUCLE DE INTENTOS
    for (const api of apis) {
        try {
            console.log(`🔄 Probando motor: ${api.name}...`)
            
            // Timeout de 15s para no quedarnos colgados
            const source = axios.CancelToken.source();
            const timeout = setTimeout(() => source.cancel('Timeout'), 15000);

            const link = await api.run()
            clearTimeout(timeout)

            if (link && link.startsWith('http')) {
                console.log(`✅ Éxito con ${api.name}`)
                return { dl: link, title: 'Lucoa Media' }
            }
        } catch (e) {
            console.log(`❌ Falló ${api.name}: ${e.message}`)
        }
    }

    throw new Error('Lo siento, todas las rutas de descarga están bloqueadas en este servidor.')
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
// 🚀 COMANDO EXPORTADO
// ==========================================
export default {
    command: ['play', 'mp3', 'mp4'],
    category: 'downloader',

    // --- ESCUCHA 1, 2, 3 ---
    before: async (m, { client }) => {
        const text = m.text?.trim()
        if (!['1', '2', '3'].includes(text)) return false

        const pending = getPending(m.chat)
        if (!pending || pending.sender !== m.sender) return false

        delete global.__playPending[m.chat]
        const isAudio = (text === '1' || text === '3')

        await m.reply(isAudio ? '🎧 *Descargando audio...*' : '🎬 *Descargando video...*')

        try {
            const { dl, title } = await getDownloadLink(pending.url, isAudio)
            
            const finalTitle = (title === 'Lucoa Media' || !title) ? pending.title : title
            const safeTitle = sanitizeFileName(finalTitle)
            const thumbBuffer = await getBuffer(pending.thumbnail)

            const commonInfo = {
                contextInfo: {
                    externalAdReply: {
                        title: finalTitle,
                        body: "🐉 Lucoa Player",
                        thumbnail: thumbBuffer,
                        sourceUrl: pending.url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }

            if (text === '1') { // AUDIO
                await client.sendMessage(m.chat, {
                    audio: { url: dl },
                    mimetype: 'audio/mpeg',
                    fileName: safeTitle + '.mp3',
                    ...commonInfo
                }, { quoted: m })
            } else if (text === '2') { // VIDEO
                await client.sendMessage(m.chat, {
                    video: { url: dl },
                    caption: `🎬 *${finalTitle}*`,
                    mimetype: 'video/mp4',
                    fileName: safeTitle + '.mp4',
                    jpegThumbnail: thumbBuffer
                }, { quoted: m })
            } else if (text === '3') { // DOCUMENTO
                await client.sendMessage(m.chat, {
                    document: { url: dl },
                    mimetype: 'audio/mpeg',
                    fileName: safeTitle + '.mp3',
                    caption: `📂 *${finalTitle}*`,
                    jpegThumbnail: thumbBuffer
                }, { quoted: m })
            }

        } catch (e) {
            console.error(e)
            m.reply(`⚠️ ${e.message}`)
        }
        return true
    },

    // --- BÚSQUEDA ---
    run: async ({ client, m, text, command }) => {
        if (!text) return m.reply(`🐉 *Ingresa el nombre.*\nEjemplo: *#${command} Music*`)

        try {
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ No encontrado.')

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
            m.reply('❌ Error al buscar en YouTube.')
        }
    }
}
