import yts from 'yt-search'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import axios from 'axios'

// --- UTILIDADES ---
async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' })
        return res.data
    } catch { return null }
}

const sanitizeFileName = (s) => s.replace(/[^a-zA-Z0-9]/g, '_')

// --- MOTOR INTERNO (YT-DLP) ---
function downloadWithYtDlp(url, isAudio) {
    return new Promise((resolve, reject) => {
        const tempId = Date.now()
        const outputTemplate = path.join(process.cwd(), 'tmp', `${tempId}.%(ext)s`)
        
        let command = ''
        if (isAudio) {
            // Descarga audio y convierte a mp3
            command = `yt-dlp -x --audio-format mp3 -o "${outputTemplate}" "${url}"`
        } else {
            // Descarga video compatible con WhatsApp
            command = `yt-dlp -f "best[ext=mp4][height<=720]" -o "${outputTemplate}" "${url}"`
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error yt-dlp: ${stderr}`)
                reject(error)
                return
            }
            
            // Verificamos si existe el archivo
            const expectedFile = path.join(process.cwd(), 'tmp', `${tempId}.${isAudio ? 'mp3' : 'mp4'}`)
            
            setTimeout(() => {
                if (fs.existsSync(expectedFile)) {
                    resolve(expectedFile)
                } else {
                    reject(new Error('El archivo no se generó.'))
                }
            }, 1000)
        })
    })
}

// ==========================================
// 🚀 COMANDO LUCOA PLAY (3 OPCIONES)
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

            // 2. SI ES SOLO "PLAY", MUESTRA EL MENÚ CON 3 OPCIONES
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

_Usando motor interno..._ 🖥️
`
                const thumb = await getBuffer(videoInfo.thumbnail)
                global.play_pending = global.play_pending || {}
                global.play_pending[m.chat] = { url, title, thumb, sender: m.sender }

                await client.sendMessage(m.chat, { image: thumb, caption: caption }, { quoted: m })
                return
            }

            // 3. DESCARGA DIRECTA (Comandos rápidos)
            // Si usa #mp3 es tipo 1, si usa #mp4 es tipo 2
            const type = ['mp3', 'playaudio', 'ytmp3'].includes(command) ? 'audio' : 'video'
            await processDownload(client, m, url, type, title, videoInfo.thumbnail)

        } catch (error) {
            m.reply(`❌ ${error.message}`)
        }
    },

    // --- PARTE 2: RESPUESTA ---
    before: async (m, { client }) => {
        const text = m.text?.toLowerCase().trim()
        if (!['1', '2', '3', 'audio', 'video', 'doc'].includes(text)) return false

        const pending = global.play_pending?.[m.chat]
        if (!pending || pending.sender !== m.sender) return false

        delete global.play_pending[m.chat]
        
        // Mapear respuesta a tipo
        let type = 'audio'
        if (text === '1' || text === 'audio') type = 'audio'
        if (text === '2' || text === 'video') type = 'video'
        if (text === '3' || text === 'doc') type = 'document'

        await processDownload(client, m, pending.url, type, pending.title, pending.thumb)
        return true
    }
}

// --- FUNCIÓN DE PROCESAMIENTO (3 TIPOS) ---
async function processDownload(client, m, url, type, title, thumb) {
    const isAudioDownload = type === 'audio' || type === 'document'
    
    await m.reply(isAudioDownload ? '🎧 _Procesando audio localmente..._' : '🎬 _Procesando video localmente..._')
    
    try {
        // Descargamos (Si es 'document', descargamos como audio mp3)
        const filePath = await downloadWithYtDlp(url, isAudioDownload)
        
        const thumbBuffer = typeof thumb === 'string' ? await getBuffer(thumb) : thumb
        const fileName = `${sanitizeFileName(title)}.${isAudioDownload ? 'mp3' : 'mp4'}`
        const fileBuffer = fs.readFileSync(filePath)

        // OPCIÓN 1: AUDIO (Nota de voz/Audio reproducible)
        if (type === 'audio') {
            await client.sendMessage(m.chat, {
                audio: fileBuffer,
                mimetype: 'audio/mpeg',
                fileName: fileName,
                contextInfo: {
                    externalAdReply: {
                        title: title,
                        body: "🐉 Lucoa VPS Engine",
                        thumbnail: thumbBuffer,
                        sourceUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })
        } 
        // OPCIÓN 2: VIDEO
        else if (type === 'video') {
            await client.sendMessage(m.chat, {
                video: fileBuffer,
                fileName: fileName,
                mimetype: 'video/mp4',
                caption: `🎬 *${title}*`,
                jpegThumbnail: thumbBuffer 
            }, { quoted: m })
        } 
        // OPCIÓN 3: DOCUMENTO (Archivo MP3 puro)
        else if (type === 'document') {
            await client.sendMessage(m.chat, {
                document: fileBuffer,
                mimetype: 'audio/mpeg', // Mimetype de audio para que no se corrompa
                fileName: fileName,
                caption: `📂 *${title}*`,
                jpegThumbnail: thumbBuffer
            }, { quoted: m })
        }

        // Limpieza
        fs.unlinkSync(filePath)

    } catch (e) {
        console.error(e)
        m.reply(`❌ Fallo en el motor interno: ${e.message}`)
    }
}
