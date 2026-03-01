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
    
    // Fondos aleatorios
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
    
    // Word Wrap (Ajuste de texto)
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
    
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * 40)) 
    return canvas.toBuffer()
}

export default {
    command: ['sticker', 's'],
    category: 'utils',
    run: async ({ client, m, args }) => {
        try {
            // 1. Configuración de Metadatos (BLINDADA CONTRA ERRORES DE TIPO)
            const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
            const botSettings = global.db.data.settings?.[botId] || {}
            const botname = (typeof botSettings.namebot === 'string') ? botSettings.namebot : 'Lucoa-Bot'
            
            const user = global.db.data.users?.[m.sender] || {}
            const name = user.name || m.pushName || 'Usuario'
            
            // Verificamos estrictamente que sea STRING. Si es objeto {}, usa el default.
            const packname = (typeof user.metadatos === 'string' && user.metadatos.trim() !== '') 
                ? user.metadatos 
                : `♯𝐓꯭̱𝔥̱𝑒̱ . ㌦‥ꪱ꯭̱ꪆ꯭̱LUCoa ──͟͞🄱̱ǿ̱𝔱…ꤩꤨ‧💎`
                
            const author = (typeof user.metadatos2 === 'string' && user.metadatos2.trim() !== '')
                ? user.metadatos2 
                : `Socket:\n↳@${botname}\n👹Usuario:\n↳@${name}`
            
            // 2. Detectar contenido
            const q = m.quoted || m
            const mime = (q.msg || q).mimetype || ''
            
            await m.react('⏳')

            let media = null
            let enc = null

            if (/image/.test(mime)) {
                // 📸 IMAGEN
                media = await q.download()
                enc = await client.sendImageAsSticker(m.chat, media, m, { packname, author })
                safeDeleteFile(enc)

            } else if (/video/.test(mime)) {
                // 🎥 VIDEO
                if ((q.msg || q).seconds > 15) return m.reply('🐲 Video muy largo, máximo 15s (◕︿◕)')
                
                media = await q.download()
                enc = await client.sendVideoAsSticker(m.chat, media, m, { packname, author })
                await new Promise(r => setTimeout(r, 2000))
                safeDeleteFile(enc)

            } else {
                // 📝 TEXTO
                let texto = args.join(' ')
                if (!texto && q.text) texto = q.text 

                if (texto) {
                    if (texto.length > 50) return m.reply('🐲 Texto muy largo, máximo 50 caracteres (◕︿◕)')
                    let buffer = await generarStickerConTexto(texto)
                    enc = await client.sendImageAsSticker(m.chat, buffer, m, { packname, author })
                } else {
                    await m.react('❌')
                    return m.reply('🐲 Envía una imagen/video o texto para hacer un sticker (◕ᴗ◕)')
                }
            }

            await m.react('✅')

        } catch (e) {
            console.error('Error en Sticker:', e)
            await m.react('❌')
            m.reply(`❌ Error: ${e.message}`)
        }
    }
}
