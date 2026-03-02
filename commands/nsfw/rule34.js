import fetch from 'node-fetch'

export default {
    command: ['r34', 'rule34'],
    category: 'nsfw',
    desc: 'Busca imágenes (pack) en Rule34.',

    run: async ({ client, m, text, usedPrefix, command }) => {
        
        // --- VERIFICACIÓN NSFW ---
        const chatId = m.chat
        const db = global.db
        
        if (m.isGroup && !db.data.chats[chatId]?.nsfw) {
             return m.reply('🔒 Los comandos *NSFW* están desactivados en este grupo. (◕︿◕)\n> Usa `#enable nsfw` para activarlos.')
        }

        if (!text) return m.reply(`🐲 Falta el nombre. (◕ᴗ◕✿)\n> Ejemplo: *${usedPrefix + command} lucoa*`)

        const tags = text.trim().replace(/\s+/g, '_').toLowerCase()
        m.reply('🔎 *Buscando Pack (5) en Rule34...* (◕ᴗ◕✿)')

        try {
            let posts = []

            // 1. Búsqueda directa por tag via API JSON
            posts = await r34ApiSearch(tags, 100)

            // 2. Si no hay resultados, intentar con wildcard (tag*)
            if (posts.length === 0) {
                posts = await r34ApiSearch(`${tags}*`, 100)
            }

            // 3. Si sigue sin resultados, usar autocomplete para encontrar el tag correcto
            if (posts.length === 0) {
                const suggestedTag = await r34Autocomplete(tags)
                if (suggestedTag) {
                    posts = await r34ApiSearch(suggestedTag, 100)
                }
            }

            if (posts.length === 0) {
                return m.reply(`🐲 No encontré nada para: *${tags}* (╥﹏╥)\n> Intenta usar el nombre en inglés.`)
            }

            // --- MODO PACK: 5 AL AZAR ---
            const count = 5
            const selected = posts
                .filter(p => p.file_url)
                .sort(() => 0.5 - Math.random())
                .slice(0, count)

            console.log(`[R34] Enviando pack de ${selected.length} archivos para "${tags}"`)

            for (const post of selected) {
                try {
                    let fileUrl = post.file_url
                    if (fileUrl.startsWith('//')) fileUrl = 'https:' + fileUrl

                    const cleanUrl = fileUrl.split('?')[0].toLowerCase()
                    const isVideo = cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov')

                    if (isVideo) {
                        await client.sendMessage(m.chat, {
                            video: { url: fileUrl },
                            mimetype: 'video/mp4',
                            caption: `🔥 *ID:* ${post.id}`
                        }, { quoted: m })
                    } else {
                        await client.sendMessage(m.chat, {
                            image: { url: fileUrl },
                            caption: `🔥 *ID:* ${post.id}`
                        }, { quoted: m })
                    }

                    await new Promise(r => setTimeout(r, 1500))

                } catch (err) {
                    console.log(`[R34] Error al enviar ID ${post.id}:`, err.message)
                    continue
                }
            }

        } catch (e) {
            console.error('[R34] Error Pack:', e)
            m.reply(`🐲 Error: ${e.message || e} (╥﹏╥)`)
        }
    }
}

/**
 * Busca posts en Rule34 usando la API JSON oficial.
 * @param {string} tags - Tags separados por + o _
 * @param {number} limit - Máximo de resultados (hasta 1000)
 * @returns {Promise<Array>} Array de posts
 */
async function r34ApiSearch(tags, limit = 100) {
    try {
        const url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(tags)}&limit=${limit}`
        const res = await fetch(url)
        if (!res.ok) return []
        const data = await res.json()
        // La API devuelve un array directamente o un objeto con .post
        return Array.isArray(data) ? data : (data?.post || [])
    } catch {
        return []
    }
}

/**
 * Usa el endpoint de autocomplete de Rule34 para encontrar el tag más relevante.
 * Esto resuelve el problema de que "lucoa" no coincida exactamente con "quetzalcoatl_(dragon_maid)" etc.
 * @param {string} query - Texto de búsqueda parcial
 * @returns {Promise<string|null>} El tag sugerido o null
 */
async function r34Autocomplete(query) {
    try {
        const url = `https://ac.rule34.xxx/autocomplete.php?q=${encodeURIComponent(query)}`
        const res = await fetch(url)
        if (!res.ok) return null
        const data = await res.json()
        // Devuelve array de objetos { label, value }
        if (Array.isArray(data) && data.length > 0) {
            return data[0].value || data[0].label || null
        }
        return null
    } catch {
        return null
    }
}
