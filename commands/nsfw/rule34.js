import fetch from 'node-fetch'
import https from 'https'

const agent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    family: 4 
})

export default {
    command: ['r34', 'rule34'],
    category: 'nsfw',
    desc: 'Busca imágenes (pack) en Rule34.',

    run: async ({ client, m, text, usedPrefix, command }) => {
        
        // --- VERIFICACIÓN NSFW (Agregada) ---
        const chatId = m.chat
        const db = global.db
        
        // Si es un grupo y el NSFW está desactivado, bloquear
        if (m.isGroup && !db.data.chats[chatId]?.nsfw) {
             return m.reply('🚫 Los comandos *NSFW* están desactivados en este grupo.\nUsa `#enable nsfw` para activarlos.')
        }
        // ------------------------------------

        if (!text) return m.reply(`*⚠️ Falta el nombre.*\nEjemplo: ${usedPrefix + command} lucoa`)

        const tags = text.trim().replace(/\s+/g, '_')
        m.reply('🔍 *Buscando Pack (5) en Rule34...*')

        try {
            const searchUrl = `https://rule34.xxx/index.php?page=post&s=list&tags=${encodeURIComponent(tags)}`
            
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cookie': 'resize-notification=1'
            }

            let res = await fetch(searchUrl, { agent, headers })
            let html = await res.text()

            let idMatch = html.match(/index\.php\?page=post&s=view&id=(\d+)/g)

            if (!idMatch || idMatch.length === 0) {
                 if (html.includes('id="image"')) throw 'Se encontró solo un resultado directo.'
                 throw 'No encontré nada con ese nombre.'
            }

            let ids = idMatch.map(link => link.match(/id=(\d+)/)[1])
            ids = [...new Set(ids)] 

            if (ids.length === 0) throw 'Sin resultados válidos.'

            // --- MODO PACK: 5 AL AZAR ---
            const count = 5
            const selectedIds = ids.sort(() => 0.5 - Math.random()).slice(0, count)

            console.log(`Enviando pack de ${selectedIds.length} archivos...`)

            for (let id of selectedIds) {
                try {
                    let postUrl = `https://rule34.xxx/index.php?page=post&s=view&id=${id}`
                    let resPost = await fetch(postUrl, { agent, headers })
                    let htmlPost = await resPost.text()
                    let fileUrl = null

                    let originalMatch = htmlPost.match(/href="([^"]+)">Original image/i)
                    if (originalMatch) fileUrl = originalMatch[1]

                    if (!fileUrl) {
                        let videoMatch = htmlPost.match(/<source src="([^"]+)"/i)
                        if (videoMatch) fileUrl = videoMatch[1]
                    }

                    if (!fileUrl) {
                        let imgMatch = htmlPost.match(/id="image"[^>]+src="([^"]+)"/i) || htmlPost.match(/src="([^"]+)"[^>]+id="image"/i)
                        if (imgMatch) fileUrl = imgMatch[1]
                    }

                    if (fileUrl) {
                        if (fileUrl.startsWith('//')) fileUrl = 'https:' + fileUrl
                        
                        let cleanUrl = fileUrl.split('?')[0].toLowerCase()
                        let isVideo = cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov')

                        console.log(`ID ${id}: ${isVideo ? 'VIDEO' : 'IMAGEN'} -> ${fileUrl}`)

                        if (isVideo) {
                             await client.sendMessage(m.chat, { 
                                video: { url: fileUrl },
                                mimetype: 'video/mp4',
                                caption: `🔥 *ID:* ${id}`
                             }, { quoted: m })
                        } else {
                            await client.sendMessage(m.chat, { 
                                image: { url: fileUrl }, 
                                caption: `🔥 *ID:* ${id}` 
                            }, { quoted: m })
                        }
                    }
                    
                    await new Promise(r => setTimeout(r, 1500)) 

                } catch (err) {
                    console.log(`Error al enviar ID ${id}:`, err.message)
                    continue 
                }
            }

        } catch (e) {
            console.error('Error Pack:', e)
            m.reply(`❌ *Error:* ${e.message || e}`)
        }
    }
}
