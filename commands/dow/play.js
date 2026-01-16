import yts from 'yt-search'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import axios from 'axios'

// --- UTILIDADES ---
async function getBuffer(url) {
    try {
        if (!url || typeof url !== 'string') return null
        const res = await axios.get(url, { responseType: 'arraybuffer' })
        // Verificamos que sea un Buffer real y tenga tamaño
        if (Buffer.isBuffer(res.data) && res.data.length > 0) return res.data
        return null
    } catch { return null }
}

const sanitizeFileName = (s) => String(s).replace(/[^a-zA-Z0-9]/g, '_')

// --- LIMPIEZA AUTOMÁTICA ---
const tmpDir = path.join(process.cwd(), 'tmp')
if (fs.existsSync(tmpDir)) {
    fs.readdir(tmpDir, (err, files) => {
        if (err) return;
        for (const file of files) {
            fs.unlink(path.join(tmpDir, file), () => {});
        }
    });
}

// --- MOTOR INTERNO (MODO CREATOR / STUDIO) ---
function downloadWithYtDlp(url, isAudio) {
    return new Promise((resolve, reject) => {
        const tempId = Date.now()
        const outputTemplate = path.join(process.cwd(), 'tmp', `${tempId}.%(ext)s`)
        
        // Usamos 'android_creator' para evitar bloqueos y pedimos formatos flexibles
        const baseFlags = '--no-check-certificate --force-ipv4 --extractor-args "youtube:player_client=android_creator"'
        
        let command = ''
        if (isAudio) {
            command = `yt-dlp ${baseFlags} -x --audio-format mp3 -o "${outputTemplate}" "${url}"`
        } else {
            // Descarga lo mejor disponible y fusiona a MP4
            command = `yt-dlp ${baseFlags} -f "bestvideo+bestaudio/best" --merge-output-format mp4 -o "${outputTemplate}" "${url}"`
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error yt-dlp: ${stderr}`)
                if (stderr.includes('No space left')) return reject(new Error('Disco lleno'))
                if (stderr.includes('Sign in') || stderr.includes('403')) return reject(new Error('YouTube bloqueó la IP (Intenta más tarde)'))
                reject(new Error('Fallo al descargar'))
                return
            }
            
            const expectedFile = path.join(process.cwd(), 'tmp', `${tempId}.${isAudio ? 'mp3' : 'mp4'}`)
            
            setTimeout(() => {
                if (fs.existsSync(expectedFile)) {
                    const stats = fs.statSync(expectedFile)
                    if (stats.size > 0) {
                        resolve(expectedFile)
                    } else {
                        reject(new Error('Archivo vacío (Bloqueo GVS).'))
                    }
                } else {
                    reject(new Error('El archivo no se generó.'))
                }
            }, 1000)
        })
    })
}

// ==========================================
// 🚀 COMANDO LUCOA PLAY (ANTI-CRASH)
// ==========================================
export default {
    command: ['play', 'mp3', 'mp4', 'ytmp3', 'ytmp4', 'playvideo', 'playaudio'],
    category: 'downloader',
    
    run: async ({ client, m, args, command, text }) => {
        try {
            if (!text.trim()) return m.reply('Ara ara~ ¿Qué quieres escuchar? Escribe el nombre.')

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
                    if (!search.all.length) return m.reply('Vaya... No encontré nada. ✨')
                    videoInfo = search.all[0]
                    url = videoInfo.url
                    title = videoInfo.title
                }
            } catch (e) { return m.reply('Error buscando... 😿') }

            // 2. MENÚ
            if (!isAutoMode) {
                const caption = `
╭━─━─━─≪ 🐉 ≫─━─━─━╮
│ ❧ 𝐓𝐢́𝐭𝐮𝐥𝐨: ${title}
│ ❧ 𝐃𝐮𝐫𝐚𝐜𝐢𝐨́𝐧: ${videoInfo.timestamp}
│ ❧ 𝐂𝐚𝐧𝐚𝐥: ${videoInfo.author.name}
╰━─━─━─≪ 🥥 ≫─━─━─━╯

*Ara ara~ ¿Cómo lo quieres, tesoro? 💕*
_Responde con:_

🎵 *1* (Audio)
🎬 *2* (Video)
📂 *3* (Documento MP3)
`
                let thumb = await getBuffer(videoInfo.thumbnail)
                // Si la miniatura falla, usamos una genérica segura
                if (!Buffer.isBuffer(thumb)) thumb = await getBuffer('https://i.imgur.com/4L7dK0O.png') 

                global.play_pending = global.play_pending || {}
                global.play_pending[m.chat] = { url, title, thumb, sender: m.sender }

                await client.sendMessage(m.chat, { image: thumb || { url: videoInfo.thumbnail }, caption: caption }, { quoted: m })
                return
            }

            // 3. DESCARGA DIRECTA
            const type = ['mp3', 'playaudio', 'ytmp3'].includes(command) ? 'audio' : 'video'
            await processDownload(client, m, url, type, title, videoInfo.thumbnail)

        } catch (error) {
            m.reply(`❌ ${error.message}`)
        }
    },

    before: async (m, { client }) => {
        const text = m.text?.toLowerCase().trim()
        if (!['1', '2', '3', 'audio', 'video', 'doc'].includes(text)) return false

        const pending = global.play_pending?.[m.chat]
        if (!pending || pending.sender !== m.sender) return false

        delete global.play_pending[m.chat]
        
        let type = 'audio'
        if (text === '1' || text === 'audio') type = 'audio'
        if (text === '2' || text === 'video') type = 'video'
        if (text === '3' || text === 'doc') type = 'document'

        await processDownload(client, m, pending.url, type, pending.title, pending.thumb)
        return true
    }
}

// 🛡️ FUNCIÓN BLINDADA CONTRA CRASHES
async function processDownload(client, m, url, type, title, thumb) {
    const isAudioDownload = type === 'audio' || type === 'document'
    await m.reply(isAudioDownload ? '🎧 _Procesando audio..._' : '🎬 _Procesando video..._')
    
    try {
        const filePath = await downloadWithYtDlp(url, isAudioDownload)
        
        // 1. Limpiamos el título para que sea un string seguro
        const safeTitle = String(title || 'Lucoa Media').trim()
        const fileName = `${sanitizeFileName(safeTitle)}.${isAudioDownload ? 'mp3' : 'mp4'}`
        
        // 2. Procesamos la miniatura con seguridad EXTREMA
        let thumbBuffer = null
        try {
            if (Buffer.isBuffer(thumb)) {
                thumbBuffer = thumb
            } else if (typeof thumb === 'string') {
                thumbBuffer = await getBuffer(thumb)
            }
            // Si después de todo NO es un buffer, lo matamos
            if (!Buffer.isBuffer(thumbBuffer)) thumbBuffer = null
        } catch { thumbBuffer = null }

        const fileBuffer = fs.readFileSync(filePath)

        // 3. INTENTO DE ENVÍO
        try {
            if (type === 'audio') {
                await client.sendMessage(m.chat, {
                    audio: fileBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: fileName,
                    contextInfo: {
                        externalAdReply: {
                            title: safeTitle,
                            body: "Lucoa Player",
                            thumbnail: thumbBuffer, // Puede ser null, Baileys lo ignora si es null
                            sourceUrl: url,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m })
            } else if (type === 'video') {
                await client.sendMessage(m.chat, {
                    video: fileBuffer,
                    fileName: fileName,
                    mimetype: 'video/mp4',
                    caption: `🎬 *${safeTitle}*`,
                    ...(thumbBuffer ? { jpegThumbnail: thumbBuffer } : {}) // Solo se agrega si existe
                }, { quoted: m })
            } else if (type === 'document') {
                await client.sendMessage(m.chat, {
                    document: fileBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: fileName,
                    caption: `📂 *${safeTitle}*`,
                    ...(thumbBuffer ? { jpegThumbnail: thumbBuffer } : {})
                }, { quoted: m })
            }
        } catch (sendError) {
            console.log('⚠️ Error enviando con miniatura, reintentando sin ella...')
            // 4. PLAN B: Si falla por la miniatura, enviamos el archivo PELADO
            if (type === 'audio') {
                 await client.sendMessage(m.chat, { audio: fileBuffer, mimetype: 'audio/mpeg', fileName: fileName }, { quoted: m })
            } else if (type === 'video') {
                 await client.sendMessage(m.chat, { video: fileBuffer, mimetype: 'video/mp4', caption: safeTitle }, { quoted: m })
            } else {
                 await client.sendMessage(m.chat, { document: fileBuffer, mimetype: 'audio/mpeg', fileName: fileName }, { quoted: m })
            }
        }

        fs.unlinkSync(filePath)

    } catch (e) {
        console.error(e)
        m.reply(`❌ ${e.message}`)
    }
}
