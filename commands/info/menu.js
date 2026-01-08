import { commands as myCommands } from '../../lib/commands.js'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

// Función para optimizar video (FFmpeg)
async function optimizeVideo(buffer, extension) {
    try {
        if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')
        
        const filename = Math.floor(Math.random() * 10000)
        const inputPath = `./tmp/${filename}.${extension}`
        const outputPath = `./tmp/${filename}_opt.mp4`

        await fs.promises.writeFile(inputPath, buffer)
        await execPromise(`ffmpeg -y -i "${inputPath}" -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -crf 28 -preset veryfast -movflags +faststart "${outputPath}"`)

        const resultBuffer = await fs.promises.readFile(outputPath)
        await fs.promises.unlink(inputPath)
        await fs.promises.unlink(outputPath)

        return resultBuffer
    } catch (e) {
        return buffer
    }
}

export default {
    command: ['menu', 'help', 'menú', 'comandos'],
    category: 'info',
    run: async ({ client, m, usedPrefix }) => {
        try {
            const botname = '🐉 LUCOA-BOT-MD'
            const cleanPrefix = (usedPrefix || '#').trim()
            const username = m.pushName || 'Usuario'
            
            // Títulos de categorías
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

            let menuText = `╭━ꕥ *${botname}* ꕥ━\n`
            menuText += `┃ 👤 *Usuario:* ${username}\n`
            menuText += `┃ 🤖 *Bot:* Online\n`
            menuText += `┃ 📚 *Comandos:* ${myCommands.length}\n`
            menuText += `╰━━━━━━━━━━━━━━╯\n\n`

            // Ordenamos categorías
            const categoryKeys = Object.keys(catMap)

            categoryKeys.forEach(tag => {
                const cmds = myCommands.filter(c => c.category === tag)
                
                if (cmds.length > 0) {
                    menuText += `╭─✦ *${catMap[tag]}* ✦\n`
                    
                    cmds.forEach(cmd => {
                        // AQUÍ ESTÁ LA MAGIA:
                        // Juntamos el nombre principal con sus alias
                        let commandLine = `${cleanPrefix}${cmd.name}`
                        
                        if (cmd.alias && Array.isArray(cmd.alias) && cmd.alias.length > 0) {
                            // Agregamos los alias separados por " / "
                            // Filtramos alias vacíos y limpiamos posibles barras "/" extra
                            const aliasLimpis = cmd.alias.map(a => `${cleanPrefix}${a.replace(/^\//, '')}`)
                            commandLine += ` / ${aliasLimpis.join(' / ')}`
                        }

                        menuText += `│ ❧ ${commandLine} ${cmd.desc ? `\n│   └ ${cmd.desc}` : ''}\n`
                    })
                    menuText += `╰─────────────⬫\n\n`
                }
            })
            
            menuText += `> 🐲 Powered by MatheoDark`

            // Gestión de Multimedia
            const MEDIA_DIR = path.join(process.cwd(), 'media')
            let buffer = null
            let isVideo = false

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
            const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
            const dbBanner = global.db?.data?.settings?.[botId]?.banner || null

            if (isVideo && buffer) {
                messageOptions.video = buffer
                messageOptions.gifPlayback = true
            } else if (buffer) {
                messageOptions.image = buffer
            } else if (dbBanner) {
                messageOptions.image = { url: dbBanner }
            } else {
                messageOptions.image = { url: 'https://i.pinimg.com/736x/2a/39/19/2a39199d63c5a704259b15d21a525d88.jpg' }
            }

            await client.sendMessage(m.chat, messageOptions, { quoted: m })

        } catch (e) {
            console.error(e)
            m.reply('❌ Error al generar el menú.')
        }
    }
}
