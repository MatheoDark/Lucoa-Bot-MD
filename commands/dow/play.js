import yts from 'yt-search'
import axios from 'axios'
import crypto from 'crypto'
import dns from 'dns'
import https from 'https'

// 🛑 PARCHE DE RED (Vital para tu VPS)
try { if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

// Agente SSL Permisivo
const agent = new https.Agent({ rejectUnauthorized: false })

// --- UTILIDADES ---
const sanitizeFileName = (s = '') => String(s).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Lucoa_Media'

async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', httpsAgent: agent })
        return res.data
    } catch { return null }
}

// ==========================================
// 🛠️ MOTOR 1: SAVETUBE (SCRAPER LOCAL)
// ==========================================
const decodeSavetube = (enc) => {
    try {
        const secret_key = 'C5D58EF67A7584E4A29F6C35BBC4EB12'
        const data = Buffer.from(enc, 'base64')
        const iv = data.slice(0, 16)
        const content = data.slice(16)
        const key = Buffer.from(secret_key, 'hex')
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv) 
        let decrypted = Buffer.concat([decipher.update(content), decipher.final()])
        return JSON.parse(decrypted.toString())
    } catch (error) { return null }
}

async function savetubeScraper(link, type) {
    try {
        const quality = type === 'audio' ? '128' : '720'
        const dlType = type === 'audio' ? 'audio' : 'video'
        const cdn = (await axios.get("https://media.savetube.me/api/random-cdn")).data.cdn
        const infoget = await axios.post(`https://${cdn}/v2/info`, { 'url': link }, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36', 'Referer': 'https://yt.savetube.me/' }
        })
        const info = decodeSavetube(infoget.data.data)
        if (!info) throw new Error('Error decode')
        const response = await axios.post(`https://${cdn}/download`, {
            'downloadType': dlType, 'quality': quality, 'key': info.key
        }, {
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36', 'Referer': 'https://yt.savetube.me/' }
        })
        if (response.data.data.downloadUrl) return { dl: response.data.data.downloadUrl, title: info.title }
    } catch (e) { return null }
    return null
}

// ==========================================
// 🛠️ MOTOR 2: OGMP3 (SCRAPER LOCAL)
// ==========================================
const ogmp3 = {
    api: { base: "https://api3.apiapi.lat", endpoints: { a: "https://api5.apiapi.lat" } },
    headers: { 'content-type': 'application/json', 'user-agent': 'Postify/1.0.0' },
    utils: {
        hash: () => crypto.randomBytes(8).toString('hex'),
        encoded: (str) => {
            let result = "";
            for (let i = 0; i < str.length; i++) { result += String.fromCharCode(str.charCodeAt(i) ^ 1); }
            return result;
        },
        enc_url: (url) => {
            const codes = [];
            for (let i = 0; i < url.length; i++) { codes.push(url.charCodeAt(i)); }
            return codes.join(",").split(",").reverse().join(",");
        }
    },
    request: async (endpoint, data = {}) => {
        try {
            const { data: response } = await axios({ method: 'post', url: `https://api5.apiapi.lat${endpoint}`, data: data, headers: ogmp3.headers });
            return { status: true, data: response };
        } catch (error) { return { status: false }; }
    },
    download: async (link, type) => {
        try {
            const c = ogmp3.utils.hash();
            const d = ogmp3.utils.hash();
            const req = {
                data: ogmp3.utils.encoded(link),
                format: type === 'audio' ? "0" : "1",
                mp3Quality: type === 'audio' ? "128" : null,
                mp4Quality: type === 'video' ? "360" : null,
                userTimeZone: "0"
            };
            const resx = await ogmp3.request(`/${c}/init/${ogmp3.utils.enc_url(link)}/${d}/`, req);
            if (!resx.status || !resx.data || resx.data.s !== "C") return null;
            return {
                dl: `${ogmp3.api.base}/${ogmp3.utils.hash()}/download/${ogmp3.utils.encoded(resx.data.i)}/${ogmp3.utils.hash()}/`,
                title: resx.data.t || "Media"
            }
        } catch (e) { return null }
    }
};

// ==========================================
// 🐉 COMANDO LUCOA PLAY 🐉
// ==========================================
export default {
    command: ['play', 'mp3', 'mp4', 'ytmp3', 'ytmp4', 'playvideo', 'playaudio'],
    category: 'downloader',
    
    // --- BÚSQUEDA ---
    run: async ({ client, m, args, command, text }) => {
        try {
            if (!text.trim()) return m.reply('Ara ara~ ¿Qué quieres escuchar, cariño? Tienes que decirme el nombre o darme el link. 💋')

            let url, title, videoInfo
            const isAutoMode = command !== 'play' 

            // 1. BUSCAR EN YOUTUBE
            try {
                if (text.match(/http/)) {
                    url = text
                    const vId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop()
                    videoInfo = await yts({ videoId: vId })
                    title = videoInfo.title
                } else {
                    const search = await yts(text)
                    if (!search.all.length) return m.reply('Vaya... No encontré nada con ese nombre. ¿Seguro que no te equivocaste? ✨')
                    videoInfo = search.all[0]
                    url = videoInfo.url
                    title = videoInfo.title
                }
            } catch (e) { return m.reply('Ups, mis poderes fallaron buscando eso... 😿') }

            // 2. SI ES SOLO "PLAY", MUESTRA EL MENÚ DE LUCOA
            if (!isAutoMode) {
                const caption = `
╭━─━─━─≪ 🐉 ≫─━─━─━╮
│ ❧ 𝐓𝐢́𝐭𝐮𝐥𝐨: ${title}
│ ❧ 𝐃𝐮𝐫𝐚𝐜𝐢𝐨́𝐧: ${videoInfo.timestamp}
│ ❧ 𝐕𝐢𝐬𝐭𝐚𝐬: ${videoInfo.views}
│ ❧ 𝐂𝐚𝐧𝐚𝐥: ${videoInfo.author.name}
╰━─━─━─≪ 🥥 ≫─━─━─━╯

*Ara ara~ ¿Cómo lo quieres, tesoro? 💕*
_Responde con el número o escribe:_

🎵 *1* o *mp3* (Audio)
🎬 *2* o *mp4* (Video)

_¡Date prisa, Shouta-kun está esperando!_ 🍷
`
                const thumb = await getBuffer(videoInfo.thumbnail)
                global.play_pending = global.play_pending || {}
                global.play_pending[m.chat] = { url, title, thumb, sender: m.sender }

                await client.sendMessage(m.chat, { image: thumb, caption: caption }, { quoted: m })
                return
            }

            // 3. DESCARGA DIRECTA (#MP3 / #MP4)
            const isAudio = ['mp3', 'playaudio', 'ytmp3'].includes(command)
            await processDownload(client, m, url, isAudio, title, videoInfo.thumbnail)

        } catch (error) {
            m.reply(`❌ Ay... Algo se rompió: ${error.message}`)
        }
    },

    // --- RESPUESTA DEL MENÚ ---
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
        const type = isAudio ? 'audio' : 'video'
        
        // MOTOR 1: SAVETUBE
        let result = await savetubeScraper(url, type)
        // MOTOR 2: OGMP3
        if (!result) result = await ogmp3.download(url, type)

        if (!result || !result.dl) return m.reply('❌ No pude descargarlo, cariño. Parece que los servidores están rebeldes hoy.')

        const finalTitle = result.title || title
        const fileName = `${sanitizeFileName(finalTitle)}.${isAudio ? 'mp3' : 'mp4'}`
        const thumbBuffer = typeof thumb === 'string' ? await getBuffer(thumb) : thumb

        if (isAudio) {
            await client.sendMessage(m.chat, {
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
            }, { quoted: m })
        } else {
            await client.sendMessage(m.chat, {
                video: { url: result.dl },
                fileName: fileName,
                mimetype: 'video/mp4',
                caption: `🎬 *${finalTitle}*\n_Aquí tienes, disfruta~_ 💋`,
                jpegThumbnail: thumbBuffer
            }, { quoted: m })
        }
    } catch (e) {
        m.reply(`❌ Ups, falló algo: ${e.message}`)
    }
}
