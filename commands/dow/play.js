import yts from 'yt-search'
import axios from 'axios'
import https from 'https'

// 🛡️ AGENTE HTTPS QUE IGNORA CERTIFICADOS (Clave para conectar por IP)
const HACKER_AGENT = new https.Agent({ 
    rejectUnauthorized: false, // ¡Esto permite conectar directo a la IP!
    keepAlive: true 
})

// Configuración de Headers
const BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://google.com'
}

const sanitizeFileName = (s = '') => String(s).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Lucoa_Media'

// --- UTILIDAD DE MINIATURA ---
async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', httpsAgent: HACKER_AGENT })
        return res.data
    } catch {
        return null
    }
}

// 🔥 LA MAGIA: RESOLVER DNS (CORREGIDO) 🔥
async function fetchBlindado(originalUrl, method = 'GET', body = null) {
    try {
        const urlObj = new URL(originalUrl)
        const hostname = urlObj.hostname

        // 1. Preguntamos a dns.google (Endpoint oficial, más estable)
        console.log(`🔍 Resolviendo IP para: ${hostname}...`)
        const dnsRes = await axios.get(`https://dns.google/resolve?name=${hostname}&type=A`, { 
            httpsAgent: HACKER_AGENT,
            timeout: 5000 
        })

        if (!dnsRes.data.Answer) throw new Error(`DNS Google falló para ${hostname}`)
        
        // 2. Tomamos la IP
        const serverIP = dnsRes.data.Answer.find(r => r.type === 1)?.data
        if (!serverIP) throw new Error('No IPv4 found')

        // 3. Construimos URL con IP
        const ipUrl = originalUrl.replace(hostname, serverIP)
        console.log(`🚀 Conectando a ${serverIP} (Spoofing ${hostname})...`)

        // 4. Petición "Sucia" (Directa a IP + Headers Falsos + Sin SSL Check)
        const axiosConfig = {
            method: method,
            url: ipUrl,
            headers: {
                ...BASE_HEADERS,
                'Host': hostname, // Engañamos al servidor
                ...(method === 'POST' ? { 'Content-Type': 'application/json', 'Accept': 'application/json' } : {})
            },
            httpsAgent: HACKER_AGENT, // Importante
            timeout: 15000,
            data: body
        }

        const response = await axios(axiosConfig)
        return response.data

    } catch (e) {
        console.log(`❌ Falló conexión a ${originalUrl}: ${e.message}`)
        return null
    }
}

// ==========================================
// 🛡️ GESTOR DE DESCARGAS (MODO HACKER)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // TIER 1: COBALT (La mejor, ahora con bypass de DNS)
    try {
        console.log("🔄 Intento 1: Cobalt...")
        const payload = {
            url: url,
            filenamePattern: "basic",
            // Configuración exacta para Cobalt 2026
            ...(isAudio 
                ? { downloadMode: "audio", audioFormat: "mp3" } 
                : { downloadMode: "auto", videoQuality: "480" }) 
        }
        // Usamos POST con el bypass
        const data = await fetchBlindado('https://api.cobalt.tools/api/json', 'POST', payload)
        if (data && data.url) return { dl: data.url }
    } catch (e) {}

    // TIER 2: BTCH
    try {
        console.log("🔄 Intento 2: Btch...")
        const type = isAudio ? 'audio' : 'video'
        const apiUrl = `https://api.btch.bz/download/${type}?url=${encodeURIComponent(url)}`
        
        const data = await fetchBlindado(apiUrl)
        if (data && (data.url || data.result?.url)) return { dl: data.url || data.result.url }
    } catch (e) {}

    // TIER 3: AGATZ
    try {
        console.log("🔄 Intento 3: Agatz...")
        const type = isAudio ? 'mp3' : 'mp4'
        const apiUrl = `https://api.agatz.xyz/api/yt${type}?url=${encodeURIComponent(url)}`
        
        const data = await fetchBlindado(apiUrl)
        if (data && data.data?.downloadUrl) return { dl: data.data.downloadUrl }
    } catch (e) {}

    throw new Error('Tu VPS no deja salir el tráfico a ninguna API.')
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
            // 1. BUSCAR (Usa yt-search normal, si falla es DNS del sistema)
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ No encontrado.')

            const info = `
*╭─✦ 🐉 LUCOA PLAYER ✦─╮*
│ ❧ *Título:* ${video.title}
│ ❧ *Tiempo:* ${video.timestamp}
│ ❧ *Canal:* ${video.author.name}
╰───────────────⬫
_⏳ Hackeando red para descargar..._`

            // Intentamos bajar miniatura con el agente hacker también
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
            m.reply(`❌ Fallo crítico: ${e.message}`)
        }
    }
}
