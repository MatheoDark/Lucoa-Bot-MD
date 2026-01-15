import yts from 'yt-search'
import axios from 'axios'
import https from 'https'

// --- CONFIGURACIÓN ---
const PENDING_TTL_MS = 60 * 1000

// 🛡️ CONFIGURACIÓN DE RED BLINDADA
// 1. Forzamos IPv4 (family: 4) para evitar errores de DNS en VPS
// 2. Ignoramos certificados SSL raros (rejectUnauthorized: false)
// 3. Headers de navegador real
const AXIOS_OPTIONS = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://google.com'
    },
    timeout: 20000, // 20 segundos de espera máximo
    family: 4,      // ⚠️ ESTO ES LA CLAVE: FUERZA IPV4
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false })
}

const sanitizeFileName = (s = '') => String(s).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Lucoa_Media'

async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', ...AXIOS_OPTIONS })
        return res.data
    } catch {
        return null
    }
}

// ==========================================
// 🛡️ GESTOR DE DESCARGAS (FORCE IPv4)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // Lista de las APIs más robustas hoy
    const apis = [
        {
            name: 'Agatz API (Tier 1)',
            async run() {
                const type = isAudio ? 'mp3' : 'mp4'
                // Agatz es muy estable
                const { data } = await axios.get(`https://api.agatz.xyz/api/yt${type}?url=${encodeURIComponent(url)}`, AXIOS_OPTIONS)
                if (data.status === 200) return data.data.downloadUrl
                throw new Error('Status no 200')
            }
        },
        {
            name: 'Btch API (Tier 2)',
            async run() {
                const type = isAudio ? 'audio' : 'video'
                const { data } = await axios.get(`https://api.btch.bz/download/${type}?url=${encodeURIComponent(url)}`, AXIOS_OPTIONS)
                return data.result?.url || data.url
            }
        },
        {
            name: 'Yasiya API (Tier 3)',
            async run() {
                const type = isAudio ? 'ytmp3' : 'ytmp4'
                const { data } = await axios.get(`https://www.dark-yasiya-api.site/api/search/${type}?url=${encodeURIComponent(url)}`, AXIOS_OPTIONS)
                return data.result?.dl_link || data.result?.url
            }
        },
        {
            name: 'Dreaded (Tier 4)',
            async run() {
                const type = isAudio ? 'audio' : 'video'
                const { data } = await axios.get(`https://api.dreaded.site/api/ytdl/${type}?url=${encodeURIComponent(url)}`, AXIOS_OPTIONS)
                return data.result?.downloadLink
            }
        }
    ]

    // BUCLE DE INTENTOS
    for (const api of apis) {
        try {
            console.log(`🔄 [IPv4] Probando motor: ${api.name}...`)
            const link = await api.run()
            
            if (link && link.startsWith('http')) {
                console.log(`✅ [ÉXITO] Descarga encontrada en ${api.name}`)
                return { dl: link }
            }
        } catch (e) {
            console.log(`❌ [FALLO] ${api.name}: ${e.message}`)
        }
    }
    throw new Error('No se pudo establecer conexión estable con ninguna API.')
}

// ==========================================
// 🚀 COMANDO PLAY (SIMPLE Y DIRECTO)
// ==========================================
export default {
    command: ['play', 'mp3', 'mp4', 'ytmp3', 'ytmp4', 'playvideo', 'playaudio'],
    category: 'downloader',

    run: async ({ client, m, text, command }) => {
        if (!text) return m.reply(`🐉 *Ingresa el nombre o enlace.*`)

        try {
            // 1. BUSCAR EN YOUTUBE
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ No encontrado.')

            const { title, thumbnail, timestamp, views, author, url } = video
            
            const infoMessage = `
*╭─✦ 🐉 LUCOA PLAYER ✦─╮*
│ ❧ *Título:* ${title}
│ ❧ *Duración:* ${timestamp}
│ ❧ *Canal:* ${author.name}
╰───────────────⬫
_⏳ Descargando vía IPv4..._`

            const thumbBuffer = await getBuffer(thumbnail)
            await client.sendMessage(m.chat, { image: thumbBuffer || { url: thumbnail }, caption: infoMessage }, { quoted: m })

            // 3. DETERMINAR TIPO
            const isVideo = ['mp4', 'ytmp4', 'playvideo', 'play2'].includes(command)
            
            // 4. OBTENER LINK
            const { dl } = await getDownloadLink(url, !isVideo)
            const safeTitle = sanitizeFileName(title)

            // 5. ENVIAR ARCHIVO
            if (isVideo) {
                await client.sendMessage(m.chat, {
                    video: { url: dl },
                    caption: `🎬 *${title}*`,
                    fileName: safeTitle + '.mp4',
                    mimetype: 'video/mp4',
                    jpegThumbnail: thumbBuffer
                }, { quoted: m })
            } else {
                await client.sendMessage(m.chat, {
                    audio: { url: dl },
                    mimetype: 'audio/mpeg',
                    fileName: safeTitle + '.mp3',
                    contextInfo: {
                        externalAdReply: {
                            title: title,
                            body: "🐉 Lucoa Player",
                            thumbnail: thumbBuffer,
                            sourceUrl: url,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m })
            }

        } catch (e) {
            console.error(e)
            m.reply(`❌ Error de conexión: ${e.message}`)
        }
    }
}
