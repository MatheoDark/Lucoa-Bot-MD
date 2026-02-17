import yts from 'yt-search'
import fetch from 'node-fetch'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { exec } from 'child_process'

const streamPipeline = promisify(pipeline)
const limit = 200 // MB

// --- UTILIDADES ---
const sanitizeFileName = (s) => String(s).replace(/[^a-zA-Z0-9]/g, '_')

async function downloadToLocal(url, ext) {
    console.log(`[DEBUG] Iniciando descarga física de: ${url}`)
    const tmpDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
    const filePath = path.join(tmpDir, `${Date.now()}.${ext}`)
    
    try {
        const response = await axios({
            url, method: 'GET', responseType: 'stream',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        })
        await streamPipeline(response.data, fs.createWriteStream(filePath))
        console.log(`[DEBUG] Archivo guardado en: ${filePath}`)
        return filePath
    } catch (e) {
        console.log(`[DEBUG] Error en downloadToLocal: ${e.message}`)
        throw e
    }
}

function fixVideoWithFFmpeg(inputPath) {
    return new Promise((resolve) => {
        console.log(`[DEBUG] Iniciando reparación FFmpeg...`)
        const outputPath = inputPath.replace('.mp4', '_fixed.mp4')
        const cmd = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset ultrafast -c:a aac -movflags +faststart "${outputPath}"`
        
        exec(cmd, (error) => {
            if (error) {
                console.log(`[DEBUG] FFmpeg falló (posiblemente no instalado), usando original.`)
                resolve(inputPath)
            } else {
                console.log(`[DEBUG] FFmpeg terminó con éxito.`)
                try { fs.unlinkSync(inputPath) } catch {}
                resolve(outputPath)
            }
        })
    })
}

// --- COMANDO ---
export default {
    command: ['play', 'mp3', 'mp4', 'ytmp3', 'ytmp4', 'video', 'audio'],
    category: 'downloader',

    // 1. EL MANEJADOR PRINCIPAL
    run: async ({ client, m, args, command, text }) => {
        console.log(`[DEBUG] Comando ejecutado: ${command}`)
        const chatId = m.chat

        // Si es respuesta al menú (1, 2, 3)
        if (global.play_pending?.[chatId] && /^[1-3]$/.test(text.trim())) {
            console.log(`[DEBUG] Detectada respuesta al menú: ${text}`)
            const pending = global.play_pending[chatId]
            delete global.play_pending[chatId]
            
            let type = 'audio'
            if (text.trim() === '2') type = 'video'
            if (text.trim() === '3') type = 'document'
            
            return await executeDownload(client, m, pending.url, type, pending.title, pending.thumb)
        }

        if (!text.trim()) return m.reply('❌ Ingresa título o link.')

        try {
            await m.react('🔍')
            console.log(`[DEBUG] Buscando en YouTube: ${text}`)
            
            let videoInfo
            if (/https?:\/\//.test(text)) {
                const id = text.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1]
                videoInfo = await yts({ videoId: id })
            } else {
                const search = await yts(text)
                if (!search.all.length) return m.reply('❌ Nada encontrado.')
                videoInfo = search.all[0]
            }

            console.log(`[DEBUG] Video encontrado: ${videoInfo.title}`)

            // Si es comando directo
            if (['mp3', 'ytmp3', 'audio'].includes(command)) {
                return await executeDownload(client, m, videoInfo.url, 'audio', videoInfo.title, videoInfo.thumbnail)
            }
            if (['mp4', 'ytmp4', 'video'].includes(command)) {
                return await executeDownload(client, m, videoInfo.url, 'video', videoInfo.title, videoInfo.thumbnail)
            }

            // Enviar Menú
            const caption = `╭━━━〔 🐲 𝗟𝗨𝗖𝗢𝗔 • Play 〕━━━⬣
┃ 🥥 *Título:* ${videoInfo.title}
┃ ⏱️ *Duración:* ${videoInfo.timestamp}
╰━━━━━━━━━━━━━━━━━━━━⬣

Responde con:
🎵 *1* Audio
🎬 *2* Video
📂 *3* Documento`

            const msg = await client.sendMessage(chatId, { image: { url: videoInfo.thumbnail }, caption }, { quoted: m })
            
            global.play_pending = global.play_pending || {}
            global.play_pending[chatId] = {
                url: videoInfo.url,
                title: videoInfo.title,
                thumb: videoInfo.thumbnail,
                sender: m.sender,
                key: msg.key
            }
            console.log(`[DEBUG] Menú enviado, esperando respuesta...`)

        } catch (e) {
            console.log(`[DEBUG] Error en RUN: ${e.message}`)
            m.reply(`Error: ${e.message}`)
        }
    },

    // 2. EL CAPTURADOR DE RESPUESTAS (IMPORTANTE)
    before: async (m, { client }) => {
        if (!global.play_pending?.[m.chat]) return false
        if (m.key.fromMe) return false

        const text = m.text?.trim()
        if (!['1', '2', '3'].includes(text)) return false

        console.log(`[DEBUG] BEFORE detectó: ${text}`)
        const pending = global.play_pending[m.chat]
        delete global.play_pending[m.chat]

        let type = 'audio'
        if (text === '2') type = 'video'
        if (text === '3') type = 'document'

        await executeDownload(client, m, pending.url, type, pending.title, pending.thumb)
        return true
    }
}

// 3. FUNCIÓN DE DESCARGA (DONDE OCURRE LA MAGIA)
async function executeDownload(client, m, url, type, title, thumb) {
    console.log(`[DEBUG] executeDownload iniciado. Tipo: ${type}`)
    await m.react(type === 'audio' ? '🎧' : '🎬')

    try {
        // --- APIS ---
        console.log(`[DEBUG] Consultando APIs...`)
        
        // Delirius API
        try {
            const apiLink = `https://delirius-api-oficial.vercel.app/api/${type === 'audio' ? 'ytmp3' : 'ytmp4'}?url=${url}`
            console.log(`[DEBUG] Probando Delirius: ${apiLink}`)
            const { data } = await axios.get(apiLink)
            
            if (data.status && data.data?.download?.url) {
                console.log(`[DEBUG] API Delirius respondió OK.`)
                const dl = data.data.download.url
                
                // Descarga
                const filePath = await downloadToLocal(dl, type === 'audio' ? 'mp3' : 'mp4')
                let finalPath = filePath

                // Fix Video
                if (type === 'video') {
                    finalPath = await fixVideoWithFFmpeg(filePath)
                }

                // Enviar
                console.log(`[DEBUG] Enviando archivo...`)
                const cleanTitle = sanitizeFileName(title)
                
                if (type === 'audio') {
                    await client.sendMessage(m.chat, { 
                        audio: { url: finalPath }, mimetype: 'audio/mpeg', fileName: `${cleanTitle}.mp3` 
                    }, { quoted: m })
                } else if (type === 'video') {
                    await client.sendMessage(m.chat, { 
                        video: { url: finalPath }, mimetype: 'video/mp4', caption: title 
                    }, { quoted: m })
                }

                console.log(`[DEBUG] Enviado con éxito.`)
                try { fs.unlinkSync(finalPath) } catch {}
                await m.react('✅')
                return // Éxito, salimos
            }
        } catch (e) {
            console.log(`[DEBUG] Delirius falló: ${e.message}`)
        }

        throw new Error('No se pudo descargar el video con ninguna API.')

    } catch (e) {
        console.log(`[DEBUG] ERROR CRÍTICO: ${e.message}`)
        m.reply(`❌ Fallo: ${e.message}`)
    }
}
