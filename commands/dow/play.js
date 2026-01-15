import yts from 'yt-search'
import axios from 'axios'
import dns from 'dns'

// 🛑 PARCHE DE RED: Forzar IPv4 (Vital para tu VPS)
try {
    if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

// --- CONFIGURACIÓN ---
const LIMIT_MB = 200
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// --- UTILIDADES ---
const isYTUrl = (url) => /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/).+$/i.test(url);

async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' })
        return res.data
    } catch { return null }
}

// --- LÓGICA DE TU AMIGO: FETCH CON FALLBACK ---
const fetchWithFallback = async (url, apis) => {
    let lastError = null;
    for (const api of apis) {
        try {
            console.log(`🔄 Probando API: ${api.name}...`)
            const { data } = await axios.get(api.url(url), {
                headers: { 'User-Agent': USER_AGENT },
                timeout: 15000 // 15s timeout
            })
            
            if (api.validate(data)) {
                return api.parse(data);
            }
            console.log(`⚠️ Falló validación ${api.name}`);
        } catch (e) {
            lastError = e;
            console.log(`❌ Error en ${api.name}: ${e.message}`);
        }
    }
    throw new Error('Todas las APIs fallaron. Intenta más tarde.');
};

export default {
    command: ['play', 'mp3', 'playaudio', 'ytmp3', 'play2', 'mp4', 'playvideo', 'ytmp4'],
    category: 'downloader',
    
    run: async ({ client, m, args, command, text }) => {
        try {
            if (!text.trim()) return m.reply('✎ Ingresa el nombre o URL.');

            let url, title, videoInfo;
            const esURL = isYTUrl(text);

            // 1. BUSCAR VIDEO
            if (!esURL) {
                const search = await yts(text);
                if (!search.all.length) return m.reply('✎ No encontrado.');
                videoInfo = search.all[0];
                ({ title, url } = videoInfo);
                
                const infoMessage = `
*𖹭.╭╭ִ╼ׅ࣪ﮩ٨ـﮩ𝗒𝗈𝗎𝗍𝗎𝗏𝖾-𝗉꯭𝗅꯭𝖺꯭𝗒ﮩ٨ـﮩׅ╾࣪╮╮.𖹭*
> ♡ *Título:* ${title}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Duración:* ${videoInfo.timestamp}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Vistas:* ${videoInfo.views}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ♡ *Canal:* ${videoInfo.author.name}
*⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫۫ۜ*`;

                const thumb = await getBuffer(videoInfo.thumbnail);
                await client.sendMessage(m.chat, thumb ? { image: thumb, caption: infoMessage } : { text: infoMessage }, { quoted: m });
            } else {
                url = text;
                videoInfo = await yts({ videoId: url.split('v=')[1] || url.split('/').pop() });
                title = videoInfo.title || 'Lucoa Media';
            }

            // 2. DEFINIR SI ES AUDIO O VIDEO
            const isAudio = ['play', 'mp3', 'playaudio', 'ytmp3'].includes(command);

            // 3. DEFINIR LAS APIS (Aquí arreglé las URLs que estaban rotas en tu código)
            const apis = [
                {
                    name: 'Ryzendesu (Principal)',
                    url: (u) => `https://api.ryzendesu.vip/api/downloader/${isAudio ? 'ytmp3' : 'ytmp4'}?url=${encodeURIComponent(u)}`,
                    validate: (json) => json.url,
                    parse: (json) => ({ dl: json.url, title: title })
                },
                {
                    name: 'Nekolabs',
                    url: (u) => `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(u)}&format=${isAudio ? 'mp3' : '720'}`,
                    validate: (json) => json.success && json.result?.downloadUrl,
                    parse: (json) => ({ dl: json.result.downloadUrl, title: json.result.title })
                },
                {
                    name: 'Widipe',
                    url: (u) => `https://widipe.com.pl/api/ytdl?url=${encodeURIComponent(u)}`,
                    validate: (json) => json.result && (isAudio ? json.result.mp3 : json.result.mp4),
                    parse: (json) => ({ dl: isAudio ? json.result.mp3 : json.result.mp4, title: title })
                }
            ];

            // 4. OBTENER LINK
            const { dl, title: apiTitle } = await fetchWithFallback(url, apis);
            
            if (!dl) return m.reply('❌ No se encontró enlace de descarga.');

            // 5. ENVIAR ARCHIVO
            if (isAudio) {
                await client.sendMessage(m.chat, {
                    document: { url: dl },
                    mimetype: 'audio/mpeg',
                    fileName: `${apiTitle || title}.mp3`
                }, { quoted: m });
            } else {
                await client.sendMessage(m.chat, {
                    video: { url: dl },
                    fileName: `${apiTitle || title}.mp4`,
                    mimetype: 'video/mp4',
                    caption: `🎬 ${apiTitle || title}`
                }, { quoted: m });
            }

        } catch (error) {
            console.error(error);
            m.reply(`❌ Error: ${error.message}`);
        }
    }
}
