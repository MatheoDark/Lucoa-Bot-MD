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

                return await client.sendNativeSelect(m.chat, {
                    title: catMap[selectedCategory],
                    body: `📂 *${catMap[selectedCategory]}*\n\n_Toca el botón y selecciona un comando para ejecutarlo._\n\n> 📊 Total: ${cmds.length} comandos`,
                    footer: '🐉 Lucoa Bot',
                    buttonText: '📋 Ver Comandos',
                    rows
                }, m)
            }

            // ═══ NIVEL 1: Menú principal con lista de categorías ═══
            let headerText = `╭─── ⋆🐉⋆ ───────────╮\n`
            headerText += `│  *${botname}* ${kao}\n`
            headerText += `├─────────────────────\n`
            headerText += `│ 👤 *Usuario ›* ${username}\n`
            headerText += `│ 🐲 *Estado ›* Online\n`
            headerText += `│ 📚 *Comandos ›* ${myCommands.length}\n`
            headerText += `│ ✧ *Prefijo ›* ${cleanPrefix}\n`
            headerText += `╰─── ⋆✨⋆ ───────────╯\n\n`
            headerText += `_Selecciona una categoría para ver sus comandos_ 🐉`

            const categoryRows = Object.entries(catMap)
                .filter(([key]) => myCommands.some(c => c.category === key))
                .map(([key, label]) => {
                    const count = myCommands.filter(c => c.category === key).length
                    return {
                        title: label,
                        description: `${count} comandos disponibles`,
                        id: `${cleanPrefix}menu ${key}`
                    }
                })

            // Gestión de Multimedia (videos optimizados + imágenes)
            const MEDIA_DIR = path.join(process.cwd(), 'media')
            let mediaSent = false
            if (fs.existsSync(MEDIA_DIR)) {
                try {
                    const files = fs.readdirSync(MEDIA_DIR)
                    const videos = files.filter(f => /\.(mp4|gif|webm)$/i.test(f))
                    const images = files.filter(f => /\.(jpg|png|jpeg|webp)$/i.test(f))

                    if (videos.length > 0) {
                        const randomVideo = videos[Math.floor(Math.random() * videos.length)]
                        let buffer = fs.readFileSync(path.join(MEDIA_DIR, randomVideo))
                        buffer = await optimizeVideo(buffer, randomVideo.split('.').pop())
                        await client.sendMessage(m.chat, { video: buffer, gifPlayback: true, caption: headerText }, { quoted: m })
                        mediaSent = true
                    } else if (images.length > 0) {
                        const randomImage = images[Math.floor(Math.random() * images.length)]
                        const imgBuffer = fs.readFileSync(path.join(MEDIA_DIR, randomImage))
                        await client.sendMessage(m.chat, { image: imgBuffer, caption: headerText }, { quoted: m })
                        mediaSent = true
                    }
                } catch (e) {}
            }

            if (!mediaSent) {
                const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
                const dbBanner = global.db?.data?.settings?.[botId]?.banner || null

                if (dbBanner) {
                    await client.sendMessage(m.chat, { image: { url: dbBanner }, caption: headerText }, { quoted: m })
                } else {
                    await client.sendMessage(m.chat, { image: { url: 'https://raw.githubusercontent.com/MatheoDark/Lucoa-Bot-MD/main/media/banner2.jpg' }, caption: headerText }, { quoted: m })
                }
            }

            await client.sendNativeSelect(m.chat, {
                title: '🐉 Lucoa Bot',
                body: '> _Toca el botón de abajo y selecciona una categoría_ 🐉',
                footer: 'ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ',
                buttonText: '📋 Ver Categorías',
                rows: categoryRows
            }, m)

        } catch (e) {
            console.error(e)
            m.reply('❌ Error al generar el menú.')
        }
    }
}
