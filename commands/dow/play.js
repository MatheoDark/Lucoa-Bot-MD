import yts from 'yt-search'
import axios from 'axios'
import https from 'https'

const MAGIC_IP = '172.67.151.137' 

// Agente para ignorar SSL (necesario al conectar por IP directa)
const HACKER_AGENT = new https.Agent({ rejectUnauthorized: false, keepAlive: true })

const BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Origin': 'https://cobalt.tools',
    'Referer': 'https://cobalt.tools/'
}

const sanitizeFileName = (s = '') => String(s).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Lucoa_Media'

async function getBuffer(url) {
    try {
        // Intentamos obtener el buffer normalmente, si falla no es crítico
        const res = await axios.get(url, { responseType: 'arraybuffer', httpsAgent: HACKER_AGENT })
        return res.data
    } catch { return null }
}

// 🔥 FUNCIÓN DE CONEXIÓN DIRECTA (DOMAIN FRONTING) 🔥
async function requestMagic(domain, path, method = 'GET', body = null) {
    try {
        console.log(`🚀 Fronting: Conectando a ${MAGIC_IP} disfrazado de ${domain}...`)
        
        const response = await axios({
            method: method,
            url: `https://${MAGIC_IP}${path}`, // Conectamos a la IP
            headers: {
                ...BASE_HEADERS,
                'Host': domain, // 🎭 LA MÁSCARA: Engañamos al servidor
                ...(method === 'POST' ? { 'Content-Type': 'application/json', 'Accept': 'application/json' } : {})
            },
            httpsAgent: HACKER_AGENT,
            data: body,
            timeout: 15000
        })
        return response.data
    } catch (e) {
        console.log(`❌ Error en ${domain}: ${e.response ? e.response.status : e.message}`)
        return null
    }
}

// ==========================================
// 🛡️ GESTOR DE DESCARGAS
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // TIER 1: COBALT (Corregido Payload Error 400)
    try {
        console.log("🔄 Intento 1: Cobalt (Vía IP Maestra)...")
        const payload = {
            url: url,
            filenamePattern: "basic",
            // ⚠️ FIX: Usamos los parámetros clásicos que nunca fallan
            ...(isAudio 
                ? { isAudioOnly: true } 
                : { vQuality: "480" }) 
        }
        
        const data = await requestMagic('api.cobalt.tools', '/api/json', 'POST', payload)
        if (data && data.url) return { dl: data.url }
    } catch (e) {}

    // TIER 2: BTCH (Vía IP Maestra)
    try {
        console.log("🔄 Intento 2: Btch (Vía IP Maestra)...")
        const type = isAudio ? 'audio' : 'video'
        // Btch usa GET
        const path = `/download/${type}?url=${encodeURIComponent(url)}`
        
        const data = await requestMagic('api.btch.bz', path, 'GET')
        if (data && (data.url || data.result?.url)) return { dl: data.url || data.result.url }
    } catch (e) {}

    try {
        console.log("🔄 Intento 3: Agatz (IP Específica)...")
        const type = isAudio ? 'mp3' : 'mp4'
        const agatzIP = '103.224.182.212' 
        
        const response = await axios.get(`https://${agatzIP}/api/yt${type}?url=${encodeURIComponent(url)}`, {
            headers: { ...BASE_HEADERS, 'Host': 'api.agatz.xyz' },
            httpsAgent: HACKER_AGENT,
            timeout: 10000
        })
        
        if (response.data && response.data.status === 200) return { dl: response.data.data.downloadUrl }
    } catch (e) { console.log(`❌ Agatz falló: ${e.message}`) }

    throw new Error('Todas las rutas fallaron. El firewall de tu VPS es impenetrable.')
}

// ==========================================
// 🚀 COMANDO PLAY
// ==========================================
export default {
    command: ['play', 'mp3', 'mp4', 'ytmp3', 'ytmp4', 'playvideo', 'playaudio'],
    category: 'downloader',

    run: async ({ client, m, text, command }) => {
        if (!text) return m.reply(`🐉 *Ingresa el título.*`)

        try {
            // 1. BUSCAR
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ No encontrado.')

            const info = `
*╭─✦ 🐉 LUCOA PLAYER ✦─╮*
│ ❧ *Título:* ${video.title}
│ ❧ *Tiempo:* ${video.timestamp}
│ ❧ *Canal:* ${video.author.name}
╰───────────────⬫
_⏳ Descargando via Direct-IP..._`

            const thumbBuffer = await getBuffer(video.thumbnail)
            await client.sendMessage(m.chat, { image: thumbBuffer || { url: video.thumbnail }, caption: info }, { quoted: m })

            // 2. DESCARGAR
            const isVideo = ['mp4', 'ytmp4', 'playvideo'].includes(command)
            const { dl } = await getDownloadLink(video.url, !isVideo)
            const safeTitle = sanitizeFileName(video.title)

            // 3. ENVIAR
            if (isVideo) {
                await client.sendMessage(m.chat, {
                    video: { url: dl },
                    caption: `🎬 ${video.title}`,
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
                            title: video.title,
                            body: "🐉 Lucoa Player",
                            thumbnail: thumbBuffer,
                            sourceUrl: video.url,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m })
            }

        } catch (e) {
            console.error(e)
            m.reply(`❌ Error: ${e.message}`)
        }
    }
}
