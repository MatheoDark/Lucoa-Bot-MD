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
    run: async ({ client, m, usedPrefix, args }) => {
        try {
            const botname = '𝐋𝐔𝐂𝐎𝐀 𝐁𝐎𝐓'
            const cleanPrefix = (usedPrefix || '#').trim()
            const username = m.pushName || 'Usuario'
            
            // Kaomojis aleatorios
            const kaos = ['(◕ᴗ◕✿)', '(●\'◡\'●)', '(˶ᵔ ᵕ ᵔ˶)', '(≧◡≦)', '(✿◠‿◠)', '₍ᐢ..ᐢ₎♡']
            const kao = kaos[Math.floor(Math.random() * kaos.length)]

            // Títulos de categorías - Estética Lucoa Anime
            const catMap = {
                'info': '🐉 Información',
                'anime': '🌸 Anime & Reacciones',
                'nsfw': '🔞 NSFW (+18)',
                'economia': '💰 Economía',
                'rpg': '🎴 RPG & Juegos',
                'gacha': '🎲 Gacha & Waifus',
                'grupo': '👥 Grupos',
                'sockets': '🤖 Sub-Bots',
                'utils': '🔮 Utilidades',
                'download': '📥 Descargas',
                'search': '🔍 Búsquedas',
                'ia': '✨ Inteligencia Artificial',
                'profile': '👤 Perfil',
                'otros': '🌀 Otros'
            }

            const selectedCategory = args[0]?.toLowerCase()

            // ═══ NIVEL 2: Comandos de una categoría (con botón volver) ═══
            if (selectedCategory && catMap[selectedCategory]) {
                const cmds = myCommands.filter(c => c.category === selectedCategory)
                if (cmds.length === 0) return m.reply('❌ No hay comandos en esta categoría.')

                let cmdText = `╭── ${catMap[selectedCategory]} ──\n`
                cmds.forEach(cmd => {
                    let commandLine = `${cleanPrefix}${cmd.name}`
                    if (cmd.alias && Array.isArray(cmd.alias) && cmd.alias.length > 0) {
                        const aliasLimpis = cmd.alias.map(a => `${cleanPrefix}${a.replace(/^\//, '')}`)
                        commandLine += ` / ${aliasLimpis.join(' / ')}`
                    }
                    cmdText += `│ ❀ ${commandLine}${cmd.desc ? `\n│   ╰ _${cmd.desc}_` : ''}\n`
                })
                cmdText += `╰──────────⋆✦⋆\n\n> 📊 Total: ${cmds.length} comandos`

                return await client.sendButton(
                    m.chat,
                    cmdText,
                    '🐉 Lucoa Bot',
                    'https://raw.githubusercontent.com/MatheoDark/Lucoa-Bot-MD/main/media/banner2.jpg',
                    [['↩ Volver al Menú', `${cleanPrefix}menu`]],
                    null,
                    null,
                    m
                )
            }

            // ═══ NIVEL 1: Menú original con video/imagen + botones de categoría ═══
            let menuText = `╭─── ⋆🐉⋆ ───────────╮\n`
            menuText += `│  *${botname}* ${kao}\n`
            menuText += `├─────────────────────\n`
            menuText += `│ 👤 *Usuario ›* ${username}\n`
            menuText += `│ 🐲 *Estado ›* Online\n`
            menuText += `│ 📚 *Comandos ›* ${myCommands.length}\n`
            menuText += `│ ✧ *Prefijo ›* ${cleanPrefix}\n`
            menuText += `╰─── ⋆✨⋆ ───────────╯\n\n`

            // Ordenamos categorías
            const categoryKeys = Object.keys(catMap)

            categoryKeys.forEach(tag => {
                const cmds = myCommands.filter(c => c.category === tag)
                
                if (cmds.length > 0) {
                    menuText += `╭── ${catMap[tag]} ──\n`
                    
                    cmds.forEach(cmd => {
                        let commandLine = `${cleanPrefix}${cmd.name}`
                        
                        if (cmd.alias && Array.isArray(cmd.alias) && cmd.alias.length > 0) {
                            const aliasLimpis = cmd.alias.map(a => `${cleanPrefix}${a.replace(/^\//, '')}`)
                            commandLine += ` / ${aliasLimpis.join(' / ')}`
                        }

                        menuText += `│ ❀ ${commandLine}${cmd.desc ? `\n│   ╰ _${cmd.desc}_` : ''}\n`
                    })
                    menuText += `╰──────────⋆✦⋆\n\n`
                }
            })
            
            menuText += `> 🐉 *Lucoa Bot* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`

            // Gestión de Multimedia (TU CÓDIGO ORIGINAL)
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
                messageOptions.image = { url: 'https://raw.githubusercontent.com/MatheoDark/Lucoa-Bot-MD/main/media/banner2.jpg' }
            }

            // Enviar menú original con video/imagen
            await client.sendMessage(m.chat, messageOptions, { quoted: m })

            // Enviar botones de categorías (máximo 3 por mensaje)
            const categoryButtons = Object.entries(catMap)
                .filter(([key]) => myCommands.some(c => c.category === key))
                .map(([key, label]) => {
                    const count = myCommands.filter(c => c.category === key).length
                    return [`${label} (${count})`, `${cleanPrefix}menu ${key}`]
                })

            // Dividir en grupos de 3 (límite de WhatsApp)
            for (let i = 0; i < categoryButtons.length; i += 3) {
                const chunk = categoryButtons.slice(i, i + 3)
                const page = Math.floor(i / 3) + 1
                const totalPages = Math.ceil(categoryButtons.length / 3)
                await client.sendButton(
                    m.chat,
                    page === 1 ? '_Selecciona una categoría para ver sus comandos_ 🐉' : `_Más categorías (${page}/${totalPages})_ 🐉`,
                    '🐉 Lucoa Bot · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ',
                    null,
                    chunk,
                    null,
                    null,
                    m
                )
            }

        } catch (e) {
            console.error(e)
            m.reply('❌ Error al generar el menú.')
        }
    }
}
