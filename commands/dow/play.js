import yts from 'yt-search'
import axios from 'axios'

// --- CONFIGURACIÓN ---
const LIMIT_MB = 300 // Límite de tamaño para evitar crash

// Headers para evitar bloqueo de Cloudflare
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://google.com'
}

// --- UTILIDADES ---
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
// 🛡️ GESTOR DE DESCARGAS (MOTORES ACTIVOS)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // Lista de APIs ordenadas por velocidad y estabilidad
    const apis = [
        {
            name: 'Btch API (Tier 1)', // La más rápida actualmente
            async run() {
                const type = isAudio ? 'audio' : 'video'
                const { data } = await axios.get(`https://api.btch.bz/download/${type}?url=${encodeURIComponent(url)}`)
                return data.result?.url || data.url
            }
        },
        {
            name: 'Yasiya API (Tier 2)',
            async run() {
                const type = isAudio ? 'ytmp3' : 'ytmp4'
                const { data } = await axios.get(`https://www.dark-yasiya-api.site/api/search/${type}?url=${encodeURIComponent(url)}`)
                return data.result?.dl_link || data.result?.url
            }
        },
        {
            name: 'Cobalt (Tier 3)', // Respaldo sólido
            async run() {
                const payload = {
                    url: url,
                    filenamePattern: "basic",
                    ...(isAudio ? { downloadMode: "audio", audioFormat: "mp3" } : { downloadMode: "auto", videoQuality: "480" })
                }
                const { data } = await axios.post('https://api.cobalt.tools/api/json', payload, { 
                    headers: { ...HEADERS, 'Accept': 'application/json', 'Content-Type': 'application/json' } 
                })
                return data?.url
            }
        }
    ]

    // Bucle de intentos
    for (const api of apis) {
        try {
            console.log(`🔄 Probando motor: ${api.name}...`)
            const source = axios.CancelToken.source();
            const timeout = setTimeout(() => source.cancel('Timeout'), 10000); // 10s timeout

            const link = await api.run()
            clearTimeout(timeout)

            if (link && link.startsWith('http')) return { dl: link }
        } catch (e) {
            console.log(`❌ Falló ${api.name}`)
        }
    }
    throw new Error('No se pudo descargar. Intenta más tarde.')
}

// ==========================================
// 🚀 COMANDO EXPORTADO
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
            const ago = video.ago || 'Reciente'
            
            // 2. MOSTRAR TARJETA DE INFO
            const infoMessage = `
*𖹭.╭╭ִ╼ׅ࣪ﮩ٨ـﮩ𝗒𝗈𝗎𝗍𝗎𝗏𝖾-𝗉꯭𝗅꯭𝖺꯭𝗒ﮩ٨ـﮩׅ╾࣪╮╮.𖹭*
> ♡ *Título:* ${title}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Duración:* ${timestamp}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Vistas:* ${views}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Canal:* ${author.name}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Publicado:* ${ago}
*⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ*
_⏳ Descargando... Espere un momento._`

            const thumbBuffer = await getBuffer(thumbnail)
            await client.sendMessage(m.chat, { image: thumbBuffer || { url: thumbnail }, caption: infoMessage }, { quoted: m })

            // 3. DETERMINAR TIPO (AUDIO O VIDEO)
            const isVideo = ['mp4', 'ytmp4', 'playvideo', 'play2'].includes(command)
            
            // 4. OBTENER LINK
            const { dl } = await getDownloadLink(url, !isVideo)
            const safeTitle = sanitizeFileName(title)

            // 5. ENVIAR ARCHIVO
            if (isVideo) {
                // Enviar Video
                await client.sendMessage(m.chat, {
                    video: { url: dl },
                    caption: `🎬 *${title}*`,
                    fileName: safeTitle + '.mp4',
                    mimetype: 'video/mp4',
                    jpegThumbnail: thumbBuffer
                }, { quoted: m })
            } else {
                // Enviar Audio (MP3)
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
            m.reply(`❌ Ocurrió un error: ${e.message}`)
        }
    }
}
