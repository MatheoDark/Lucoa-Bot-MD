import fetch from 'node-fetch'
import { writeFileSync, unlinkSync, readFileSync, mkdirSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'
import os from 'os'

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

        const input = text.trim().toLowerCase()
        const words = input.split(/\s+/)
        
        // Detectar si el usuario quiere solo videos/imágenes
        const videoKeywords = ['video', 'videos', 'vid', 'mp4', 'webm', 'animated', 'animado']
        const imageKeywords = ['imagen', 'imagenes', 'img', 'image', 'images', 'pic', 'png', 'jpg']
        
        let filterType = 'all' // 'video', 'image', or 'all'
        const searchWords = []
        
        for (const word of words) {
            if (videoKeywords.includes(word)) {
                filterType = 'video'
            } else if (imageKeywords.includes(word)) {
                filterType = 'image'
            } else {
                searchWords.push(word)
            }
        }
        
        if (searchWords.length === 0) {
            // Si solo escribió "video"/"imagen" sin personaje, buscar contenido aleatorio con ese tag
            if (filterType === 'video') {
                searchWords.push('animated')
            } else if (filterType === 'image') {
                return m.reply(`🐲 Falta el nombre del personaje. (◕ᴗ◕✿)\n> Ejemplo: *${usedPrefix + command} lucoa*`)
            } else {
                return m.reply(`🐲 Falta el nombre del personaje. (◕ᴗ◕✿)\n> Ejemplo: *${usedPrefix + command} lucoa*`)
            }
        }

        const filterLabel = filterType === 'video' ? ' (Videos)' : filterType === 'image' ? ' (Imágenes)' : ''
        m.reply(`🔎 *Buscando Pack (5) en Rule34${filterLabel}...* (◕ᴗ◕✿)`)

        try {
            let posts = []

            // 1. Intentar con todos los tags juntos como un solo tag (ej: mushoku_tensei)
            const combinedTag = searchWords.join('_')

            // Si el usuario pidió videos, buscar directamente con tag "animated" en Paheal
            if (filterType === 'video') {
                posts = await pahealSearch(`${combinedTag}+animated`, 100)
                if (posts.length === 0) posts = await pahealSearch(`${combinedTag}+webm`, 100)
            }

            // Búsqueda normal (o si no encontró videos)
            if (posts.length === 0) {
                posts = await pahealSearch(combinedTag, 100)
            }

            // 2. Si no hay resultados y hay múltiples palabras, probar solo la primera
            if (posts.length === 0 && searchWords.length > 1) {
                for (const word of searchWords) {
                    posts = await pahealSearch(word, 100)
                    if (posts.length > 0) break
                }
            }

            // 3. Último recurso: scraping directo de rule34.xxx
            if (posts.length === 0) {
                posts = await r34Scrape(combinedTag)
            }
            if (posts.length === 0 && searchWords.length > 1) {
                posts = await r34Scrape(searchWords[0])
            }

            if (posts.length === 0) {
                return m.reply(`🐲 No encontré nada para: *${combinedTag}* (╥﹏╥)\n> Intenta usar el nombre en inglés.`)
            }

            // Filtrar por tipo si el usuario lo especificó
            let filtered = posts.filter(p => p.file_url)
            if (filterType === 'video') {
                // Incluir todo lo animado: video, gif, webm
                const animatedFiltered = filtered.filter(p => {
                    const t = getMediaType(p)
                    return t === 'video' || t === 'gif' || t === 'webm'
                })
                if (animatedFiltered.length > 0) {
                    // Priorizar MP4 > GIF > WebM
                    const mp4 = animatedFiltered.filter(p => getMediaType(p) === 'video')
                    if (mp4.length >= 5) filtered = mp4
                    else filtered = animatedFiltered
                } else {
                    m.reply('⚠️ No encontré videos, enviando imágenes...')
                }
            } else if (filterType === 'image') {
                const imgFiltered = filtered.filter(p => getMediaType(p) === 'image')
                if (imgFiltered.length > 0) filtered = imgFiltered
            }

            // --- MODO PACK: 5 AL AZAR ---
            const count = 5
            const selected = filtered
                .sort(() => 0.5 - Math.random())
                .slice(0, count)

            console.log(`[R34] Enviando pack de ${selected.length} archivos para "${combinedTag}" (filtro: ${filterType})`)

            for (const post of selected) {
                try {
                    let fileUrl = post.file_url
                    if (fileUrl.startsWith('//')) fileUrl = 'https:' + fileUrl

                    let mediaType = getMediaType(post)
                    
                    // Si no se pudo detectar por nombre, intentar HEAD request
                    if (mediaType === 'unknown') {
                        mediaType = await detectMediaTypeByHead(fileUrl)
                    }

                    console.log(`[R34] ID ${post.id}: ${mediaType} -> ${fileUrl}`)

                    if (mediaType === 'video') {
                        // Re-codificar MP4 para asegurar compatibilidad con WhatsApp móvil
                        try {
                            const { buffer, hasAudio } = await convertToMp4(fileUrl, post.file_name)
                            const isGif = !hasAudio
                            if (isGif) console.log(`[R34] ID ${post.id}: MP4 sin audio → enviando como GIF`)
                            await client.sendMessage(m.chat, {
                                video: buffer,
                                mimetype: 'video/mp4',
                                ...(isGif ? { gifPlayback: true } : {}),
                                caption: `🔥 *ID:* ${post.id}`
                            }, { quoted: m })
                        } catch (convErr) {
                            console.log(`[R34] Error re-codificando MP4 ${post.id}:`, convErr.message)
                            // Fallback: enviar directo
                            await client.sendMessage(m.chat, {
                                video: { url: fileUrl },
                                mimetype: 'video/mp4',
                                caption: `🔥 *ID:* ${post.id}`
                            }, { quoted: m })
                        }
                    } else if (mediaType === 'webm') {
                        // Convertir WebM a MP4 con ffmpeg para que funcione en móvil
                        try {
                            const { buffer, hasAudio } = await convertToMp4(fileUrl, post.file_name)
                            const isGif = !hasAudio
                            if (isGif) console.log(`[R34] ID ${post.id}: WebM sin audio → enviando como GIF`)
                            await client.sendMessage(m.chat, {
                                video: buffer,
                                mimetype: 'video/mp4',
                                ...(isGif ? { gifPlayback: true } : {}),
                                caption: `🔥 *ID:* ${post.id}`
                            }, { quoted: m })
                        } catch (convErr) {
                            console.log(`[R34] Error convirtiendo WebM ${post.id}:`, convErr.message)
                            // Fallback: enviar como video directo
                            await client.sendMessage(m.chat, {
                                video: { url: fileUrl },
                                mimetype: 'video/mp4',
                                caption: `🔥 *ID:* ${post.id}`
                            }, { quoted: m })
                        }
                    } else if (mediaType === 'gif') {
                        // WhatsApp NO soporta GIFs nativos — siempre se envían como MP4 con gifPlayback: true
                        // Baileys no convierte formatos, así que hay que convertir GIF → MP4 con ffmpeg
                        try {
                            const { buffer } = await convertToMp4(fileUrl, post.file_name)
                            await client.sendMessage(m.chat, {
                                video: buffer,
                                gifPlayback: true,
                                caption: `🔥 *ID:* ${post.id}`
                            }, { quoted: m })
                        } catch (convErr) {
                            console.log(`[R34] Error convirtiendo GIF ${post.id}:`, convErr.message)
                            // Fallback: enviar como imagen estática
                            await client.sendMessage(m.chat, {
                                image: { url: fileUrl },
                                caption: `🔥 *ID:* ${post.id} (GIF)`
                            }, { quoted: m })
                        }
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
 * Busca posts en Rule34 Paheal (rule34.paheal.net) - API funcional sin autenticación.
 * Devuelve un array de objetos { id, file_url, file_name, tags }.
 */
async function pahealSearch(tag, limit = 100) {
    try {
        // Escapar cada tag individualmente pero mantener el + como separador de tags
        const encodedTag = tag.split('+').map(t => encodeURIComponent(t)).join('+')
        const url = `https://rule34.paheal.net/api/danbooru/find_posts?tags=${encodedTag}&limit=${limit}`
        const res = await fetch(url)
        if (!res.ok) return []
        const xml = await res.text()
        
        // Parsear XML manualmente (lightweight, sin dependencias)
        const posts = []
        const tagRegex = /<tag\s+([^>]+)>/g
        let match
        while ((match = tagRegex.exec(xml)) !== null) {
            const attrs = match[1]
            const id = getAttr(attrs, 'id')
            const file_url = getAttr(attrs, 'file_url')
            const file_name = getAttr(attrs, 'file_name')
            const tags = getAttr(attrs, 'tags')
            if (file_url) {
                posts.push({ id, file_url, file_name: file_name || '', tags })
            }
        }
        return posts
    } catch {
        return []
    }
}

/**
 * Detecta el tipo de media a partir del file_name y file_url.
 * Retorna: 'video', 'gif', 'image', o 'unknown'
 */
function getMediaType(post) {
    // Obtener extensión del file_name (más confiable)
    const name = (post.file_name || '').toLowerCase()
    const url = (post.file_url || '').toLowerCase()
    
    // Extraer extensión del nombre de archivo (buscar .ext en cualquier posición)
    const extMatch = name.match(/\.(mp4|webm|mov|avi|gif|jpg|jpeg|png|webp|bmp|svg)(?:\s|\?|$|[^a-z])/i)
    const ext = extMatch ? extMatch[1].toLowerCase() : null
    
    // También verificar la URL por si tiene extensión
    const urlExtMatch = url.match(/\.(mp4|webm|mov|avi|gif|jpg|jpeg|png|webp|bmp|svg)(?:\?|$)/i)
    const urlExt = urlExtMatch ? urlExtMatch[1].toLowerCase() : null
    
    const finalExt = ext || urlExt
    
    if (!finalExt) return 'unknown'
    if (['mp4', 'mov', 'avi'].includes(finalExt)) return 'video'
    if (finalExt === 'webm') return 'webm'
    if (finalExt === 'gif') return 'gif'
    return 'image'
}

/**
 * Detecta el tipo de media mediante un HEAD request (fallback cuando no hay extensión).
 */
async function detectMediaTypeByHead(url) {
    try {
        const res = await fetch(url, { method: 'HEAD', timeout: 5000 })
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('video')) return 'video'
        if (contentType.includes('gif')) return 'gif'
        if (contentType.includes('image')) return 'image'
        return 'image' // default to image
    } catch (e) {
        return 'image' // default to image on error
    }
}

/**
 * Descarga un WebM/GIF y lo convierte a MP4 compatible con WhatsApp móvil.
 * Retorna un Buffer del MP4 resultante.
 */
async function convertToMp4(url, originalName = '') {
    const tmpDir = join(os.tmpdir(), 'r34_convert')
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })
    
    const id = Date.now() + '_' + Math.random().toString(36).slice(2)
    
    // Detectar extensión del archivo original
    const nameLC = originalName.toLowerCase()
    let inputExt = 'webm'
    if (nameLC.includes('.gif')) inputExt = 'gif'
    else if (nameLC.includes('.webm')) inputExt = 'webm'
    else if (nameLC.includes('.mp4')) inputExt = 'mp4'
    
    const inputPath = join(tmpDir, `${id}_in.${inputExt}`)
    const outputPath = join(tmpDir, `${id}_out.mp4`)
    
    try {
        // Descargar el archivo
        const res = await fetch(url)
        const dlBuffer = Buffer.from(await res.arrayBuffer())
        writeFileSync(inputPath, dlBuffer)
        
        // Detectar si el archivo tiene audio con ffprobe
        let hasAudio = false
        if (inputExt !== 'gif') {
            try {
                const probeOut = execSync(
                    `ffprobe -v quiet -select_streams a -show_entries stream=codec_type -of csv=p=0 "${inputPath}"`,
                    { timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
                ).toString().trim()
                hasAudio = probeOut.includes('audio')
            } catch (e) { hasAudio = false }
        }
        
        // Convertir con ffmpeg - compatible con WhatsApp móvil:
        // - yuv420p: formato de pixel requerido por WhatsApp
        // - scale filter: asegura dimensiones pares (requisito H.264)
        // - an: sin audio si es GIF o si el archivo no tiene audio
        // - ignore_loop 0: para GIFs, lee todos los frames sin loop infinito
        const noAudio = inputExt === 'gif' || !hasAudio
        const audioFlags = noAudio ? '-an' : '-c:a aac -b:a 128k'
        const inputFlags = inputExt === 'gif' ? '-ignore_loop 0' : ''
        const cmd = `ffmpeg -y ${inputFlags} -i "${inputPath}" -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 28 ${audioFlags} -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -movflags +faststart "${outputPath}"`
        
        execSync(cmd, {
            timeout: 300000,
            stdio: 'pipe'
        })
        
        const mp4Buffer = readFileSync(outputPath)
        return { buffer: mp4Buffer, hasAudio }
    } finally {
        // Limpiar archivos temporales
        try { unlinkSync(inputPath) } catch (e) {}
        try { unlinkSync(outputPath) } catch (e) {}
    }
}

/**
 * Último recurso: scrapea rule34.xxx directamente (HTML).
 * Puede fallar si Cloudflare bloquea, pero a veces funciona.
 */
async function r34Scrape(tag) {
    try {
        const import_https = await import('https')
        const agent = new import_https.default.Agent({ rejectUnauthorized: false, keepAlive: true, family: 4 })
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': 'resize-notification=1'
        }

        const searchUrl = `https://rule34.xxx/index.php?page=post&s=list&tags=${encodeURIComponent(tag)}`
        let res = await fetch(searchUrl, { agent, headers })
        let html = await res.text()

        // Verificar si Cloudflare bloqueó
        if (html.includes('Just a moment') || html.includes('challenge-platform')) return []

        let idMatch = html.match(/index\.php\?page=post&s=view&id=(\d+)/g)
        if (!idMatch || idMatch.length === 0) return []

        let ids = idMatch.map(link => link.match(/id=(\d+)/)[1])
        ids = [...new Set(ids)]
        if (ids.length === 0) return []

        const posts = []
        // Obtener URLs de los posts individuales (máx 10 para no sobrecargar)
        const selectedIds = ids.sort(() => 0.5 - Math.random()).slice(0, 10)

        for (const id of selectedIds) {
            try {
                const postUrl = `https://rule34.xxx/index.php?page=post&s=view&id=${id}`
                const resPost = await fetch(postUrl, { agent, headers })
                const htmlPost = await resPost.text()
                let fileUrl = null
                let fileName = ''

                // Intentar extraer URL original
                const originalMatch = htmlPost.match(/href="([^"]+)">Original image/i)
                if (originalMatch) fileUrl = originalMatch[1]

                if (!fileUrl) {
                    const videoMatch = htmlPost.match(/<source src="([^"]+)"/i)
                    if (videoMatch) fileUrl = videoMatch[1]
                }

                if (!fileUrl) {
                    const imgMatch = htmlPost.match(/id="image"[^>]+src="([^"]+)"/i) || htmlPost.match(/src="([^"]+)"[^>]+id="image"/i)
                    if (imgMatch) fileUrl = imgMatch[1]
                }

                if (fileUrl) {
                    if (fileUrl.startsWith('//')) fileUrl = 'https:' + fileUrl
                    fileName = fileUrl.split('/').pop() || ''
                    posts.push({ id, file_url: fileUrl, file_name: fileName, tags: '' })
                }
            } catch (e) {
                continue
            }
        }

        return posts
    } catch (e) {
        return []
    }
}

/** Extrae un atributo de un string de atributos XML */
function getAttr(attrs, name) {
    const m = attrs.match(new RegExp(`${name}='([^']*)'`))
    if (m) return m[1]
    const m2 = attrs.match(new RegExp(`${name}="([^"]*)"`))
    return m2 ? m2[1] : null
}
