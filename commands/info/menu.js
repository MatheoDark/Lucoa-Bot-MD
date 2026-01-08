import { commands as staticCommands } from '../../lib/commands.js'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

// --- FUNCIÓN FFmpeg PARA VIDEO (Optimización Móvil) ---
async function optimizeVideo(buffer, extension) {
    try {
        if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')
        
        const filename = Math.floor(Math.random() * 10000)
        const inputPath = `./tmp/${filename}.${extension}`
        const outputPath = `./tmp/${filename}_opt.mp4`

        await fs.promises.writeFile(inputPath, buffer)
        // Convierte cualquier cosa a MP4 ligero compatible con WhatsApp
        await execPromise(`ffmpeg -y -i "${inputPath}" -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -crf 28 -preset veryfast -movflags +faststart "${outputPath}"`)

        const resultBuffer = await fs.promises.readFile(outputPath)
        await fs.promises.unlink(inputPath)
        await fs.promises.unlink(outputPath)

        return resultBuffer
    } catch (e) {
        return buffer // Si falla, devuelve el original
    }
}

export default {
    command: ['menu', 'help', 'menú', 'comandos'],
    category: 'info',
    run: async ({ client, m, usedPrefix }) => {
        try {
            const botname = '🐉 LUCOA-BOT-MD'
            const cleanPrefix = (usedPrefix || '#').trim()
            
            // 1. MAPA DE CATEGORÍAS (Para títulos bonitos)
            const catMap = {
                'info': 'ℹ️ Información',
                'anime': '🌸 Anime & Reacciones',
                'nsfw': '🔞 NSFW (+18)',
                'economia': '💰 Economía',
                'rpg': '⚔️ RPG & Juegos',
                'gacha': '🎲 Gacha & Waifus',
                'grupo': '👥 Grupos',
                'sockets': '🤖 Sub-Bots',
                'utils': '🛠️ Utilidades',
                'download': '📥 Descargas',
                'search': '🔎 Búsquedas',
                'ia': '🧠 Inteligencia Artificial',
                'profile': '👤 Perfil',
                'otros': '🌀 Otros'
            }

            // 2. UNIFICAR COMANDOS (Eliminar Duplicados)
            const uniqueCommands = new Map(); // Mapa para filtrar

            // A) Cargar desde Plugins (Archivos reales - Prioridad Alta)
            if (global.plugins) {
                Object.values(global.plugins).forEach(p => {
                    const c = p.default
                    if (!c || !c.command) return
                    
                    // Normalizar categoría
                    let cat = (c.category || 'otros').toLowerCase()
                    if (cat === 'game' || cat === 'fun') cat = 'rpg'
                    
                    if (Array.isArray(c.command)) {
                        c.command.forEach(cmd => {
                            uniqueCommands.set(cmd, { name: cmd, category: cat })
                        })
                    } else {
                        uniqueCommands.set(c.command, { name: c.command, category: cat })
                    }
                })
            }

            // B) Cargar desde Lista Estática (Relleno - Prioridad Baja)
            if (staticCommands) {
                staticCommands.forEach(c => {
                    // Solo agregamos si NO existe ya (para no duplicar)
                    if (!uniqueCommands.has(c.name)) {
                         uniqueCommands.set(c.name, { 
                             name: c.name, 
                             category: c.category.toLowerCase() 
                         })
                    }
                })
            }

            // 3. AGRUPAR POR CATEGORÍA
            const categories = {}
            
            uniqueCommands.forEach((cmd) => {
                const prettyCat = catMap[cmd.category] || '🌀 Otros'
                if (!categories[prettyCat]) categories[prettyCat] = []
                categories[prettyCat].push(cmd.name)
            })

            // 4. GENERAR TEXTO DEL MENÚ
            let menuText = `╭━ꕥ *${botname}* ꕥ━\n`
            menuText += `┃ 👤 *Usuario:* ${m.pushName || 'Desconocido'}\n`
            menuText += `┃ 🤖 *Bot:* Online\n`
            menuText += `┃ 📚 *Total Comandos:* ${uniqueCommands.size}\n`
            menuText += `╰━━━━━━━━━━━━━━╯\n\n`

            const sortedCats = Object.keys(categories).sort()

            sortedCats.forEach(cat => {
                menuText += `╭─✦ *${cat}* ✦\n`
                // Ordenar alfabéticamente los comandos dentro de la categoría
                const cmds = categories[cat].sort()
                
                cmds.forEach(name => {
                    menuText += `│ ❧ ${cleanPrefix}${name}\n`
                })
                menuText += `╰─────────────⬫\n\n`
            })
            
            menuText += `> 🐲 Powered by MatheoDark`

            // 5. GESTIÓN DE MULTIMEDIA (Video/Imagen)
            const MEDIA_DIR = path.join(process.cwd(), 'media')
            let buffer = null
            let isVideo = false

            // Intentar cargar archivos locales de /media
            if (fs.existsSync(MEDIA_DIR)) {
                try {
                    const files = fs.readdirSync(MEDIA_DIR)
                    const videos = files.filter(f => /\.(mp4|gif|webm)$/i.test(f))
                    const images = files.filter(f => /\.(jpg|png|jpeg|webp)$/i.test(f))

                    if (videos.length > 0) {
                        const randomVideo = videos[Math.floor(Math.random() * videos.length)]
                        buffer = fs.readFileSync(path.join(MEDIA_DIR, randomVideo))
                        buffer = await optimizeVideo(buffer, randomVideo.split('.').pop())
                        isVideo = true
                    } else if (images.length > 0) {
                        const randomImage = images[Math.floor(Math.random() * images.length)]
                        buffer = fs.readFileSync(path.join(MEDIA_DIR, randomImage))
                    }
                } catch (e) {}
            }

            const messageOptions = { caption: menuText.trim() }
            
            // Banner de la base de datos (Backup si no hay archivos)
            const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
            const dbBanner = global.db.data.settings[botId]?.banner

            if (isVideo && buffer) {
                messageOptions.video = buffer
                messageOptions.gifPlayback = true
            } else if (buffer) {
                messageOptions.image = buffer
            } else if (dbBanner) {
                messageOptions.image = { url: dbBanner }
            } else {
                // Fallback final
                messageOptions.image = { url: 'https://i.pinimg.com/736x/2a/39/19/2a39199d63c5a704259b15d21a525d88.jpg' }
            }

            await client.sendMessage(m.chat, messageOptions, { quoted: m })

        } catch (e) {
            console.error(e)
            m.reply('❌ Error al generar el menú.')
        }
    }
}
