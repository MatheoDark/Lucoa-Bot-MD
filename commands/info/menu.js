import { commands as staticCommands } from '../../lib/commands.js'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

// --- FUNCIÓN FFmpeg MEJORADA (COMPATIBILIDAD TOTAL MÓVIL) ---
async function optimizeVideo(buffer, extension) {
    try {
        if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')
        
        const filename = Math.floor(Math.random() * 10000)
        const inputPath = `./tmp/${filename}.${extension}`
        const outputPath = `./tmp/${filename}_opt.mp4`

        await fs.promises.writeFile(inputPath, buffer)

        // COMANDO MAESTRO PARA MÓVIL:
        // -profile:v baseline -level 3.0: Hace que funcione en cualquier Android/iPhone.
        // -crf 28: Baja un poco el peso sin perder calidad visible.
        // -an: (Opcional) Quita el audio para ahorrar peso y evitar errores de codec de audio.
        await execPromise(`ffmpeg -y -i "${inputPath}" -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -crf 28 -preset veryfast -movflags +faststart "${outputPath}"`)

        const resultBuffer = await fs.promises.readFile(outputPath)

        // Limpiar
        await fs.promises.unlink(inputPath)
        await fs.promises.unlink(outputPath)

        return resultBuffer
    } catch (e) {
        console.error('Error FFmpeg Menú:', e)
        return buffer // Si falla, devuelve el original
    }
}

export default {
    command: ['menu', 'help', 'menú'],
    category: 'info',
    run: async ({ client, m, usedPrefix }) => {
        try {
            const botname = 'Lucoa-Bot-MD'
            const cleanPrefix = (usedPrefix || '#').trim()
            
            // 1. MAPA DE CATEGORÍAS
            const catMap = {
                'downloader': 'Descargas', 'download': 'Descargas',
                'economia': 'Economía', 'economy': 'Economía', 'rpg': 'Economía',
                'game': 'Juegos', 'fun': 'Juegos',
                'sockets': 'Sub-Bots', 'socket': 'Sub-Bots',
                'grupo': 'Grupos', 'group': 'Grupos',
                'ia': 'IA', 'ai': 'IA',
                'nsfw': 'NSFW (+18)',
                'utils': 'Utilidades',
                'info': 'Información',
                'search': 'Búsquedas',
                'anime': 'Anime',
                'profile': 'Perfil'
            }

            // 2. CARGADOR DE COMANDOS
            let fileCommands = []
            Object.values(global.plugins).forEach(p => {
                const c = p.default
                if (!c || !c.command) return
                const category = catMap[(c.category || 'otros').toLowerCase()] || 'Otros'
                if (Array.isArray(c.command)) {
                    c.command.forEach(cmd => fileCommands.push({ name: cmd, category }))
                } else {
                    fileCommands.push({ name: c.command, category })
                }
            })

            const extraCommands = (staticCommands || []).map(c => ({
                name: c.name || c.command,
                category: catMap[(c.category || 'otros').toLowerCase()] || 'Otros'
            }))
            
            const allCommands = [...fileCommands, ...extraCommands]
            const categories = {}
            allCommands.forEach(cmd => {
                const cat = cmd.category
                if (!categories[cat]) categories[cat] = []
                if (!categories[cat].some(ex => ex.name === cmd.name)) categories[cat].push(cmd)
            })

            // 3. TEXTO
            let menuText = `╭━ꕥ *${botname}* ꕥ━\n`
            menuText += `┃ 👤 *User:* ${m.pushName || 'Usuario'}\n`
            menuText += `┃ 📚 *Total:* ${allCommands.length}\n`
            menuText += `╰━━━━━━━━━━━━━━╯\n\n`

            Object.keys(categories).sort().forEach(cat => {
                menuText += `╭─✦ *${cat}* ✦\n`
                categories[cat].sort((a, b) => a.name.localeCompare(b.name)).forEach(cmd => {
                    menuText += `│ ❧ ${cleanPrefix}${cmd.name}\n`
                })
                menuText += `╰─────────────⬫\n\n`
            })
            menuText += `> 🐲 Powered by MatheoDark`

            // 4. LÓGICA DE VIDEO (Optimizada para Móvil)
            const MEDIA_DIR = path.join(process.cwd(), 'media')
            let buffer = null
            let isVideo = false

            if (fs.existsSync(MEDIA_DIR)) {
                try {
                    const files = fs.readdirSync(MEDIA_DIR)
                    const videos = files.filter(f => /\.(mp4|gif)$/i.test(f)) 
                    const images = files.filter(f => /\.(jpg|png|jpeg)$/i.test(f))

                    if (videos.length > 0) {
                        const randomVideo = videos[Math.floor(Math.random() * videos.length)]
                        const filePath = path.join(MEDIA_DIR, randomVideo)
                        buffer = fs.readFileSync(filePath)
                        
                        // Detectar extensión
                        const ext = randomVideo.split('.').pop().toLowerCase()
                        
                        // SI ES GIF O MP4 -> OPTIMIZAR SIEMPRE
                        // Esto arregla los videos que "se ven en pc pero no en cel"
                        // El proceso es rápido gracias a '-preset veryfast'
                        buffer = await optimizeVideo(buffer, ext)
                        
                        isVideo = true
                    } else if (images.length > 0) {
                        const randomImage = images[Math.floor(Math.random() * images.length)]
                        buffer = fs.readFileSync(path.join(MEDIA_DIR, randomImage))
                        isVideo = false
                    }
                } catch (e) { console.error('Error media:', e) }
            }

            // 5. ENVÍO
            if (buffer && isVideo) {
                await client.sendMessage(m.chat, { 
                    video: buffer, 
                    caption: menuText.trim(),
                    gifPlayback: true 
                }, { quoted: m })
            } else if (buffer && !isVideo) {
                await client.sendMessage(m.chat, { 
                    image: buffer, 
                    caption: menuText.trim() 
                }, { quoted: m })
            } else {
                await client.sendMessage(m.chat, { 
                    video: { url: 'https://i.imgur.com/OvoF1QZ.mp4' }, 
                    caption: menuText.trim(),
                    gifPlayback: true
                }, { quoted: m })
            }

        } catch (e) {
            console.error(e)
            m.reply('❌ Error: ' + e.message)
        }
    }
}
