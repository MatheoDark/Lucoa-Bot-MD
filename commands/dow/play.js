import yts from 'yt-search'
import axios from 'axios'

// --- CONFIGURACIÓN ---
// Usamos el IP de Google DNS directamente para saltarnos el fallo de tu VPS
const GOOGLE_DNS_API = 'https://8.8.8.8/resolve' 

// Headers para parecer un navegador
const BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://google.com'
}

// --- UTILIDADES ---
const sanitizeFileName = (s = '') => String(s).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Lucoa_Media'

async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', headers: BASE_HEADERS })
        return res.data
    } catch {
        return null
    }
}

// 🔥 LA MAGIA: RESOLVER DNS MANUALMENTE VIA HTTP 🔥
// Esto arregla el "getaddrinfo ENOTFOUND"
async function fetchBlindado(originalUrl) {
    try {
        const urlObj = new URL(originalUrl)
        const hostname = urlObj.hostname

        // 1. Preguntamos a Google cual es la IP del dominio (Saltamos el DNS del VPS)
        const dnsRes = await axios.get(`${GOOGLE_DNS_API}?name=${hostname}&type=A`, { 
            validateStatus: () => true 
        })

        if (!dnsRes.data.Answer || !dnsRes.data.Answer[0]) {
            throw new Error(`DNS Google no conoce a ${hostname}`)
        }

        // 2. Tomamos la primera IP
        const serverIP = dnsRes.data.Answer.find(r => r.type === 1)?.data
        if (!serverIP) throw new Error('No IPv4 found')

        // 3. Reemplazamos el dominio por la IP en la URL
        const ipUrl = originalUrl.replace(hostname, serverIP)

        console.log(`🛡️ Bypass DNS: Conectando a ${serverIP} en lugar de ${hostname}...`)

        // 4. Hacemos la petición a la IP, pero decimos que somos el dominio (Host Spoofing)
        const response = await axios.get(ipUrl, {
            headers: {
                ...BASE_HEADERS,
                'Host': hostname // ¡Esto engaña al servidor!
            },
            timeout: 15000
        })

        return response.data

    } catch (e) {
        console.log(`❌ Bypass falló para ${originalUrl}: ${e.message}`)
        return null
    }
}

// ==========================================
// 🛡️ GESTOR DE DESCARGAS (MODO HACKER)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // API 1: Btch (La mejor, accediendo via IP directa)
    try {
        console.log("🔄 Intento 1: Btch (Modo Blindado)...")
        const type = isAudio ? 'audio' : 'video'
        const apiUrl = `https://api.btch.bz/download/${type}?url=${encodeURIComponent(url)}`
        
        const data = await fetchBlindado(apiUrl)
        if (data && (data.url || data.result?.url)) return { dl: data.url || data.result.url }
    } catch (e) {}

    // API 2: Agatz (Backup)
    try {
        console.log("🔄 Intento 2: Agatz (Modo Blindado)...")
        const type = isAudio ? 'mp3' : 'mp4'
        const apiUrl = `https://api.agatz.xyz/api/yt${type}?url=${encodeURIComponent(url)}`
        
        const data = await fetchBlindado(apiUrl)
        if (data && data.status === 200) return { dl: data.data.downloadUrl }
    } catch (e) {}

    // API 3: Yasiya (Backup 2)
    try {
        console.log("🔄 Intento 3: Yasiya (Modo Blindado)...")
        const type = isAudio ? 'ytmp3' : 'ytmp4'
        const apiUrl = `https://www.dark-yasiya-api.site/api/search/${type}?url=${encodeURIComponent(url)}`
        
        const data = await fetchBlindado(apiUrl)
        if (data && data.result?.dl_link) return { dl: data.result.dl_link }
    } catch (e) {}

    throw new Error('Imposible conectar. Tu VPS tiene un bloqueo de firewall profundo.')
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
            // 1. BUSCAR (Esto usa yt-search, si esto falla, es Game Over)
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ No encontrado.')

            const info = `
*╭─✦ 🐉 LUCOA PLAYER ✦─╮*
│ ❧ *Título:* ${video.title}
│ ❧ *Tiempo:* ${video.timestamp}
│ ❧ *Canal:* ${video.author.name}
╰───────────────⬫
_⏳ Hackeando la matrix para descargar..._`

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
