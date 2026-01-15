import yts from 'yt-search'
import axios from 'axios'
import dns from 'dns'
import https from 'https'

// 🛑 1. PARCHE DE RED OBLIGATORIO (IPV4)
try { if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

// 🛑 2. IGNORAR ERRORES SSL (Para que no falle la conexión segura)
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

// --- CONFIGURACIÓN ---
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.google.com/'
}

// --- UTILIDADES ---
const isYTUrl = (url) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url)

async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', httpsAgent })
        return res.data
    } catch { return null }
}

// ==========================================
// 🛠️ MOTOR 1: Y2MATE (SCRAPER LOCAL)
// ==========================================
// Este código hace el trabajo dentro de tu bot, no usa APIs externas.
async function y2mateLocal(url, isAudio) {
    try {
        console.log('🔄 Ejecutando Y2Mate Local...')
        // 1. Analizar video
        const { data: analyze } = await axios.post('https://www.y2mate.com/mates/analyzeV2/ajax', 
            new URLSearchParams({ k_query: url, k_page: 'home', hl: 'es', q_auto: '0' }),
            { 
                headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                httpsAgent 
            }
        )
        
        if (!analyze.links) throw new Error('No links found')
        const vid = analyze.vid
        let k = null

        // 2. Seleccionar calidad
        if (isAudio) {
            // Busca mp3, prefiere 128kbps
            k = (Object.values(analyze.links.mp3 || {}).find(i => i.f === 'mp3') || {}).k
        } else {
            // Busca video mp4, prefiere 720p o auto
            const mp4 = analyze.links.mp4 || {}
            k = (Object.values(mp4).find(v => v.q === '720p') || Object.values(mp4)[0])?.k
        }

        if (!k) throw new Error('Formato no disponible')

        // 3. Convertir y obtener link final
        const { data: convert } = await axios.post('https://www.y2mate.com/mates/convertV2/ajax',
            new URLSearchParams({ vid, k }),
            { 
                headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                httpsAgent 
            }
        )

        if (convert.dlink) return { dl: convert.dlink, title: convert.title }

    } catch (e) {
        console.log(`❌ Y2Mate falló: ${e.message}`)
    }
    return null
}

// ==========================================
// 🛠️ MOTOR 2: COBALT (API PÚBLICA)
// ==========================================
async function cobaltApi(url, isAudio) {
    try {
        console.log('🔄 Ejecutando Cobalt...')
        const { data } = await axios.post('https://api.cobalt.tools/api/json', {
            url: url,
            filenamePattern: "basic",
            ...(isAudio ? { isAudioOnly: true } : { vQuality: "480" })
        }, { 
            headers: { ...HEADERS, 'Accept': 'application/json', 'Content-Type': 'application/json' },
            httpsAgent
        })
        
        if (data.url) return { dl: data.url, title: 'Lucoa Media' }
    } catch (e) {
        console.log(`❌ Cobalt falló: ${e.message}`)
    }
    return null
}

// ==========================================
// 🚀 COMANDO PRINCIPAL
// ==========================================
export default {
    command: ['play', 'mp3', 'playaudio', 'ytmp3', 'play2', 'mp4', 'playvideo', 'ytmp4'],
    category: 'downloader',
    
    run: async ({ client, m, args, command, text }) => {
        try {
            if (!text.trim()) return m.reply('✎ Ingresa el nombre o URL.')

            let url, title, videoInfo
            const esURL = isYTUrl(text)

            // 1. BUSCAR EN YOUTUBE
            if (!esURL) {
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
*⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ⏝ּׅ︢︣ۛ۫۫۫۫۫۫ۜ*
_⏳ Procesando descarga..._`

                const thumb = await getBuffer(videoInfo.thumbnail)
                await client.sendMessage(m.chat, thumb ? { image: thumb, caption: infoMessage } : { text: infoMessage }, { quoted: m })
            } else {
                url = text
                try {
                    videoInfo = await yts({ videoId: url.split('v=')[1] || url.split('/').pop() })
                    title = videoInfo.title
                } catch { title = 'Lucoa Media' }
            }

            // 2. ELEGIR FORMATO
            const isAudio = ['play', 'mp3', 'playaudio', 'ytmp3'].includes(command)

            // 3. INTENTAR DESCARGA (Y2MATE -> COBALT)
            let result = await y2mateLocal(url, isAudio)
            if (!result) result = await cobaltApi(url, isAudio)

            if (!result || !result.dl) return m.reply('❌ Fallaron todos los servidores. Intenta más tarde.')

            // 4. ENVIAR ARCHIVO
            const fileName = `${title}.${isAudio ? 'mp3' : 'mp4'}`.replace(/[\\/:*?"<>|]/g, '')

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
                    caption: `🎬 ${title}`
                }, { quoted: m })
            }

        } catch (error) {
            console.error(error)
            m.reply(`❌ Error crítico: ${error.message}`)
        }
    }
}
