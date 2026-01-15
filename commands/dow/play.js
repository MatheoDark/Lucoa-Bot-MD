import yts from 'yt-search'
import axios from 'axios'
import dns from 'dns'

// 🛑 PARCHE CRÍTICO PARA VPS/PROXMOX
// Esto obliga a Node.js a usar IPv4 primero. Si tu IPv6 está mal configurada, esto lo arregla.
try {
    if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
} catch (e) { console.log("Node version old, skipping dns fix") }

// --- CONFIGURACIÓN ---
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://google.com'
}

const sanitizeFileName = (s = '') => String(s).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Lucoa_Media'

async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', headers: HEADERS })
        return res.data
    } catch {
        return null
    }
}

// ==========================================
// 🛡️ GESTOR DE DESCARGAS (CON DNS FIX)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // Lista de APIs que suelen funcionar en servidores con problemas de red
    const apis = [
        {
            name: 'Agatz API',
            async run() {
                const type = isAudio ? 'mp3' : 'mp4'
                // Agatz usa Cloudflare pero suele aceptar VPS
                const { data } = await axios.get(`https://api.agatz.xyz/api/yt${type}?url=${encodeURIComponent(url)}`, { timeout: 15000 })
                if (data.status === 200 && data.data.downloadUrl) return data.data.downloadUrl
                throw new Error('Status Error')
            }
        },
        {
            name: 'DavidCyril API',
            async run() {
                const type = isAudio ? 'mp3' : 'mp4'
                const { data } = await axios.get(`https://api.davidcyriltech.my.id/youtube/${type}?url=${encodeURIComponent(url)}`, { timeout: 15000 })
                if (data.success && data.result.downloadUrl) return data.result.downloadUrl
                throw new Error('API Error')
            }
        },
        {
            name: 'Yasiya API',
            async run() {
                const type = isAudio ? 'ytmp3' : 'ytmp4'
                const { data } = await axios.get(`https://www.dark-yasiya-api.site/api/search/${type}?url=${encodeURIComponent(url)}`, { timeout: 15000 })
                if (data.result && (data.result.dl_link || data.result.url)) return data.result.dl_link || data.result.url
                throw new Error('API Error')
            }
        }
    ]

    for (const api of apis) {
        try {
            console.log(`🔄 [INTENTO] Motor: ${api.name}...`)
            const link = await api.run()
            if (link && link.startsWith('http')) {
                console.log(`✅ [EXITO] ${api.name} funcionó.`)
                return { dl: link }
            }
        } catch (e) {
            console.log(`❌ [FALLO] ${api.name}: ${e.message}`)
        }
    }
    
    throw new Error('⚠️ Tu VPS no tiene conexión a las APIs de descarga.')
}

// ==========================================
// 🚀 COMANDO EXPORTADO
// ==========================================
export default {
    command: ['play', 'mp3', 'mp4'],
    category: 'downloader',

    run: async ({ client, m, text, command }) => {
        if (!text) return m.reply(`🐉 *Ingresa el nombre o enlace.*`)

        try {
            // 1. BÚSQUEDA
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ No encontrado.')

            const { title, thumbnail, timestamp, author, url } = video
            
            const infoMessage = `
*╭─✦ 🐉 LUCOA PLAYER ✦─╮*
│ ❧ *Título:* ${title}
│ ❧ *Tiempo:* ${timestamp}
│ ❧ *Canal:* ${author.name}
╰───────────────⬫
_⏳ Descargando..._`

            const thumbBuffer = await getBuffer(thumbnail)
            await client.sendMessage(m.chat, { image: thumbBuffer || { url: thumbnail }, caption: infoMessage }, { quoted: m })

            // 3. TIPO
            const isVideo = ['mp4', 'ytmp4'].includes(command)
            
            // 4. DESCARGA
            const { dl } = await getDownloadLink(url, !isVideo)
            const safeTitle = sanitizeFileName(title)

            // 5. ENVIAR
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
            if (e.message.includes('ENOTFOUND')) {
                 m.reply('❌ *ERROR DE RED:* El bot no tiene internet para descargar. Revisa tu servidor.')
            } else {
                 m.reply(`❌ Error: ${e.message}`)
            }
        }
    }
}
