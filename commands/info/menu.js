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

                await client.sendMessage(m.chat, { text: cmdText }, { quoted: m })

                // Encuesta para volver o ir a otra categoría
                const volverOptions = [{ name: '↩ Volver al Menú', command: `${cleanPrefix}menu` }]
                const volverMap = {}
                for (const opt of volverOptions) {
                    const hash = crypto.createHash('sha256').update(opt.name).digest('hex')
                    volverMap[hash] = opt.command
                }
                const volverPoll = await client.sendMessage(m.chat, {
                    poll: {
                        name: '🐉 ¿Qué deseas hacer?',
                        values: volverOptions.map(o => o.name),
                        selectableCount: 1
                    }
                })
                if (volverPoll?.key?.id) {
                    const pollEncKey = volverPoll.message?.messageContextInfo?.messageSecret
                    if (pollEncKey) {
                        global.activePollMenus.set(volverPoll.key.id, {
                            pollEncKey,
                            pollCreatorJid: client.user.id,
                            optionMap: volverMap,
                            chatJid: m.chat,
                            createdAt: Date.now()
                        })
                    }
                }
                return
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

            // ═══ Encuesta interactiva de categorías ═══
            const activeCategories = Object.entries(catMap)
                .filter(([key]) => myCommands.some(c => c.category === key))

            // WhatsApp permite máximo 12 opciones en una encuesta
            const pollOptions = activeCategories.slice(0, 12).map(([key, label]) => {
                const count = myCommands.filter(c => c.category === key).length
                return { name: `${label} (${count})`, command: `${cleanPrefix}menu ${key}` }
            })

            // Crear el mapeo optionHash → comando
            const optionMap = {}
            for (const opt of pollOptions) {
                const hash = crypto.createHash('sha256').update(opt.name).digest('hex')
                optionMap[hash] = opt.command
            }

            // Enviar la encuesta
            const pollResult = await client.sendMessage(m.chat, {
                poll: {
                    name: '🐉 Selecciona una categoría',
                    values: pollOptions.map(o => o.name),
                    selectableCount: 1
                }
            }, { quoted: m })

            // Guardar en store global para detectar el voto
            if (pollResult?.key?.id) {
                const pollEncKey = pollResult.message?.messageContextInfo?.messageSecret
                    || pollResult.message?.pollCreationMessageV3?.messageSecret
                    || pollResult.message?.pollCreationMessage?.messageSecret
                console.log('[MenuPoll] Poll ID:', pollResult.key.id, 'encKey found:', !!pollEncKey, 'options:', Object.values(optionMap))
                if (!pollEncKey) {
                    console.log('[MenuPoll] Full message keys:', JSON.stringify(Object.keys(pollResult.message || {})))
                }
                if (pollEncKey) {
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
            }

        } catch (e) {
            console.error(e)
            m.reply('❌ Error al generar el menú.')
        }
    }
}
