import axios from 'axios' // <--- ESTO FALTABA
import fs from 'fs'

export default {
    command: ['qc'],
    category: 'utils',
    run: async ({ client, m, args }) => {
        try {
            let text = args.join(" ") || (m.quoted?.text)
            if (!text) return m.reply('⚠️ Falta texto: /qc Hola')
            if (text.length > 50) return m.reply('Máximo 50 caracteres.')

            // Datos usuario
            let name = m.pushName || 'Usuario'
            let pp = 'https://i.imgur.com/HeIi1P7.png'
            try { pp = await client.profilePictureUrl(m.sender, 'image') } catch {}

            // JSON API
            const obj = {
                "type": "quote",
                "format": "png",
                "backgroundColor": "#FFFFFF",
                "width": 512,
                "height": 768,
                "scale": 2,
                "messages": [{
                    "entities": [],
                    "avatar": true,
                    "from": { "id": 1, "name": name, "photo": { "url": pp } },
                    "text": text,
                    "replyMessage": {}
                }]
            }

            const res = await axios.post('https://bot.lyo.su/quote/generate', obj)
            const buffer = Buffer.from(res.data.result.image, 'base64')

            // Enviar Sticker (Usando método nativo si existe, o raw)
            if (client.sendImageAsSticker) {
                // Tus metadatos personalizados
                let pack = global.db.data.users[m.sender]?.metadatos || 'Lucoa-Bot'
                let auth = global.db.data.users[m.sender]?.metadatos2 || 'MatheoDark'
                await client.sendImageAsSticker(m.chat, buffer, m, { packname: pack, author: auth })
            } else {
                await client.sendMessage(m.chat, { sticker: buffer }, { quoted: m })
            }

        } catch (e) {
            console.error(e)
            m.reply('❌ Error al crear QC.')
        }
    }
}
