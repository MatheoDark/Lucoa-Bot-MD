import fetch from 'node-fetch'
import https from 'https'

const agent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    family: 4,
    timeout: 30000
})

// ✅ NUEVO: Helper para obtener tamaño de archivo sin descargarlo
const getFileSizeKB = async (url) => {
    try {
        const res = await fetch(url, { method: 'HEAD', agent, timeout: 10000 })
        const size = parseInt(res.headers.get('content-length') || '0')
        return Math.round(size / 1024) // Convertir a KB
    } catch {
        return 0
    }
}

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

        m.reply('🔍 *Buscando Pack (5) en Rule34...*')

        try {
            const searchUrl = `https://rule34.xxx/index.php?page=post&s=list&tags=${text}`
            
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

            const MAX_VIDEO_SIZE_MB = 15 // Máximo 15MB por video
            const MAX_IMAGE_SIZE_MB = 5  // Máximo 5MB por imagen
            let enviados = 0

            for (let id of selectedIds) {
                try {
                    let postUrl = `https://rule34.xxx/index.php?page=post&s=view&id=${id}`
                    
                    // ✅ Reintentos con backoff
                    let resPost, htmlPost
                    let intentos = 3
                    while (intentos > 0) {
                        try {
                            resPost = await fetch(postUrl, { agent, headers, timeout: 20000 })
                            htmlPost = await resPost.text()
                            break
                        } catch (err) {
                            intentos--
                            if (intentos > 0) {
                                console.warn(`⚠️ Reintentando ID ${id} (${intentos} intentos restantes)...`)
                                await new Promise(r => setTimeout(r, 2000 * (4 - intentos))) // 2s, 4s
                            }
                        }
                    }
                    
                    if (!htmlPost) {
                        console.log(`❌ No se pudo obtener ID ${id} después de reintentos`)
                        continue
                    }

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

                        // ✅ NUEVO: Validar tamaño ANTES de enviar
                        const sizeKB = await getFileSizeKB(fileUrl)
                        const maxSize = isVideo ? MAX_VIDEO_SIZE_MB * 1024 : MAX_IMAGE_SIZE_MB * 1024

                        if (sizeKB > maxSize) {
                            console.log(`⚠️ ID ${id}: ${isVideo ? 'VIDEO' : 'IMAGEN'} demasiado grande (${Math.round(sizeKB / 1024)}MB > límite) - SALTANDO`)
                            continue
                        }

                        console.log(`ID ${id}: ${isVideo ? 'VIDEO' : 'IMAGEN'} -> ${Math.round(sizeKB / 1024)}MB`)

                        if (isVideo) {
                             await client.sendMessage(m.chat, { 
                                video: { url: fileUrl }, 
                                caption: `🔥 *ID:* ${id}`,
                                gifPlayback: false 
                             }, { quoted: m })
                             enviados++
                        } else {
                            await client.sendMessage(m.chat, { 
                                image: { url: fileUrl }, 
                                caption: `🔥 *ID:* ${id}` 
                            }, { quoted: m })
                            enviados++
                        }
                    }
                    
                    // ✅ AUMENTADO: Delay entre envíos para evitar desconexión
                    // WhatsApp requiere ~3-4s entre mensajes para no saturar
                    await new Promise(r => setTimeout(r, 4000))

                } catch (err) {
                    console.log(`❌ Error al enviar ID ${id}:`, err.message)
                    continue 
                }
            }

            // ✅ NUEVO: Confirmación de cuántos se enviaron
            if (enviados === 0) {
                m.reply('❌ No se pudo enviar ningún archivo (todos fueron rechazados por tamaño)')
            } else if (enviados < count) {
                m.reply(`✅ Enviados ${enviados}/${count} archivos (${count - enviados} rechazados por tamaño)`)
            }

        } catch (e) {
            console.error('Error Pack:', e)
            m.reply(`❌ *Error:* ${e.message || e}`)
        }
    }
}
