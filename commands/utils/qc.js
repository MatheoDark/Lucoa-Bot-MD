import axios from 'axios'
import { Sticker, createSticker, StickerTypes } from 'wa-sticker-formatter' 
// NOTA: Si no tienes 'wa-sticker-formatter', el código usará el método nativo abajo.

async function postQuote(payload) {
    const url = 'https://bot.lyo.su/quote/generate'
    const headers = { 'Content-Type': 'application/json' }
    try {
        const res = await axios.post(url, payload, { 
            headers, 
            timeout: 30000 // 30 segundos de espera (la API a veces es lenta)
        })
        return res.data
    } catch (e) {
        console.error('[QC API Error]:', e.message)
        return { error: true }
    }
}

async function getProfilePic(client, who) {
    try {
        return await client.profilePictureUrl(who, 'image')
    } catch {
        return 'https://telegra.ph/file/24fa902ead26340f3df2c.png'
    }
}

async function getDisplayName(client, m, who) {
    // 1. Prioridad: Base de Datos (Setname)
    try {
        const userDb = global.db?.data?.users?.[who]
        if (userDb && userDb.name && userDb.name !== 'Sin nombre') {
            return userDb.name
        }
    } catch (e) {}

    // 2. Mismo usuario (PushName)
    if (who === m.sender && m.pushName) return m.pushName

    // 3. Grupo (Notify)
    if (m.isGroup) {
        try {
            const metadata = await client.groupMetadata(m.chat)
            const participant = metadata.participants.find(p => p.id === who)
            if (participant && participant.notify) return participant.notify 
        } catch (e) {}
    }

    // 4. Contacto (GetName)
    try {
        if (client.getName) {
            const name = await client.getName(who)
            if (name && !name.includes('+')) return name
        }
    } catch (e) {}

    // 5. Fallback: Número
    return '+' + who.split('@')[0]
}

export default {
    command: ['qc'],
    category: 'utils',
    run: async ({ client, m, args, usedPrefix, command }) => {
        try {
            let text
            if (args.length >= 1) text = args.join(" ")
            else if (m.quoted && m.quoted.text) text = m.quoted.text
            else return m.reply(`📌 *Falta texto*\nEjemplo: ${usedPrefix + command} Hola`)

            if (text.length > 150) return m.reply('📌 Máximo 150 caracteres.')

            // Determinar quién habla
            let who = m.quoted ? m.quoted.sender : m.sender
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                who = m.mentionedJid[0]
                text = text.replace(/@\d+/g, '').trim()
            }

            const pp = await getProfilePic(client, who)
            const nombre = await getDisplayName(client, m, who)

            const obj = {
                type: 'quote',
                format: 'png',
                backgroundColor: '#000000',
                width: 512,
                height: 768,
                scale: 2,
                messages: [{
                    entities: [],
                    avatar: true,
                    from: {
                        id: 1,
                        name: nombre,
                        photo: { url: pp }
                    },
                    text: text,
                    replyMessage: {}
                }]
            }

            const json = await postQuote(obj)
            
            if (json.result && json.result.image) {
                const buffer = Buffer.from(json.result.image, 'base64')
                
                // INTENTO 1: Usar función del bot (sendImageAsSticker)
                if (client.sendImageAsSticker) {
                    try {
                        await client.sendImageAsSticker(m.chat, buffer, m, { 
                            packname: global.packname || 'Lucoa', 
                            author: nombre 
                        })
                        return // Éxito, terminamos
                    } catch (e) {
                        console.log('Falló sendImageAsSticker, probando nativo...')
                    }
                }

                // INTENTO 2: Envío Nativo (Baileys puro)
                // Esto funciona incluso si no tienes librerías de stickers instaladas
                await client.sendMessage(m.chat, { 
                    sticker: buffer 
                }, { quoted: m })

            } else {
                m.reply('❌ La API de QC no respondió. Intenta en 1 minuto.')
            }

        } catch (e) {
            console.error(e)
            m.reply('❌ Error desconocido en QC.')
        }
    }
}
