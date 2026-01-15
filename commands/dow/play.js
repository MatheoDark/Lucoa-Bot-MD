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

// --- FUNCIÓN QUE EJECUTA YT-DLP EN TU VPS ---
function downloadWithYtDlp(url, isAudio) {
    return new Promise((resolve, reject) => {
        const tempId = Date.now()
        // Guardamos en la carpeta tmp del bot
        const outputTemplate = path.join(process.cwd(), 'tmp', `${tempId}.%(ext)s`)
        
        // Comandos mágicos para Linux
        let command = ''
        if (isAudio) {
            // Descarga audio, convierte a mp3
            command = `yt-dlp -x --audio-format mp3 -o "${outputTemplate}" "${url}"`
        } else {
            // Descarga video mp4 (calidad compatible con WhatsApp)
            command = `yt-dlp -f "best[ext=mp4][height<=720]" -o "${outputTemplate}" "${url}"`
        }

        console.log(`💻 Ejecutando comando local: ${command}`)

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error yt-dlp: ${stderr}`)
                reject(error)
                return
            }
            
            // Buscamos el archivo generado
            const expectedFile = path.join(process.cwd(), 'tmp', `${tempId}.${isAudio ? 'mp3' : 'mp4'}`)
            
            // A veces yt-dlp tarda en cerrar el archivo, esperamos 1s
            setTimeout(() => {
                if (fs.existsSync(expectedFile)) {
                    resolve(expectedFile)
                } else {
                    reject(new Error('El archivo no se generó correctamente.'))
                }
            }, 1000)
        })
    })
}

// ==========================================
// 🚀 COMANDO PLAY (MODO NATIVO)
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

            // 2. SI ES SOLO "PLAY", MUESTRA EL MENÚ
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

_Usando motor interno del VPS..._ 🖥️
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
            m.reply(`❌ ${error.message}`)
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

// --- FUNCIÓN DE PROCESAMIENTO ---
async function processDownload(client, m, url, isAudio, title, thumb) {
    await m.reply(isAudio ? '🎧 _Procesando audio localmente..._' : '🎬 _Procesando video localmente..._')
    
    try {
        // LLAMADA AL MOTOR LOCAL
        const filePath = await downloadWithYtDlp(url, isAudio)
        
        const thumbBuffer = typeof thumb === 'string' ? await getBuffer(thumb) : thumb
        const fileName = `${sanitizeFileName(title)}.${isAudio ? 'mp3' : 'mp4'}`

        // LECTURA DEL ARCHIVO LOCAL
        const fileBuffer = fs.readFileSync(filePath)

        if (isAudio) {
            await client.sendMessage(m.chat, {
                document: fileBuffer,
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
        } else {
            await client.sendMessage(m.chat, {
                video: fileBuffer,
                fileName: fileName,
                mimetype: 'video/mp4',
                caption: `🎬 *${title}*`,
                jpegThumbnail: thumbBuffer 
            }, { quoted: m })
        }

        // 🗑️ LIMPIEZA: Borrar archivo del disco para no llenar el VPS
        fs.unlinkSync(filePath)

    } catch (e) {
        console.error(e)
        m.reply(`❌ Fallo en el motor interno: ${e.message}`)
    }
}
