import yts from 'yt-search'
import axios from 'axios'
import dns from 'dns'

// 🛑 PARCHE DE RED OBLIGATORIO PARA VPS
// Esto obliga a Node.js a usar IPv4 (la red que sí te funciona)
try {
    if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

// --- CONFIGURACIÓN ---
const TIMEOUT = 15000 
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://google.com'
}

// --- UTILIDADES ---
async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', headers: HEADERS })
        return res.data
    } catch {
        return null
    }
}

// ==========================================
// 🛡️ LÓGICA DE DESCARGA (ESTILO DE TU AMIGO)
// ==========================================
async function getMediaFromApis(url, type) {
    // type: 'audio' o 'video'
    
    // Aquí definimos las APIs que funcionan HOY (sin usar global.APIs)
    const apis = [
        {
            name: 'Btch API', // Muy estable
            url: `https://api.btch.bz/download/${type}?url=${encodeURIComponent(url)}`,
            extract: (data) => data.result?.url || data.url
        },
        {
            name: 'Agatz API', // Rápida
            url: `https://api.agatz.xyz/api/yt${type === 'audio' ? 'mp3' : 'mp4'}?url=${encodeURIComponent(url)}`,
            extract: (data) => data.data?.downloadUrl
        },
        {
            name: 'Yasiya API', // Buen backup
            url: `https://www.dark-yasiya-api.site/api/search/yt${type === 'audio' ? 'mp3' : 'mp4'}?url=${encodeURIComponent(url)}`,
            extract: (data) => data.result?.dl_link || data.result?.url
        },
        {
            name: 'Delirius API', // Proxy
            url: `https://delirius-apiofc.vercel.app/download/yt${type === 'audio' ? 'mp3' : 'mp4'}?url=${encodeURIComponent(url)}`,
            extract: (data) => data.data?.download?.url || data.data?.url
        }
    ]

    // BUCLE DE INTENTOS (La lógica de tu amigo mejorada)
    for (const api of apis) {
        try {
            console.log(`🔄 Probando: ${api.name}...`)
            
            const { data } = await axios.get(api.url, { 
                headers: HEADERS, 
                timeout: TIMEOUT 
            })
            
            const link = api.extract(data)
            
            if (link && link.startsWith('http')) {
                return { url: link, api: api.name }
            }
        } catch (e) {
            console.log(`❌ Falló ${api.name}: ${e.message}`)
        }
    }
    return null
}

// ==========================================
// 🚀 COMANDO PRINCIPAL
// ==========================================
export default {
    command: ['play', 'mp3', 'ytmp3', 'play2', 'mp4', 'ytmp4', 'video'],
    category: 'downloader',
    
    run: async ({ client, m, args, command }) => {
        try {
            if (!args[0]) return m.reply('🐉 *Ingresa el nombre o enlace.*')
            
            const text = args.join(' ')
            const isVideo = ['play2', 'mp4', 'ytmp4', 'video'].includes(command)
            
            // 1. BUSCAR VIDEO
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ No encontrado.')

            const { title, thumbnail, timestamp, views, author, url } = video
            
            // 2. ENVIAR INFO (Estilo de tu amigo)
            const infoMessage = `➩ Descargando › *${title}*

> ❖ Canal › *${author.name}*
> ⴵ Duración › *${timestamp}*
> ❀ Vistas › *${views}*
> ❒ Tipo › *${isVideo ? 'Video (MP4)' : 'Audio (MP3)'}*`

            const thumbBuffer = await getBuffer(thumbnail)
            await client.sendMessage(m.chat, { image: thumbBuffer || { url: thumbnail }, caption: infoMessage }, { quoted: m })

            // 3. OBTENER DESCARGA (Usando la lista de APIs)
            const typeStr = isVideo ? 'video' : 'audio'
            const result = await getMediaFromApis(url, typeStr)

            if (!result || !result.url) {
                return m.reply(`❌ No se pudo descargar el *${typeStr}*. Intenta de nuevo en un momento.`)
            }

            // 4. ENVIAR ARCHIVO
            const fileName = `${title}.${isVideo ? 'mp4' : 'mp3'}`.replace(/[\\/:*?"<>|]/g, '')
            
            if (isVideo) {
                await client.sendMessage(m.chat, { 
                    video: { url: result.url }, 
                    caption: `🎬 ${title}`,
                    mimetype: 'video/mp4',
                    fileName: fileName
                }, { quoted: m })
            } else {
                await client.sendMessage(m.chat, { 
                    audio: { url: result.url }, 
                    mimetype: 'audio/mpeg', 
                    fileName: fileName 
                }, { quoted: m })
            }

        } catch (e) {
            console.error(e)
            m.reply(`❌ Error: ${e.message}`)
        }
    }
}
