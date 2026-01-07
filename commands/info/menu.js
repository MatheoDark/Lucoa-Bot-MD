import { commands as staticCommands } from '../../lib/commands.js'
import fs from 'fs'
import path from 'path'

export default {
    command: ['menu', 'help', 'menú'],
    category: 'info',
    run: async ({ client, m, usedPrefix }) => {
        try {
            const botname = 'Lucoa-Bot-MD'
            const cleanPrefix = (usedPrefix || '#').trim()
            
            // Unificar Comandos (Igual que antes, para que salgan todos)
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

            // Cargar Plugins + Lista Estática
            const fileCommands = Object.values(global.plugins).map(p => p.default).filter(c => c && c.command).map(c => ({
                name: Array.isArray(c.command) ? c.command[0] : c.command,
                category: catMap[(c.category || 'otros').toLowerCase()] || 'Otros'
            }))
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

            // Texto del menú
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

            // === LÓGICA DE VIDEO (SOLUCIÓN MÓVIL) ===
            const MEDIA_DIR = path.join(process.cwd(), 'media')
            let mediaPath = null
            let isVideo = false

            // Buscar archivo local válido
            if (fs.existsSync(MEDIA_DIR)) {
                try {
                    const files = fs.readdirSync(MEDIA_DIR)
                    const videos = files.filter(f => /\.(mp4)$/i.test(f)) // Solo MP4, gifs dan problemas
                    const images = files.filter(f => /\.(jpg|png|jpeg)$/i.test(f))

                    if (videos.length > 0) {
                        mediaPath = path.join(MEDIA_DIR, videos[Math.floor(Math.random() * videos.length)])
                        isVideo = true
                    } else if (images.length > 0) {
                        mediaPath = path.join(MEDIA_DIR, images[Math.floor(Math.random() * images.length)])
                        isVideo = false
                    }
                } catch (e) { console.error('Error leyendo carpeta media:', e) }
            }

            // Enviar
            if (mediaPath && isVideo) {
                // Video Local: Enviamos como documento de video si es pesado, o video normal
                // Para asegurar compatibilidad móvil, lo mejor es enviar URL si falla lo local, pero probemos esto:
                await client.sendMessage(m.chat, { 
                    video: fs.readFileSync(mediaPath), 
                    caption: menuText.trim(),
                    gifPlayback: true // Si falla en cel, prueba poner esto en 'false'
                }, { quoted: m })
            } else if (mediaPath && !isVideo) {
                // Imagen Local
                await client.sendMessage(m.chat, { 
                    image: fs.readFileSync(mediaPath), 
                    caption: menuText.trim() 
                }, { quoted: m })
            } else {
                // FALLBACK SEGURO (URL)
                // Usamos un video de Imgur que sabemos que carga bien en móviles
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
