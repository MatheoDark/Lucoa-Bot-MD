import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { exec } from 'child_process'
import { ytmp3, ytmp4, apimp3, apimp4, get_id } from '../../lib/ytscraper.js'
import { ogmp3 } from '../../lib/youtubedl.js'

const streamPipeline = promisify(pipeline)
const limit = 200 // Límite MB

// ==========================================
// 🧠 SISTEMA DE SALUD DE APIs
// ==========================================
const apiHealth = {}
const COOLDOWN_MS = 10 * 60 * 1000 // 10 min de cooldown si falla

function markApiFailed(name) {
    if (!apiHealth[name]) apiHealth[name] = { fails: 0 }
    apiHealth[name].fails++
    apiHealth[name].lastFail = Date.now()
    // Cooldown escala: 10min, 20min, 30min... (máx 1h)
    apiHealth[name].cooldownUntil = Date.now() + Math.min(apiHealth[name].fails * COOLDOWN_MS, 60 * 60 * 1000)
    console.log(`[HEALTH] ❌ ${name} falló (${apiHealth[name].fails}x). Cooldown hasta ${new Date(apiHealth[name].cooldownUntil).toLocaleTimeString()}`)
}

function markApiOk(name) {
    delete apiHealth[name]
}

function isApiAvailable(name) {
    const h = apiHealth[name]
    if (!h || !h.cooldownUntil) return true
    if (Date.now() > h.cooldownUntil) return true // cooldown expiró
    return false
}

function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: timeout (${ms}ms)`)), ms))
    ])
}

// ==========================================
// 🛠️ UTILIDADES
// ==========================================
async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' })
        return res.data
    } catch { return null }
}

const sanitizeFileName = (s) => String(s).replace(/[^a-zA-Z0-9]/g, '_')

function downloadWithCurl(url, filePath, source) {
    return new Promise((resolve, reject) => {
        const headers = [
            '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '-H', 'Accept: */*',
            '-H', 'Accept-Language: en-US,en;q=0.9',
            '-H', 'Sec-Fetch-Dest: document',
            '-H', 'Sec-Fetch-Mode: navigate',
            '-H', 'Sec-Fetch-Site: cross-site',
        ]
        if (source === 'SaveTube' || url.includes('savetube')) {
            headers.push('-H', 'Referer: https://yt.savetube.me/')
            headers.push('-H', 'Origin: https://yt.savetube.me')
        }
        const args = ['-L', '-s', '-f', '-o', filePath, ...headers, url]
        const child = exec(`curl ${args.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(' ')}`, { timeout: 120000 }, (error) => {
            if (error || !fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
                try { fs.unlinkSync(filePath) } catch {}
                reject(new Error(`curl falló: ${error?.message || 'archivo vacío'}`))
            } else {
                resolve(filePath)
            }
        })
    })
}

async function downloadToLocal(url, ext, source) {
    console.log(`[INFO] ⬇️ Descargando archivo: ${ext}`)
    const tmpDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
    const filePath = path.join(tmpDir, `${Date.now()}.${ext}`)
    
    // Intentar con curl primero (mejor TLS fingerprint, evita bloqueos anti-bot)
    try {
        return await downloadWithCurl(url, filePath, source)
    } catch (curlErr) {
        console.log(`[WARN] curl falló, intentando con axios: ${curlErr.message}`)
    }

    // Fallback a axios
    try {
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        if (source === 'SaveTube' || url.includes('savetube')) {
            headers['Referer'] = 'https://yt.savetube.me/'
        }
        const response = await axios({
            url, method: 'GET', responseType: 'stream',
            headers
        })
        await streamPipeline(response.data, fs.createWriteStream(filePath))
        return filePath
    } catch (e) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
        throw e
    }
}

function fixVideoWithFFmpeg(inputPath) {
    return new Promise((resolve) => {
        if (!fs.existsSync(inputPath)) {
            console.log('⚠️ Archivo de entrada no existe, saltando FFmpeg.')
            return resolve(inputPath)
        }
        console.log(`[INFO] 🛠️ Convirtiendo para WhatsApp Móvil (Ultrafast)...`)
        const parsed = path.parse(inputPath)
        const outputPath = path.join(parsed.dir, `${parsed.name}_fixed.mp4`)
        const cmd = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset ultrafast -crf 28 -pix_fmt yuv420p -c:a aac -b:a 128k -ar 44100 -ac 2 -movflags +faststart -max_muxing_queue_size 1024 "${outputPath}"`
        
        exec(cmd, { timeout: 180000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) console.log(`[WARN] FFmpeg error: ${error.message}`)
            if (stderr) {
                const lastLines = stderr.split('\n').filter(l => l.trim()).slice(-3).join(' | ')
                console.log(`[FFmpeg] ${lastLines}`)
            }
            if (!error && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
                try { fs.unlinkSync(inputPath) } catch {}
                resolve(outputPath)
            } else {
                console.log('⚠️ FFmpeg falló, enviando original.')
                try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath) } catch {}
                resolve(inputPath)
            }
        })
    })
}

// ==========================================
// 🔄 YT-DLP LOCAL (fallback confiable)
// ==========================================
function ytDlpDownload(url, isAudio) {
    return new Promise((resolve, reject) => {
        const tmpDir = path.join(process.cwd(), 'tmp')
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
        const outputFile = path.join(tmpDir, `${Date.now()}_ytdlp`)

        // Obtener título primero (rápido, separado de la descarga)
        exec(`yt-dlp --get-title --no-warnings "${url}"`, { timeout: 15000 }, (titleErr, titleOut) => {
            const title = titleOut?.trim() || 'Sin título'

            let cmd
            if (isAudio) {
                cmd = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputFile}.%(ext)s" --no-playlist --no-warnings "${url}"`
            } else {
                // Preferir h264+aac (compatible con WhatsApp móvil), con fallback amplio
                cmd = `yt-dlp -S "vcodec:h264,acodec:aac" -f "bv*[height<=720]+ba/b[height<=720]/best" --merge-output-format mp4 --recode-video mp4 -o "${outputFile}.%(ext)s" --no-playlist --no-warnings "${url}"`
            }

            console.log(`[INFO] yt-dlp descargando: ${title}`)
            exec(cmd, { timeout: 180000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) {
                    const errMsg = stderr?.split('\n').filter(l => l.includes('ERROR')).join(' | ') || error.message
                    return reject(new Error(`yt-dlp: ${errMsg}`))
                }
                if (stderr) {
                    const warnings = stderr.split('\n').filter(l => l.includes('WARNING')).slice(0, 2).join(' | ')
                    if (warnings) console.log(`[yt-dlp] ${warnings}`)
                }

                // Buscar el archivo descargado
                const prefix = path.basename(outputFile)
                const files = fs.readdirSync(tmpDir)
                    .filter(f => f.startsWith(prefix) && !f.endsWith('.part') && !f.endsWith('.temp'))
                    .filter(f => {
                        try { return fs.statSync(path.join(tmpDir, f)).size > 0 } catch { return false }
                    })
                if (files.length === 0) {
                    console.log(`[WARN] yt-dlp: No se encontró archivo. Archivos en tmp: ${fs.readdirSync(tmpDir).filter(f => f.includes('ytdlp')).join(', ')}`)
                    return reject(new Error('yt-dlp: No se generó archivo'))
                }

                const ext = isAudio ? 'mp3' : 'mp4'
                const expectedName = `${prefix}.${ext}`
                const finalName = files.find(f => f === expectedName) || files.find(f => !f.includes('.f')) || files[0]
                const finalFile = path.join(tmpDir, finalName)
                resolve({ localPath: finalFile, title, source: 'yt-dlp' })
            })
        })
    })
}

// ==========================================
// 🔄 DESCARGA CON MÚLTIPLES FALLBACKS
// ==========================================
async function downloadWithFallbacks(url, isAudio) {
    const errors = []
    const ext = isAudio ? 'mp3' : 'mp4'

    const providers = [
        {
            name: 'yt-dlp',
            timeout: 180000,
            noCooldown: true, // yt-dlp puede fallar en un video pero funcionar en otro
            fn: async () => {
                const result = await ytDlpDownload(url, isAudio)
                if (!result.localPath) throw new Error('No se generó archivo')
                return result
            }
        },
        {
            name: 'SaveTube',
            timeout: 60000,
            fn: async () => {
                const res = isAudio ? await ytmp3(url) : await ytmp4(url)
                if (!res.status || !res.download?.status || !res.download?.url) throw new Error('respuesta sin URL')
                const localPath = await downloadToLocal(res.download.url, ext, 'SaveTube')
                return { localPath, title: res.metadata?.title, source: 'SaveTube' }
            }
        },
        {
            name: 'Vreden',
            timeout: 15000,
            fn: async () => {
                const res = isAudio ? await apimp3(url) : await apimp4(url)
                if (!res?.status || !res?.download?.url) throw new Error('respuesta sin URL')
                const localPath = await downloadToLocal(res.download.url, ext, 'Vreden')
                return { localPath, title: res.metadata?.title, source: 'Vreden' }
            }
        },
        {
            name: 'ogmp3',
            timeout: 30000,
            fn: async () => {
                const format = isAudio ? '320' : '720'
                const type = isAudio ? 'audio' : 'video'
                const res = await ogmp3.download(url, format, type)
                if (!res.status || !res.result?.download) throw new Error('respuesta sin URL')
                const localPath = await downloadToLocal(res.result.download, ext, 'ogmp3')
                return { localPath, title: res.result.title, source: 'ogmp3' }
            }
        }
    ]

    for (const provider of providers) {
        if (!isApiAvailable(provider.name)) {
            console.log(`[INFO] ⏭️ ${provider.name} en cooldown, saltando...`)
            errors.push(`${provider.name}: en cooldown`)
            continue
        }
        try {
            console.log(`[INFO] 🔄 Intentando ${provider.name}...`)
            const result = await withTimeout(provider.fn(), provider.timeout, provider.name)
            console.log(`[INFO] ✅ ${provider.name} OK`)
            markApiOk(provider.name)
            return result
        } catch (e) {
            const msg = e.message || 'error desconocido'
            console.log(`[WARN] ${provider.name} falló: ${msg}`)
            if (!provider.noCooldown) markApiFailed(provider.name)
            errors.push(`${provider.name}: ${msg}`)
        }
    }

    console.error('[ERROR] Todos los proveedores fallaron:', errors)
    throw new Error('Todos los proveedores fallaron. Intenta de nuevo más tarde.')
}

// ==========================================
// 🚀 COMANDO PRINCIPAL
// ==========================================
export default {
    command: ['play', 'mp3', 'playaudio', 'ytmp3', 'play2', 'mp4', 'playvideo', 'ytmp4'],
    category: 'downloader',

    run: async ({ client, m, args, command, text }) => {
        const chatId = m.chat
        
        // --- MENÚ RESPUESTA ---
        if (global.play_pending?.[chatId] && /^[1-3]$/.test(text.trim())) {
            const pending = global.play_pending[chatId]
            if (pending.sender !== m.sender) return 
            
            const selection = text.trim()
            let type = 'audio'
            if (selection === '2') type = 'video'
            if (selection === '3') type = 'document'
            
            delete global.play_pending[chatId]
            return await executeDownload(client, m, pending.url, type, pending.title, pending.thumb)
        }

        if (!text.trim()) return m.reply('🐲 *Uso:* #play Link o Nombre')

        let url, title, videoInfo
        
        // --- BÚSQUEDA ---
        console.log(`[INFO] 🔎 Buscando: ${text}`)
        if (/https?:\/\//.test(text)) {
            url = text
            try {
                const id = get_id(text)
                if (id) {
                    videoInfo = await yts({ videoId: id })
                } else {
                    return m.reply('❌ Link inválido.')
                }
            } catch { return m.reply('❌ Link inválido.') }
        } else {
            const search = await yts(text)
            if (!search.all.length) return m.reply('✎ No encontré nada.')
            videoInfo = search.all[0]
        }
        
        url = videoInfo.url
        title = videoInfo.title

        // --- DIRECTO ---
        if (['mp3', 'ytmp3', 'playaudio'].includes(command)) {
            return await executeDownload(client, m, url, 'audio', title, videoInfo.thumbnail)
        }
        if (['mp4', 'ytmp4', 'playvideo'].includes(command)) {
            return await executeDownload(client, m, url, 'video', title, videoInfo.thumbnail)
        }

        // --- MENÚ ---
        const caption = `╭━━━〔 🐲 𝗟𝗨𝗖𝗢𝗔 • Play 〕━━━⬣
┃ 🥥 *Título:* ${title}
┃ ⏱️ *Duración:* ${videoInfo.timestamp}
┃ 👤 *Canal:* ${videoInfo.author.name}
╰━━━━━━━━━━━━━━━━━━━━⬣

Responde con el número:
🎵 *1* Audio (MP3)
🎬 *2* Video (MP4)
📂 *3* Documento`

        let thumb = await getBuffer(videoInfo.thumbnail)
        const msg = await client.sendMessage(chatId, { image: thumb || undefined, caption }, { quoted: m })

        global.play_pending = global.play_pending || {}
        global.play_pending[chatId] = {
            url, title, thumb: videoInfo.thumbnail, sender: m.sender, key: msg.key
        }
    },

    before: async (m, { client }) => {
        if (!global.play_pending?.[m.chat]) return false
        if (m.key.fromMe) return false
        const text = m.text?.toLowerCase().trim()
        if (!['1', '2', '3'].includes(text)) return false
        const pending = global.play_pending[m.chat]
        if (pending.sender !== m.sender) return false
        delete global.play_pending[m.chat]
        
        let type = 'audio'
        if (text === '2') type = 'video'
        if (text === '3') type = 'document'
        
        await executeDownload(client, m, pending.url, type, pending.title, pending.thumb)
        return true
    }
}

// ⚙️ FUNCIÓN EJECUTORA
async function executeDownload(client, m, url, type, title, thumb) {
    const isAudio = type === 'audio' || type === 'document'
    await m.react(isAudio ? '🎧' : '🎬')

    try {
        const result = await downloadWithFallbacks(url, isAudio)
        if (!result.localPath) return m.reply('❌ No se pudo obtener el enlace de descarga.')

        const source = result.source
        title = result.title || title

        // Miniatura
        let thumbBuffer = null
        try {
            if (thumb) {
                const response = await fetch(thumb)
                const arrayBuffer = await response.arrayBuffer()
                thumbBuffer = await sharp(Buffer.from(arrayBuffer)).resize(320, 180).jpeg({ quality: 80 }).toBuffer()
            }
        } catch {}

        let localFilePath = result.localPath

        // Fix Video (codec compatible con WhatsApp móvil)
        if (!isAudio) {
            localFilePath = await fixVideoWithFFmpeg(localFilePath)
        }

        if (!fs.existsSync(localFilePath)) return m.reply('❌ El archivo descargado no se encontró.')
        const fileData = fs.readFileSync(localFilePath)
        const cleanTitle = sanitizeFileName(title)

        console.log(`[INFO] 📤 Enviando archivo... (${source})`)

        if (type === 'audio') {
            await client.sendMessage(m.chat, { 
                audio: fileData, mimetype: 'audio/mpeg', fileName: `${cleanTitle}.mp3`,
                contextInfo: { externalAdReply: { title: title, body: `Fuente: ${source}`, thumbnail: thumbBuffer, mediaType: 1, renderLargerThumbnail: true } }
            }, { quoted: m })

        } else if (type === 'video') {
            await client.sendMessage(m.chat, { 
                video: fileData, mimetype: 'video/mp4', fileName: `${cleanTitle}.mp4`, caption: `🎬 ${title}`,
                jpegThumbnail: thumbBuffer 
            }, { quoted: m })

        } else if (type === 'document') {
            await client.sendMessage(m.chat, { 
                document: fileData, mimetype: 'audio/mpeg', fileName: `${cleanTitle}.mp3`, caption: `📂 ${title}`,
                jpegThumbnail: thumbBuffer 
            }, { quoted: m })
        }

        try { fs.unlinkSync(localFilePath) } catch {}
        await m.react('✅')

    } catch (e) {
        console.error(e)
        m.reply(`❌ Error: ${e.message}`)
    }
}
