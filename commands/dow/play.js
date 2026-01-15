import yts from 'yt-search'
import axios from 'axios'

// --- CONFIGURACIÓN ---
const PENDING_TTL_MS = 60 * 1000

// Cabeceras para engañar a Cloudflare
const FAKE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://google.com'
}

// --- UTILIDADES ---
const sanitizeFileName = (s = '') => String(s).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Lucoa_Media'

async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', headers: FAKE_HEADERS })
        return res.data
    } catch {
        return null
    }
}

// ==========================================
// 🛡️ GESTOR DE DESCARGAS (VERSIÓN ANTI-BLOQUEO)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // Lista de APIs blindadas
    const apis = [
        {
            name: 'Vreden Play (Tier 1)',
            async run() {
                // Usamos el endpoint 'play' que busca y descarga, suele ser más permisivo
                const type = isAudio ? 'audio' : 'video'
                const { data } = await axios.get(`https://api.vreden.web.id/api/v1/download/play/${type}?query=${encodeURIComponent(url)}`, { headers: FAKE_HEADERS })
                return data.result?.download?.url || data.result?.url
            }
        },
        {
            name: 'AlyaChan (Tier 2)',
            async run() {
                // API muy estable
                const type = isAudio ? 'ytmp3' : 'ytmp4'
                const { data } = await axios.get(`https://api.alyachan.dev/api/${type}?url=${encodeURIComponent(url)}`, { headers: FAKE_HEADERS })
                if (data.status && data.data) {
                    return data.data.url || data.data.download
                }
                return null
            }
        },
        {
            name: 'Y2Mate (Scraper Manual)', 
            async run() {
                // Scraper manual directo a Y2Mate usando Axios
                const analyze = await axios.post('https://www.y2mate.com/mates/analyzeV2/ajax', 
                    new URLSearchParams({ k_query: url, k_page: 'home', hl: 'es', q_auto: '0' }),
                    { headers: { ...FAKE_HEADERS, 'Origin': 'https://www.y2mate.com', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } }
                )
                
                if (!analyze.data || !analyze.data.links) return null
                const vid = analyze.data.vid
                let k = null

                if (isAudio) {
                    k = Object.values(analyze.data.links.mp3 || {})[0]?.k
                } else {
                    const mp4 = analyze.data.links.mp4 || {}
                    k = (Object.values(mp4).find(v => v.q === '720p') || Object.values(mp4)[0])?.k
                }
                
                if (!k) return null

                const convert = await axios.post('https://www.y2mate.com/mates/convertV2/ajax',
                    new URLSearchParams({ vid, k }),
                    { headers: { ...FAKE_HEADERS, 'Origin': 'https://www.y2mate.com', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } }
                )
                
                return convert.data?.dlink
            }
        },
        {
            name: 'Cobalt (Tier 4)',
            async run() {
                const payload = {
                    url: url,
                    filenamePattern: "basic",
                    ...(isAudio ? { audioFormat: "mp3", isAudioOnly: true } : { videoQuality: "480" })
                }
                const { data } = await axios.post('https://api.cobalt.tools/api/json', payload, { 
                    headers: { ...FAKE_HEADERS, 'Accept': 'application/json', 'Content-Type': 'application/json' } 
                })
                return data?.url
            }
        }
    ]

    // 🔄 Bucle de intentos
    for (const api of apis) {
        try {
            console.log(`🔄 Probando motor: ${api.name}...`)
            const link = await api.run()
            
            if (link && link.startsWith('http')) {
                console.log(`✅ Éxito con ${api.name}`)
                return { dl: link, title: 'Lucoa Media' }
            }
        } catch (e) {
            console.log(`❌ Falló ${api.name}: ${e.message}`)
        }
        await new Promise(r => setTimeout(r, 500)) // Pausa de 0.5s
    }

    throw new Error('Servidores saturados o bloqueados. Intenta con otro video.')
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
            
            // Si la API no devolvió título, usamos el de la búsqueda
            const finalTitle = (title === 'Lucoa Media' || !title) ? pending.title : title
            const safeTitle = sanitizeFileName(finalTitle)
            const thumbBuffer = await getBuffer(pending.thumbnail)

            const commonOptions = {
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
                    ...commonOptions
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
