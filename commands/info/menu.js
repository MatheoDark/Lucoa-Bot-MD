import { commands as myCommands } from '../../lib/commands.js'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import crypto from 'crypto'

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

            // ═══ VER TODO: Menú completo en texto ═══
            if (selectedCategory === 'all') {
                let fullText = `╭─── ⋆🐉⋆ ───────────╮\n`
                fullText += `│  *${botname}* ${kao}\n`
                fullText += `│ 📚 *Comandos ›* ${myCommands.length}\n`
                fullText += `│ ✧ *Prefijo ›* ${cleanPrefix}\n`
                fullText += `╰─── ⋆✨⋆ ───────────╯\n\n`

                for (const [tag, label] of Object.entries(catMap)) {
                    const cmds = myCommands.filter(c => c.category === tag)
                    if (cmds.length === 0) continue
                    fullText += `╭── ${label} ──\n`
                    cmds.forEach(cmd => {
                        let commandLine = `${cleanPrefix}${cmd.name}`
                        if (cmd.alias && Array.isArray(cmd.alias) && cmd.alias.length > 0) {
                            const aliasLimpis = cmd.alias.map(a => `${cleanPrefix}${a.replace(/^\//, '')}`)
                            commandLine += ` / ${aliasLimpis.join(' / ')}`
                        }
                        fullText += `│ ❀ ${commandLine}${cmd.desc ? `\n│   ╰ _${cmd.desc}_` : ''}\n`
                    })
                    fullText += `╰──────────⋆✦⋆\n\n`
                }
                fullText += `> 🐉 *Lucoa Bot* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`

                const allMedia = await getMenuMedia()
                allMedia.caption = fullText.trim()
                return await client.sendMessage(m.chat, allMedia, { quoted: m })
            }

            // ═══ Función para obtener media (video/imagen/banner) ═══
            async function getMenuMedia() {
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

                const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
                const dbBanner = global.db?.data?.settings?.[botId]?.banner || null
                const mediaOpts = {}

                if (isVideo && buffer) {
                    mediaOpts.video = buffer
                    mediaOpts.gifPlayback = true
                } else if (buffer) {
                    mediaOpts.image = buffer
                } else if (dbBanner) {
                    mediaOpts.image = { url: dbBanner }
                } else {
                    mediaOpts.image = { url: 'https://raw.githubusercontent.com/MatheoDark/Lucoa-Bot-MD/main/media/banner2.jpg' }
                }
                return mediaOpts
            }

            // ═══ Helper para registrar poll en store global ═══
            function registerPoll(pollResult, optionMap) {
                if (!pollResult?.key?.id) return
                const pollEncKey = pollResult.message?.messageContextInfo?.messageSecret
                    || pollResult.message?.pollCreationMessageV3?.messageSecret
                    || pollResult.message?.pollCreationMessage?.messageSecret
                if (!pollEncKey) return
                global.activePollMenus.set(pollResult.key.id, {
                    pollEncKey,
                    pollCreatorJid: client.user.id,
                    optionMap,
                    chatJid: m.chat,
                    createdAt: Date.now()
                })
                // Limpiar polls viejos (más de 30 minutos)
                for (const [id, data] of global.activePollMenus) {
                    if (Date.now() - data.createdAt > 30 * 60 * 1000) {
                        global.activePollMenus.delete(id)
                    }
                }
            }

            // ═══ NIVEL 2: Comandos de una categoría ═══
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

                // Enviar con video/media
                const media = await getMenuMedia()
                media.caption = cmdText
                await client.sendMessage(m.chat, media, { quoted: m })

                // Encuesta para volver
                const volverOptions = [{ name: '↩ Volver al Menú', command: `${cleanPrefix}menu` }]
                const volverMap = {}
                for (const opt of volverOptions) {
                    volverMap[crypto.createHash('sha256').update(opt.name).digest('hex')] = opt.command
                }
                const volverPoll = await client.sendMessage(m.chat, {
                    poll: { name: '🐉 ¿Qué deseas hacer?', values: volverOptions.map(o => o.name), selectableCount: 1 }
                })
                registerPoll(volverPoll, volverMap)
                return
            }

            // ═══ NIVEL 1: Encuesta primero, luego video/resumen ═══

            // 1. Encuesta interactiva de categorías
            const activeCategories = Object.entries(catMap)
                .filter(([key]) => myCommands.some(c => c.category === key))

            const pollOptions = activeCategories.slice(0, 11).map(([key, label]) => {
                const count = myCommands.filter(c => c.category === key).length
                return { name: `${label} (${count})`, command: `${cleanPrefix}menu ${key}` }
            })
            pollOptions.push({ name: '📖 Ver todo el menú', command: `${cleanPrefix}menu all` })

            const optionMap = {}
            for (const opt of pollOptions) {
                optionMap[crypto.createHash('sha256').update(opt.name).digest('hex')] = opt.command
            }

            // 2. Enviar solo la encuesta
            const pollResult = await client.sendMessage(m.chat, {
                poll: { name: `🐉 ${botname} ${kao}\n📚 ${myCommands.length} comandos · Prefijo: ${cleanPrefix}\nSelecciona una categoría:`, values: pollOptions.map(o => o.name), selectableCount: 1 }
            }, { quoted: m })
            registerPoll(pollResult, optionMap)

        } catch (e) {
            console.error(e)
            m.reply('❌ Error al generar el menú.')
        }
    }
}
