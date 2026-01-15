import yts from 'yt-search'
import axios from 'axios'
import https from 'https'
import dns from 'dns'

// 🛑 1. PARCHE DE RED (Mantiene tu VPS en IPv4)
try { if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

// 🛑 2. AGENTE "CIEGO" (Ignora seguridad SSL)
const agent = new https.Agent({ rejectUnauthorized: false })

// --- CONFIGURACIÓN ---
const HEADERS = { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
}

const sanitizeFileName = (s = '') => String(s).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Lucoa_Media'

async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', httpsAgent: agent })
        return res.data
    } catch { return null }
}

// ==========================================
// 🛡️ GESTOR DE DESCARGAS (ROTACIÓN DE INSTANCIAS)
// ==========================================
async function getDownloadLink(url, isAudio) {
    
    // LISTA DE SERVIDORES (Si uno bloquea tu IP, el otro no)
    // Estos son servidores públicos de Cobalt.
    const instances = [
        'https://cobalt.xy24.eu',      // Instancia Europea (Suele funcionar en VPS)
        'https://cobalt.wst.sh',       // Instancia alternativa
        'https://api.cobalt.tools',    // Oficial (Probablemente bloqueado, pero se intenta)
        'https://cobalt.tools'         // Backup
    ]

    // 1. INTENTO CON COBALT (ROTATIVO)
    for (const base of instances) {
        try {
            console.log(`🔄 Probando servidor: ${base}...`)
            
            const payload = {
                url: url,
                filenamePattern: "basic",
                ...(isAudio ? { isAudioOnly: true } : { vQuality: "480" }) 
            }

            const { data } = await axios.post(`${base}/api/json`, payload, {
                headers: HEADERS,
                httpsAgent: agent,
                timeout: 8000 // 8 segundos por servidor
            })

            if (data.url) {
                console.log(`✅ ¡Conectado a ${base}!`)
                return { dl: data.url, title: 'Lucoa Media' }
            }
        } catch (e) {
            console.log(`❌ ${base} falló o bloqueó la IP.`)
        }
    }

    // 2. INTENTO CON Y2MATE (RESPALDO FINAL - SCRAPER)
    try {
        console.log("🔄 Activando Protocolo Y2Mate...")
        const type = isAudio ? 'mp3' : 'mp4'
        const analyze = await axios.post('https://www.y2mate.com/mates/analyzeV2/ajax', 
            new URLSearchParams({ k_query: url, k_page: 'home', hl: 'es', q_auto: '0' }),
            { 
                headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                httpsAgent: agent
            }
        )
        if (analyze.data && analyze.data.links) {
            const vid = analyze.data.vid
            // Buscar la mejor calidad disponible
            let table = isAudio ? analyze.data.links.mp3 : analyze.data.links.mp4
            let k = Object.values(table || {})[0]?.k // Toma la primera opción
            
            if (k) {
                const convert = await axios.post('https://www.y2mate.com/mates/convertV2/ajax',
                    new URLSearchParams({ vid, k }),
                    { 
                        headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                        httpsAgent: agent
                    }
                )
                if (convert.data.dlink) return { dl: convert.data.dlink, title: convert.data.title }
            }
        }
    } catch (e) { console.log("❌ Y2Mate falló") }

    throw new Error('Todos los servidores están bloqueados o caídos.')
}

// ==========================================
// 🚀 COMANDO LUCOA PLAY
// ==========================================
export default {
    command: ['play', 'mp3', 'mp4', 'ytmp3', 'ytmp4', 'playvideo', 'playaudio'],
    category: 'downloader',
    
    // --- PARTE 1: MENÚ ---
    run: async ({ client, m, args, command, text }) => {
        try {
            if (!text.trim()) return m.reply('Ara ara~ ¿Qué quieres escuchar, cariño? Escribe el nombre. 💋')

            let url, title, videoInfo
            const isAutoMode = command !== 'play' 

            // 1. BUSCAR EN YOUTUBE
            try {
                if (text.match(/http/)) {
                    url = text
                    try {
                        const vId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop()
                        videoInfo = await yts({ videoId: vId })
                        title = videoInfo.title
                    } catch { 
                        title = 'Lucoa Media'; videoInfo = { thumbnail: 'https://i.imgur.com/4L7dK0O.png', timestamp: '??', views: '??', author: {name: '??'} }
                    }
                } else {
                    const search = await yts(text)
                    if (!search.all.length) return m.reply('Vaya... No encontré nada con ese nombre. ✨')
                    videoInfo = search.all[0]
                    url = videoInfo.url
                    title = videoInfo.title
                }
            } catch (e) { return m.reply('Ups, error buscando... 😿') }

            // 2. SI ES SOLO "PLAY", MUESTRA EL MENÚ
            if (!isAutoMode) {
                const caption = `
╭━─━─━─≪ 🐉 ≫─━─━─━╮
│ ❧ 𝐓𝐢́𝐭𝐮𝐥𝐨: ${title}
│ ❧ 𝐃𝐮𝐫𝐚𝐜𝐢𝐨́𝐧: ${videoInfo.timestamp}
│ ❧ 𝐕𝐢𝐬𝐭𝐚𝐬: ${videoInfo.views}
│ ❧ 𝐂𝐚𝐧𝐚𝐥: ${videoInfo.author.name}
╰━─━─━─≪ 🥥 ≫─━─━─━╯

*Ara ara~ ¿Cómo lo quieres, tesoro? 💕*
_Responde con:_

🎵 *1* (Audio)
🎬 *2* (Video)

_Shouta-kun está esperando..._ 🍷
`
                const thumb = await getBuffer(videoInfo.thumbnail)
                global.play_pending = global.play_pending || {}
                global.play_pending[m.chat] = { url, title, thumb, sender: m.sender }

                await client.sendMessage(m.chat, { image: thumb, caption: caption }, { quoted: m })
                return
            }

            // 3. DESCARGA DIRECTA
            const isAudio = ['mp3', 'playaudio', 'ytmp3'].includes(command)
            await processDownload(client, m, url, isAudio, title, videoInfo.thumbnail)

        } catch (error) {
            m.reply(`❌ Ay... Algo se rompió: ${error.message}`)
        }
    },

    // --- PARTE 2: RESPUESTA ---
    before: async (m, { client }) => {
        const text = m.text?.toLowerCase().trim()
        if (!['1', '2', 'mp3', 'mp4', 'audio', 'video'].includes(text)) return false

        const pending = global.play_pending?.[m.chat]
        if (!pending || pending.sender !== m.sender) return false

        delete global.play_pending[m.chat]
        
        const isAudio = ['1', 'mp3', 'audio'].includes(text)
        await processDownload(client, m, pending.url, isAudio, pending.title, pending.thumb)
        return true
    }
}

// --- FUNCIÓN DE DESCARGA ---
async function processDownload(client, m, url, isAudio, title, thumb) {
    await m.reply(isAudio ? '🎧 _Ara ara~ Subiendo tu música..._ 🎵' : '🎬 _Aquí va tu video, tesoro..._ 📽️')
    
    try {
        const result = await getDownloadLink(url, isAudio)

        if (!result || !result.dl) {
            return m.reply('❌ Lo siento cariño, ningún servidor quiso responder a tu VPS. Intenta más tarde.')
        }

        const finalTitle = result.title || title
        const fileName = `${sanitizeFileName(finalTitle)}.${isAudio ? 'mp3' : 'mp4'}`
        const thumbBuffer = typeof thumb === 'string' ? await getBuffer(thumb) : thumb

        const mediaMessage = isAudio 
            ? { 
                document: { url: result.dl }, 
                mimetype: 'audio/mpeg', 
                fileName: fileName,
                contextInfo: {
                    externalAdReply: {
                        title: finalTitle,
                        body: "🐉 Lucoa Player",
                        thumbnail: thumbBuffer,
                        sourceUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
              }
            : { 
                video: { url: result.dl }, 
                fileName: fileName, 
                mimetype: 'video/mp4', 
                caption: `🎬 *${finalTitle}*\n_Disfruta~_ 💋`,
                jpegThumbnail: thumbBuffer 
              }

        await client.sendMessage(m.chat, mediaMessage, { quoted: m })

    } catch (e) {
        m.reply(`❌ Error técnico: ${e.message}`)
    }
}
