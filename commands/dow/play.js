import yts from 'yt-search'
import axios from 'axios'
import fetch from 'node-fetch'

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
// 🛡️ GESTOR DE DESCARGAS (APIs NUEVAS 2026)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // Lista de APIs ordenadas por estabilidad actual
    // Estas APIs actúan de proxy para saltarse el bloqueo de Cloudflare en tu VPS
    const apis = [
        {
            name: 'Siputzx (Tier 1)',
            async run() {
                const type = isAudio ? 'ytmp3' : 'ytmp4'
                // Esta API es buenísima, suele ser muy rápida
                const res = await fetch(`https://api.siputzx.my.id/api/d/${type}?url=${encodeURIComponent(url)}`)
                const json = await res.json()
                if (!json.status) throw new Error('Status false')
                return json.data.dl
            }
        },
        {
            name: 'Ryzendesu (Tier 2)',
            async run() {
                const type = isAudio ? 'ytmp3' : 'ytmp4'
                const res = await fetch(`https://api.ryzendesu.vip/api/downloader/${type}?url=${encodeURIComponent(url)}`)
                const json = await res.json()
                return json.url // A veces devuelve json.data.url
            }
        },
        {
            name: 'Vreden (Tier 3)',
            async run() {
                const type = isAudio ? 'audio' : 'video' // Vreden usa nombres distintos
                const res = await fetch(`https://api.vreden.web.id/api/v1/download/youtube/${type}?url=${encodeURIComponent(url)}`)
                const json = await res.json()
                return json.result?.download?.url || json.result?.url
            }
        },
        {
            name: 'Dreaded (Tier 4)',
            async run() {
                const type = isAudio ? 'audio' : 'video'
                const res = await fetch(`https://api.dreaded.site/api/ytdl/${type}?url=${encodeURIComponent(url)}`)
                const json = await res.json()
                return json.result?.downloadLink
            }
        }
    ]

    // 🔄 Bucle de intentos: Si falla la 1, prueba la 2, etc.
    for (const api of apis) {
        try {
            console.log(`🔄 Probando motor: ${api.name}...`)
            
            // Timeout de seguridad de 15 segundos por API
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 15000)
            
            const link = await Promise.race([
                api.run(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
            ])
            
            clearTimeout(timeout)

            if (link && link.startsWith('http')) {
                console.log(`✅ Éxito con ${api.name}`)
                return { dl: link, title: 'Lucoa Media' }
            }
        } catch (e) {
            console.log(`❌ Falló ${api.name}: ${e.message}`)
        }
    }

    throw new Error('Lo siento, YouTube bloqueó todas las descargas por ahora. Intenta en 10 minutos.')
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
// 🚀 COMANDO PLAY
// ==========================================
export default {
    command: ['play', 'mp3', 'mp4'],
    category: 'downloader',

    // --- LÓGICA DE SELECCIÓN (1, 2, 3) ---
    before: async (m, { client }) => {
        const text = m.text?.trim()
        if (!['1', '2', '3'].includes(text)) return false

        const pending = getPending(m.chat)
        if (!pending || pending.sender !== m.sender) return false

        delete global.__playPending[m.chat]
        const isAudio = (text === '1' || text === '3')

        await m.reply(isAudio ? '🎧 *Descargando audio...*' : '🎬 *Descargando video...*')

        try {
            const thumbBuffer = await getBuffer(pending.thumbnail)
            const { dl, title } = await getDownloadLink(pending.url, isAudio)
            
            // Usamos el título del video original si la API no devuelve uno
            const finalTitle = title === 'Lucoa Media' ? pending.title : title
            const safeTitle = sanitizeFileName(finalTitle)

            // OPCIÓN 1: AUDIO (PLAYER)
            if (text === '1') {
                await client.sendMessage(m.chat, {
                    audio: { url: dl },
                    mimetype: 'audio/mpeg',
                    fileName: safeTitle + '.mp3',
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
                }, { quoted: m })
            }
            // OPCIÓN 2: VIDEO
            else if (text === '2') {
                await client.sendMessage(m.chat, {
                    video: { url: dl },
                    caption: `🎬 *${finalTitle}*`,
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
        if (!text) return m.reply(`🐉 *Ingresa el título.*\nEjemplo: *#${command} Linkin Park*`)

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
