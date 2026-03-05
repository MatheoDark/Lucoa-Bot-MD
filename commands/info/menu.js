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

            const kaos = ['(◕ᴗ◕✿)', '(●\'◡\'●)', '(˶ᵔ ᵕ ᵔ˶)', '(≧◡≦)', '(✿◠‿◠)', '₍ᐢ..ᐢ₎♡']
            const kao = kaos[Math.floor(Math.random() * kaos.length)]

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

            // ═══ NIVEL 2: Comandos de una categoría específica ═══
            if (selectedCategory && catMap[selectedCategory]) {
                const cmds = myCommands.filter(c => c.category === selectedCategory)
                if (cmds.length === 0) return m.reply('❌ No hay comandos en esta categoría.')

                const rows = cmds.map(cmd => ({
                    title: `${cleanPrefix}${cmd.name}`,
                    description: cmd.desc || 'Sin descripción',
                    id: `${cleanPrefix}${cmd.name}`
                }))

                rows.unshift({
                    title: '↩ Volver al Menú',
                    description: 'Regresar al menú principal',
                    id: `${cleanPrefix}menu`
                })

                const sections = [{
                    title: catMap[selectedCategory],
                    rows
                }]

                return await client.sendList(
                    m.chat,
                    catMap[selectedCategory],
                    `📂 *${catMap[selectedCategory]}*\n\n_Toca el botón y selecciona un comando para ejecutarlo._\n\n> 📊 Total: ${cmds.length} comandos`,
                    '📋 Ver Comandos',
                    sections,
                    m
                )
            }

            // ═══ NIVEL 1: Menú principal con botones de categoría ═══
            let headerText = `╭─── ⋆🐉⋆ ───────────╮\n`
            headerText += `│  *${botname}* ${kao}\n`
            headerText += `├─────────────────────\n`
            headerText += `│ 👤 *Usuario ›* ${username}\n`
            headerText += `│ 🐲 *Estado ›* Online\n`
            headerText += `│ 📚 *Comandos ›* ${myCommands.length}\n`
            headerText += `│ ✧ *Prefijo ›* ${cleanPrefix}\n`
            headerText += `╰─── ⋆✨⋆ ───────────╯\n\n`
            headerText += `_Selecciona una categoría para ver sus comandos_ 🐉`

            const categoryButtons = Object.entries(catMap)
                .filter(([key]) => myCommands.some(c => c.category === key))
                .map(([key, label]) => {
                    const count = myCommands.filter(c => c.category === key).length
                    return [`${label} (${count})`, `${cleanPrefix}menu ${key}`]
                })

            // Gestión de Multimedia (videos optimizados + imágenes)
            let media = null
            let tempFile = null
            const MEDIA_DIR = path.join(process.cwd(), 'media')
            if (fs.existsSync(MEDIA_DIR)) {
                try {
                    const files = fs.readdirSync(MEDIA_DIR)
                    const videos = files.filter(f => /\.(mp4|gif|webm)$/i.test(f))
                    const images = files.filter(f => /\.(jpg|png|jpeg|webp)$/i.test(f))

                    if (videos.length > 0) {
                        const randomVideo = videos[Math.floor(Math.random() * videos.length)]
                        let buffer = fs.readFileSync(path.join(MEDIA_DIR, randomVideo))
                        buffer = await optimizeVideo(buffer, randomVideo.split('.').pop())
                        if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')
                        tempFile = `./tmp/menu_${Date.now()}.mp4`
                        fs.writeFileSync(tempFile, buffer)
                        media = tempFile
                    } else if (images.length > 0) {
                        const randomImage = images[Math.floor(Math.random() * images.length)]
                        media = path.join(MEDIA_DIR, randomImage)
                    }
                } catch (e) {}
            }

            if (!media) {
                const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
                const dbBanner = global.db?.data?.settings?.[botId]?.banner
                media = dbBanner || 'https://i.pinimg.com/736x/2a/39/19/2a39199d63c5a704259b15d21a525d88.jpg'
            }

            await client.sendButton(
                m.chat,
                headerText,
                '🐉 Lucoa Bot · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ',
                media,
                categoryButtons,
                null,
                null,
                m
            )

            // Limpiar archivo temporal si se creó
            if (tempFile && fs.existsSync(tempFile)) {
                fs.promises.unlink(tempFile).catch(() => {})
            }

        } catch (e) {
            console.error(e)
            m.reply('❌ Error al generar el menú.')
        }
    }
}
