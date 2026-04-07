import fetch from 'node-fetch'
import { writeFileSync, unlinkSync, readFileSync, mkdirSync, existsSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import os from 'os'

const execAsync = promisify(exec)
const r34RecentByQuery = globalThis.__r34RecentByQuery || new Map()
globalThis.__r34RecentByQuery = r34RecentByQuery

function buildRecentKey(chatId, tag, filterType) {
    return `${chatId}|${tag}|${filterType}`
}

function getPostUniqueId(post) {
    const id = String(post?.id || '')
    const url = String(post?.file_url || '').trim().toLowerCase()
    return `${id}|${url}`
}

function mergeUniquePosts(base = [], incoming = []) {
    const map = new Map(base.map(p => [getPostUniqueId(p), p]))
    for (const post of incoming) {
        map.set(getPostUniqueId(post), post)
    }
    return Array.from(map.values())
}

function selectWithoutRecentRepeats(chatId, tag, filterType, posts, count = 5) {
    const key = buildRecentKey(chatId, tag, filterType)
    const uniqueMap = new Map()
    for (const post of posts) {
        const uid = getPostUniqueId(post)
        if (!uniqueMap.has(uid)) uniqueMap.set(uid, post)
    }

    const uniqueIds = Array.from(uniqueMap.keys())
    if (!uniqueIds.length) return { selected: [], recycled: false }

    let state = r34RecentByQuery.get(key)
    if (!state || !Array.isArray(state.recentIds)) {
        state = { recentIds: [] }
    }

    const maxTake = Math.min(count, uniqueIds.length)
    const recentWindow = Math.max(maxTake * 4, 12)
    const recentSet = new Set(state.recentIds)

    // 1) Priorizar IDs que no se hayan enviado recientemente.
    let candidateIds = uniqueIds.filter(uid => !recentSet.has(uid))
    let recycled = false

    // 2) Si el pool es pequeño, permitir reciclaje gradual (evita quedarse sin resultados).
    if (candidateIds.length < maxTake) {
        recycled = true
        const missing = maxTake - candidateIds.length
        const fallbackIds = uniqueIds.filter(uid => recentSet.has(uid)).slice(0, missing)
        candidateIds = candidateIds.concat(fallbackIds)
    }

    // 3) Barajar candidatos y tomar un pack sin repetidos.
    const shuffled = candidateIds.slice().sort(() => 0.5 - Math.random())
    const selectedIds = shuffled.slice(0, maxTake)
    const selected = selectedIds.map(uid => uniqueMap.get(uid)).filter(Boolean)

    // 4) Guardar historial reciente para bloquear repeticiones inmediatas.
    const nextRecent = state.recentIds.concat(selectedIds)
    state.recentIds = nextRecent.slice(-recentWindow)

    r34RecentByQuery.set(key, state)
    return { selected, recycled }
}

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

        let input = text.trim().toLowerCase()
        
        // Intentar corregir typos en el tag principal (primera palabra)
        const firstWord = input.split(/\s+/)[0]
        const corrected = correctTagTypo(firstWord)
        if (corrected) {
            input = input.replace(firstWord, corrected.tag)
            console.log(`[R34 Typo Correction] "${firstWord}" → "${corrected.tag}" (${corrected.similarity}% similitud)`)
        }
        
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

            // Si el usuario pidió videos, combinar varias consultas/fuentes para ampliar pool y reducir repetición.
            if (filterType === 'video') {
                const videoQueries = [
                    `${combinedTag}+animated`,
                    `${combinedTag}+webm`,
                    `${combinedTag}+mp4`,
                    combinedTag
                ]

                const pages = [1, 2, 3, 4]

                for (const q of videoQueries) {
                    for (const page of pages) {
                        const found = await pahealSearch(q, 100, page)
                        posts = mergeUniquePosts(posts, found)
                    }
                }

                // Fuente extra: Rule34 DAPI (suele traer items distintos a Paheal)
                const dapiQueries = [
                    `${combinedTag} animated`,
                    `${combinedTag} webm`,
                    `${combinedTag} video`,
                    combinedTag.replace(/_/g, ' ')
                ]
                const dapiPages = [0, 1, 2, 3]
                for (const q of dapiQueries) {
                    for (const pid of dapiPages) {
                        const found = await r34ApiSearch(q, 100, pid)
                        posts = mergeUniquePosts(posts, found)
                    }
                }
            }

            // Búsqueda normal (o si no encontró videos)
            if (posts.length === 0) {
                posts = await pahealSearch(combinedTag, 100, 1)
            }

            // 2. Si no hay resultados (o hay pocos animados), ampliar con variantes
            // que conserven TODOS los tags solicitados (sin abrir a palabras sueltas).
            let shouldExpandStrict = posts.length === 0
            if (filterType === 'video' && posts.length > 0) {
                const currentAnimatedCount = posts.filter(p => {
                    const t = getMediaType(p)
                    return t === 'video' || t === 'gif' || t === 'webm'
                }).length
                if (currentAnimatedCount < 25) shouldExpandStrict = true
            }

            if (shouldExpandStrict && searchWords.length > 1) {
                const plusTag = searchWords.join('+')
                const spaceTag = searchWords.join(' ')

                if (filterType === 'video') {
                    const pahealStrictQueries = [
                        `${plusTag}+animated`,
                        `${plusTag}+webm`,
                        `${plusTag}+mp4`,
                        plusTag
                    ]

                    for (const q of pahealStrictQueries) {
                        for (const page of [1, 2, 3, 4, 5, 6]) {
                            const found = await pahealSearch(q, 100, page)
                            posts = mergeUniquePosts(posts, found)
                        }
                    }

                    const dapiStrictQueries = [
                        `${spaceTag} animated`,
                        `${spaceTag} webm`,
                        `${spaceTag} video`,
                        spaceTag
                    ]

                    for (const q of dapiStrictQueries) {
                        for (const pid of [0, 1, 2, 3, 4, 5]) {
                            const found = await r34ApiSearch(q, 100, pid)
                            posts = mergeUniquePosts(posts, found)
                        }
                    }
                } else {
                    const strictFound = await pahealSearch(plusTag, 100, 1)
                    posts = mergeUniquePosts(posts, strictFound)
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
                    // Mantener variedad real de formato (mp4/gif/webm) para no repetir siempre lo mismo.
                    filtered = animatedFiltered
                } else {
                    return m.reply('⚠️ No encontré videos para esos tags exactos. Prueba con otro tag o quita una palabra.')
                }
            } else if (filterType === 'image') {
                const imgFiltered = filtered.filter(p => getMediaType(p) === 'image')
                if (imgFiltered.length > 0) filtered = imgFiltered
            }

            // --- MODO PACK: 5 AL AZAR ---
            const count = 5
            const { selected, recycled } = selectWithoutRecentRepeats(chatId, combinedTag, filterType, filtered, count)

            if (recycled) {
                await m.reply('ℹ️ Ya se enviaron todos los resultados recientes de esa búsqueda. Reinicié la lista para seguir mostrando contenido.')
            }

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
async function pahealSearch(tag, limit = 100, page = 1) {
    try {
        // Escapar cada tag individualmente pero mantener el + como separador de tags
        const encodedTag = tag.split('+').map(t => encodeURIComponent(t)).join('+')
        const pageParam = Number.isInteger(page) && page > 1 ? `&page=${page}` : ''
        const url = `https://rule34.paheal.net/api/danbooru/find_posts?tags=${encodedTag}&limit=${limit}${pageParam}`
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
 * Busca posts en Rule34.xxx DAPI (fuente extra para ampliar variedad).
 * Devuelve un array de objetos { id, file_url, file_name, tags }.
 */
async function r34ApiSearch(tag, limit = 100, pid = 0) {
    try {
        const encodedTag = encodeURIComponent(tag.trim().replace(/\s+/g, ' '))
        const safePid = Number.isInteger(pid) && pid >= 0 ? pid : 0
        const url = `https://rule34.xxx/index.php?page=dapi&s=post&q=index&tags=${encodedTag}&limit=${limit}&pid=${safePid}`
        const res = await fetch(url)
        if (!res.ok) return []
        const xml = await res.text()

        const posts = []
        const tagRegex = /<post\s+([^>]+?)\s*\/?>(?:<\/post>)?/g
        let match
        while ((match = tagRegex.exec(xml)) !== null) {
            const attrs = match[1]
            const id = getAttr(attrs, 'id')
            const file_url = getAttr(attrs, 'file_url')
            const sample_url = getAttr(attrs, 'sample_url')
            const preview_url = getAttr(attrs, 'preview_url')
            const tags = getAttr(attrs, 'tags') || ''
            const chosen = file_url || sample_url || preview_url
            if (!chosen) continue
            const fileName = chosen.split('/').pop() || ''
            posts.push({ id, file_url: chosen, file_name: fileName, tags })
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
        
        // Detectar si el archivo tiene audio con ffprobe (async para no bloquear event loop)
        let hasAudio = false
        if (inputExt !== 'gif') {
            try {
                const { stdout } = await execAsync(
                    `ffprobe -v quiet -select_streams a -show_entries stream=codec_type -of csv=p=0 "${inputPath}"`,
                    { timeout: 10000 }
                )
                hasAudio = stdout.trim().includes('audio')
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

        // Perfil de seguridad para GIFs muy grandes o con timings raros (evita conversiones de varios minutos).
        const durationLimit = inputExt === 'gif' ? '-t 20' : ''
        const fpsFilter = inputExt === 'gif' ? 'fps=20,' : ''
        const scaleFilter = "scale='if(gt(iw,960),960,iw)':-2:flags=lanczos,scale=trunc(iw/2)*2:trunc(ih/2)*2"
        const vf = `${fpsFilter}${scaleFilter}`

        const cmd = `ffmpeg -y ${inputFlags} ${durationLimit} -i "${inputPath}" -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 30 ${audioFlags} -vf "${vf}" -movflags +faststart "${outputPath}"`

        await execAsync(cmd, {
            timeout: 120000
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

/**
 * Calcula la distancia de Levenshtein entre dos strings (similitud).
 * Menor distancia = más similitud
 */
function levenshteinDistance(a, b) {
    const matrix = []
    for (let i = 0; i <= b.length; i++) matrix[i] = [i]
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,  // substitución
                    matrix[i][j - 1] + 1,      // inserción
                    matrix[i - 1][j] + 1       // eliminación
                )
            }
        }
    }
    return matrix[b.length][a.length]
}

/**
 * Calcula porcentaje de similitud (0-100%) entre dos strings.
 */
function stringSimilarity(a, b) {
    const maxLen = Math.max(a.length, b.length)
    if (maxLen === 0) return 100
    const distance = levenshteinDistance(a, b)
    return Math.round(((maxLen - distance) / maxLen) * 100)
}

/**
 * Diccionario de tags populares para corrección de typos.
 * Incluye personajes y series más buscados.
 */
const POPULAR_TAGS = [
    // Personajes populares
    'lucoa', 'makima', 'yennefer', 'triss', 'ciri', 'jinx', 'katarina',
    'asuna', 'zelda', 'naruto', 'hinata', 'sakura', 'ino', 'tenten',
    'mitsuri', 'nezuko', 'rem', 'emilia', 'subaru',
    'tohru', 'kobayashi', 'kanna', 'quetzalcoatl', 'fafnir', 'lucifer',
    'shinobu', 'tanjiro', 'angel_devil', 'power', 'himeno',
    'aki_hayakawa', 'kobeni', 'denji', 'aqua', 'megumin',
    'darkness', 'lalatina', 'eris',
    // Videojuegos
    'samus', 'peach', 'daisy', 'rosalina', 'pauline', 'lara_croft',
    'jill', 'ada', 'chun_li', 'cammy', 'juri',
    // Otros personajes
    'mercy', 'dva', 'symmetra', 'pharah', 'tracer', 'lara', 'tomb_raider',
    'elf', 'succubus', 'fox_girl', 'catgirl', 'maid', 'nurse'
]

/**
 * Intenta corregir un tag más frecuente de popularTags.
 * Retorna { tag: corregido, similarity: % } o null.
 */
function correctTagTypo(input) {
    let bestMatch = null
    let bestSimilarity = 0
    
    for (const tag of POPULAR_TAGS) {
        const similarity = stringSimilarity(input, tag)
        // Solo considerar si tiene al menos 60% de similitud
        if (similarity > bestSimilarity && similarity >= 60) {
            bestSimilarity = similarity
            bestMatch = tag
        }
    }
    
    // Si la similitud es >= 85%, corregir automáticamente
    if (bestMatch && bestSimilarity >= 85) {
        return { tag: bestMatch, similarity: bestSimilarity }
    }
    
    return null
}
