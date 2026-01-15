import yts from 'yt-search'
import axios from 'axios'
import https from 'https'
import dns from 'dns'

// 1. PARCHE DE RED (OBLIGATORIO)
try { if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

// 2. IGNORAR SSL (Para que tu VPS conecte aunque los certificados fallen)
const agent = new https.Agent({ rejectUnauthorized: false })

// 3. HEADERS SIMPLES
const headers = { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
}

// --- UTILIDADES ---
const sanitizeFileName = (s = '') => String(s).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Lucoa_Media'

async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', httpsAgent: agent })
        return res.data
    } catch { return null }
}

// ==========================================
// 🛡️ GESTOR DE DESCARGAS (NUEVAS APIS)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // TIER 1: ALYACHAN (La más estable ahora mismo)
    try {
        console.log("🔄 Intento 1: AlyaChan...")
        const type = isAudio ? 'ytmp3' : 'ytmp4'
        const { data } = await axios.get(`https://api.alyachan.dev/api/${type}?url=${encodeURIComponent(url)}`, { 
            httpsAgent: agent,
            timeout: 10000 
        })
        
        if (data.status && data.data) {
            // Alya devuelve .url o .download
            return { dl: data.data.url || data.data.download, title: data.data.title }
        }
    } catch (e) { console.log("❌ AlyaChan falló") }

    // TIER 2: COBALT (Payload arreglado para evitar Error 400)
    try {
        console.log("🔄 Intento 2: Cobalt...")
        const payload = {
            url: url,
            filenamePattern: "basic",
            // Solo enviamos lo estrictamente necesario
            ...(isAudio ? { isAudioOnly: true } : { vQuality: "480" }) 
        }
        
        const { data } = await axios.post('https://api.cobalt.tools/api/json', payload, {
            headers: { ...headers, 'Accept': 'application/json', 'Content-Type': 'application/json' },
            httpsAgent: agent
        })

        if (data.url) return { dl: data.url, title: 'Lucoa Media' }
    } catch (e) { console.log("❌ Cobalt falló") }

    // TIER 3: DELIRIUS (Respaldo)
    try {
        console.log("🔄 Intento 3: Delirius...")
        const type = isAudio ? 'ytmp3' : 'ytmp4'
        const { data } = await axios.get(`https://delirius-apiofc.vercel.app/download/${type}?url=${encodeURIComponent(url)}`, { httpsAgent: agent })
        if (data.data?.download?.url) return { dl: data.data.download.url, title: 'Lucoa Media' }
    } catch (e) {}

    throw new Error('Todas las APIs fallaron. Tu VPS tiene problemas de conexión.')
}

// ==========================================
// 🚀 COMANDO PLAY
// ==========================================
export default {
    command: ['play', 'mp3', 'mp4', 'ytmp3', 'ytmp4', 'playvideo', 'playaudio'],
    category: 'downloader',
    
    run: async ({ client, m, args, command, text }) => {
        try {
            if (!text.trim()) return m.reply('✎ Ingresa el nombre o URL.')

            let url, title, videoInfo
            const isAudio = ['play', 'mp3', 'playaudio', 'ytmp3'].includes(command)

            // 1. BUSCAR EN YOUTUBE
            try {
                // Si es URL
                if (text.match(/http/)) {
                    url = text
                    try {
                        const vId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop()
                        videoInfo = await yts({ videoId: vId })
                        title = videoInfo.title
                    } catch { 
                        title = 'Lucoa Media'; videoInfo = { thumbnail: 'https://i.imgur.com/4L7dK0O.png' } 
                    }
                } 
                // Si es Texto
                else {
                    const search = await yts(text)
                    if (!search.all.length) return m.reply('✎ No encontrado.')
                    videoInfo = search.all[0]
                    url = videoInfo.url
                    title = videoInfo.title
                    
                    const infoMessage = `
*𖹭.╭╭ִ╼ׅ࣪ﮩ٨ـﮩ𝗒𝗈𝗎𝗍𝗎𝗏𝖾-𝗉꯭𝗅꯭𝖺꯭𝗒ﮩ٨ـﮩׅ╾࣪╮╮.𖹭*
> ♡ *Título:* ${title}
> ♡ *Duración:* ${videoInfo.timestamp}
> ♡ *Canal:* ${videoInfo.author.name}
*⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ*`
                    
                    const thumb = await getBuffer(videoInfo.thumbnail)
                    await client.sendMessage(m.chat, thumb ? { image: thumb, caption: infoMessage } : { text: infoMessage }, { quoted: m })
                }
            } catch (e) {
                return m.reply('Error buscando: ' + e.message)
            }

            // 2. DESCARGAR
            m.reply(isAudio ? '🎧 _Subiendo audio..._' : '🎬 _Subiendo video..._')
            
            const result = await getDownloadLink(url, isAudio)
            const finalTitle = result.title && result.title !== 'Lucoa Media' ? result.title : title
            const fileName = `${sanitizeFileName(finalTitle)}.${isAudio ? 'mp3' : 'mp4'}`

            // 3. ENVIAR
            if (isAudio) {
                await client.sendMessage(m.chat, {
                    document: { url: result.dl },
                    mimetype: 'audio/mpeg',
                    fileName: fileName
                }, { quoted: m })
            } else {
                await client.sendMessage(m.chat, {
                    video: { url: result.dl },
                    fileName: fileName,
                    mimetype: 'video/mp4',
                    caption: `🎬 ${finalTitle}`
                }, { quoted: m })
            }

        } catch (error) {
            console.error(error)
            m.reply(`❌ ${error.message}`)
        }
    }
}
