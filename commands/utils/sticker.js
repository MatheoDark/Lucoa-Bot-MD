import fs from 'fs'
import { createCanvas, loadImage } from 'canvas'

// 🗑️ Función segura para borrar archivos temporales
function safeDeleteFile(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
    } catch (e) {
        console.error('Error borrando archivo temporal:', e)
    }
}

// 🎨 Generador de Sticker de Texto
async function generarStickerConTexto(texto) {
    const width = 512
    const height = 512
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    
    // Fondos aleatorios estilo Anime/Aesthetic
    const imagenes = [
        'https://files.catbox.moe/rzgivf.jpg', 'https://files.catbox.moe/2ow4nj.jpg',
        'https://files.catbox.moe/szlipu.jpg', 'https://files.catbox.moe/a0c3cn.jpg',
        'https://files.catbox.moe/2diw0t.jpg', 'https://files.catbox.moe/7ltk21.jpg',
        'https://files.catbox.moe/u4jpic.jpg', 'https://files.catbox.moe/0upi11.jpg',
        'https://files.catbox.moe/vzw6ij.jpg', 'https://files.catbox.moe/rjfkuu.jpg',
        'https://files.catbox.moe/dv575j.jpg'
    ]
    
    const url = imagenes[Math.floor(Math.random() * imagenes.length)]
    const baseImage = await loadImage(url)
    
    ctx.drawImage(baseImage, 0, 0, width, height)
    ctx.font = 'bold 40px Sans'
    ctx.fillStyle = '#000'
    ctx.textAlign = 'center'
    
    // Lógica para ajustar texto (Word Wrap)
    let x = 260
    let y = 360
    let maxWidth = 300
    let lines = []
    let line = ''
    
    for (const word of texto.split(' ')) {
        const test = line + word + ' '
        if (ctx.measureText(test).width < maxWidth) {
            line = test
        } else {
            lines.push(line.trim())
            line = word + ' '
        }
    }
    if (line) lines.push(line.trim())
    
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * 40)) // Espaciado mejorado
    return canvas.toBuffer()
}

export default {
    command: ['sticker', 's'],
    category: 'utils',
    run: async ({ client, m, args }) => {
        try {
            // 1. Configuración de Metadatos (Packname y Author)
            const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
            const botSettings = global.db.data.settings?.[botId] || {}
            const botname = botSettings.namebot || 'Lucoa-Bot'
            
            const user = global.db.data.users?.[m.sender] || {}
            const name = user.name || m.pushName || 'Usuario'
            
            const packname = user.metadatos || `♯𝐓꯭̱𝔥̱𝑒̱ . ㌦‥ꪱ꯭̱ꪆ꯭̱LUCoa ──͟͞🄱̱ǿ̱𝔱…ꤩꤨ‧💎`
            const author = user.metadatos2 || `Socket:\n↳@${botname}\n👹Usuario:\n↳@${name}`
            
            // 2. Detectar contenido (Imagen, Video o Texto)
            const q = m.quoted || m
            const mime = (q.msg || q).mimetype || ''
            
            // Reacción de carga
            await m.react('⏳')

            let media = null
            let enc = null

            if (/image/.test(mime)) {
                // 📸 CASO IMAGEN
                media = await q.download()
                enc = await client.sendImageAsSticker(m.chat, media, m, { packname, author })
                safeDeleteFile(enc)

            } else if (/video/.test(mime)) {
                // 🎥 CASO VIDEO
                if ((q.msg || q).seconds > 15) return m.reply('❌ El video es muy largo (Máx 15s).')
                
                media = await q.download()
                enc = await client.sendVideoAsSticker(m.chat, media, m, { packname, author })
                // Pequeña pausa para asegurar que ffmpeg termine
                await new Promise(r => setTimeout(r, 2000))
                safeDeleteFile(enc)

            } else {
                // 📝 CASO TEXTO (Argumentos o Texto citado)
                let texto = args.join(' ')
                if (!texto && q.text) texto = q.text // Si no hay args, usar texto citado

                if (texto) {
                    if (texto.length > 50) return m.reply('❌ Texto muy largo (Máx 50 caracteres).')
                    
                    let buffer = await generarStickerConTexto(texto)
                    enc = await client.sendImageAsSticker(m.chat, buffer, m, { packname, author })
                    // No hay archivo temporal que borrar aquí porque usamos buffer directo
                } else {
                    await m.react('❌')
                    return m.reply('⚠️ Envía una imagen/video o escribe texto para hacer un sticker.')
                }
            }

            // Reacción de éxito
            await m.react('✅')

        } catch (e) {
            console.error(e)
            await m.react('❌')
            m.reply(`❌ Ocurrió un error al crear el sticker.`)
        }
    }
}
