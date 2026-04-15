import fs from 'fs';
import {v4 as uuidv4} from 'uuid';
import fetch from 'node-fetch';
import sharp from 'sharp';

const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|webp)$/i
const STATS_FILE = './lib/rw-stats.json'
const TIMEOUT_CONFIG = {
  small: 8000,    // < 500KB
  medium: 12000,  // 500KB - 3MB
  large: 20000    // > 3MB
}

// ⚡ ESTADÍSTICAS
const loadStats = () => {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'))
    }
  } catch (e) {
    console.log(`[RW-Stats] Error cargando: ${e.message}`)
  }
  return {}
}

const saveStats = (stats) => {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2))
  } catch (e) {
    console.log(`[RW-Stats] Error guardando: ${e.message}`)
  }
}

const updateStats = (personajeName, success, imageSize = 0) => {
  const stats = loadStats()
  if (!stats[personajeName]) {
    stats[personajeName] = {
      rolls: 0,
      successfulImages: 0,
      failedImages: 0,
      totalDataDownloaded: 0,
      lastRoll: null,
      lastSuccess: null
    }
  }
  
  stats[personajeName].rolls++
  if (success) {
    stats[personajeName].successfulImages++
    stats[personajeName].lastSuccess = new Date().toISOString()
    stats[personajeName].totalDataDownloaded += imageSize
  } else {
    stats[personajeName].failedImages++
  }
  stats[personajeName].lastRoll = new Date().toISOString()
  
  saveStats(stats)
  return stats[personajeName]
}

const getAdaptiveTimeout = (estimatedSize = 0) => {
  if (estimatedSize > 3 * 1024 * 1024) return TIMEOUT_CONFIG.large
  if (estimatedSize > 500 * 1024) return TIMEOUT_CONFIG.medium
  return TIMEOUT_CONFIG.small
}

const normalizeTag = (value = '') => String(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')  // Elimina acentos
  .replace(/[():'".]/g, ' ')         // Elimina caracteres especiales
  .replace(/\s+/g, '_')              // Espacios a guiones bajos
  .replace(/_+/g, '_')               // Guiones bajos duplicados
  .replace(/^_+|_+$/g, '')           // Guiones al inicio/final
  // ✨ NUEVO: Manejo de caracteres similares
  .replace(/[áàäâ]/g, 'a')
  .replace(/[éèëê]/g, 'e')
  .replace(/[íìïî]/g, 'i')
  .replace(/[óòöô]/g, 'o')
  .replace(/[úùüû]/g, 'u')
  .replace(/ñ/g, 'n')

const buildTagCandidates = (personaje = {}) => {
  const raw = [
    // 1. Keyword exacto (si existe) - máxima prioridad
    personaje.keyword,
    
    // 1b. Variantes cercanas del keyword
    personaje.keyword ? personaje.keyword.replace(/\(/g, '_').replace(/\)/g, '_').replace(/__+/g, '_') : null,
    personaje.keyword ? personaje.keyword.replace(/_\([^)]*\)$/, '') : null,
    
    // 2. Nombre + Fuente (variantes con y sin guiones)
    personaje.name && personaje.source ? `${personaje.name} (${personaje.source})` : null,
    personaje.name && personaje.source ? `${personaje.name.toLowerCase()} ${personaje.source.toLowerCase()}` : null,
    personaje.name && personaje.source ? `${personaje.name.toLowerCase()}_${personaje.source.toLowerCase()}` : null,
    
    // 3. Nombre con palabras clave de la fuente (variantes)
    personaje.name && personaje.source ? 
      `${personaje.name} ${personaje.source.split(' ').slice(0, 2).join(' ')}` : null,
    personaje.name && personaje.source ? 
      `${personaje.name.toLowerCase()}_${personaje.source.toLowerCase().split(' ')[0]}` : null,
    
    // 4. Solo nombre (variantes)
    personaje.name,
    personaje.name ? personaje.name.toLowerCase() : null,
    personaje.name ? personaje.name.replace(/\s/g, '_') : null,
    
    // 5. Primera palabra del nombre + fuente completa (variantes)
    personaje.name && personaje.source ? 
      `${personaje.name.split(' ')[0]} ${personaje.source}` : null,
    personaje.name && personaje.source ? 
      `${personaje.name.split(' ')[0].toLowerCase()}_${personaje.source.toLowerCase()}` : null,
    
    // 6. Primera palabra de nombre + primera palabra de fuente (muy específico)
    personaje.name && personaje.source ? 
      `${personaje.name.split(' ')[0]} ${personaje.source.split(' ')[0]}` : null,
    personaje.name && personaje.source ? 
      `${personaje.name.split(' ')[0].toLowerCase()}_${personaje.source.split(' ')[0].toLowerCase()}` : null,
  ].filter(Boolean)

  const set = new Set()
  for (const entry of raw) {
    const base = normalizeTag(entry)
    if (base && base.length > 0) {
      set.add(base)

      // Variante sin sufijos entre paréntesis
      const noSuffix = base.replace(/_\([^)]*\)$/g, '')
      if (noSuffix && noSuffix !== base) set.add(noSuffix)

      // Variante con espacios
      const spaced = base.replace(/_/g, ' ')
      if (spaced && spaced !== base) set.add(spaced)
    }
  }

  return [...set]
}

const getJsonSafe = async (url) => {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const pickRandomImageUrl = (posts = [], mapper) => {
  const valid = posts
    .map(mapper)
    .filter(Boolean)
    .filter((url) => IMAGE_EXT_REGEX.test(url))

  if (!valid.length) return null
  return valid[Math.floor(Math.random() * valid.length)]
}

const normalizeImage = async (buffer) => {
  try {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      console.log(`[RW] ⚠️ Buffer inválido`)
      return buffer
    }
    
    // Validar que sea realmente imagen
    const header = buffer.slice(0, 4)
    const isPNG = header[0] === 0x89 && header[1] === 0x50
    const isJPEG = header[0] === 0xFF && header[1] === 0xD8
    const isGIF = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46
    const isWebP = buffer.slice(0, 4).toString() === 'RIFF'
    
    if (!isPNG && !isJPEG && !isGIF && !isWebP) {
      console.log(`[RW] ⚠️ Buffer no reconocido como imagen válida`)
      console.log(`[RW] Headers: ${header.toString('hex')}`)
      return null  // Retornar null para indicar error
    }
    
    console.log(`[RW] Buffer validado (PNG: ${isPNG}, JPEG: ${isJPEG}, GIF: ${isGIF}, WebP: ${isWebP})`)
    console.log(`[RW] Normalizando con Sharp...`)
    
    const result = await sharp(buffer, { failOnError: false })
      .rotate()
      .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
      .toFormat('jpeg', { quality: 85 })
      .toBuffer()
    
    console.log(`[RW] ✅ Sharp exitoso: ${buffer.length} → ${result.length} bytes`)
    return result
  } catch (e) {
    console.warn(`[RW] ⚠️ Sharp error: ${e.message}`)
    return null
  }
}

const obtenerImagenGelbooru = async (personaje) => {
  // ✅ OPCIÓN 1: Si existe URL manual, usarla directamente
  if (personaje.imageUrl) {
    console.log(`[RW] ✅ Usando URL manual: ${personaje.name}`)
    return personaje.imageUrl
  }

  // OPCIÓN 2: Búsqueda automática mediante APIs
  const tags = buildTagCandidates(personaje)
  if (!tags.length) return null

  const buscarEnApis = async (consulta) => {
    const tag = encodeURIComponent(consulta)

    // 1. API Proxy Delirius
    try {
      const data = await getJsonSafe(`https://api.delirius.store/search/gelbooru?query=${tag}`)
      const posts = Array.isArray(data?.data) ? data.data : []
      if (posts.length > 0) {
        const url = pickRandomImageUrl(posts, (p) => p?.image || null)
        if (url) return { url, source: 'Delirius' }
      }
    } catch (e) {
      // silencio
    }

    // 2. SafeBooru directo
    try {
      const data = await getJsonSafe(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
      const posts = Array.isArray(data) ? data : (data?.post || [])
      if (posts.length > 0) {
        const url = pickRandomImageUrl(posts, (p) => {
          if (p?.file_url) return p.file_url.startsWith('http') ? p.file_url : `https://safebooru.org${p.file_url}`
          if (p?.directory && p?.image) return `https://safebooru.org/images/${p.directory}/${p.image}`
          return null
        })
        if (url) return { url, source: 'SafeBooru' }
      }
    } catch (e) {
      // silencio
    }

    // 3. Konachan (Booru japonés)
    try {
      const data = await getJsonSafe(`https://konachan.com/post.json?tags=${tag}&limit=50`)
      const posts = Array.isArray(data) ? data : []
      if (posts.length > 0) {
        const url = pickRandomImageUrl(posts, (p) => p?.file_url || p?.sample_url || null)
        if (url) return { url, source: 'Konachan' }
      }
    } catch (e) {
      // silencio
    }

    // 4. Yande.re (Booru premium japonés)
    try {
      const data = await getJsonSafe(`https://yande.re/post.json?tags=${tag}&limit=50`)
      const posts = Array.isArray(data) ? data : []
      if (posts.length > 0) {
        const url = pickRandomImageUrl(posts, (p) => p?.file_url || p?.sample_url || null)
        if (url) return { url, source: 'Yande.re' }
      }
    } catch (e) {
      // silencio
    }

    // 5. Gelbooru directo
    try {
      const data = await getJsonSafe(`https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
      const posts = Array.isArray(data) ? data : (data?.post || [])
      if (posts.length > 0) {
        const url = pickRandomImageUrl(posts, (p) => p?.file_url || p?.source || null)
        if (url) return { url, source: 'Gelbooru' }
      }
    } catch (e) {
      // silencio
    }

    // 6. Rule34.xxx (Diversidad de contenido)
    try {
      const data = await getJsonSafe(`https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
      const posts = Array.isArray(data) ? data : (data?.post || [])
      if (posts.length > 0) {
        const url = pickRandomImageUrl(posts, (p) => p?.file_url || null)
        if (url) return { url, source: 'Rule34' }
      }
    } catch (e) {
      // silencio
    }

    return null
  }

  for (const currentTag of tags) {
    const exact = await buscarEnApis(currentTag)
    if (exact?.url) {
      console.log(`[RW] ✅ Encontrado exacto: ${currentTag} (${exact.source})`)
      return exact.url
    }
  }

  const fuente = personaje.source?.trim()
  if (fuente && fuente.length > 2) {
    const consultasFuente = [
      fuente,
      fuente.split(' ')[0],
    ].filter(Boolean)

    for (const consulta of consultasFuente) {
      const resultado = await buscarEnApis(consulta)
      if (resultado?.url) {
        console.log(`[RW] ✅ Encontrado por fuente: ${consulta} (${resultado.source})`)
        return resultado.url
      }
    }
  }

  console.log(`[RW] ⚠️ No se encontró imagen ni por personaje ni por fuente para ${personaje.name}`)
  return null
}

const obtenerPersonajes = () => {
  try {
    const contenido = fs.readFileSync('./lib/characters.json', 'utf-8')
    return JSON.parse(contenido)
  } catch (error) {
    return []
  }
}

const reservarPersonaje = (chatId, userId, personaje, db) => {
  if (!db.chats[chatId].personajesReservados) db.chats[chatId].personajesReservados = []
  db.chats[chatId].personajesReservados.push({ userId, ...personaje })
}

const msToTime = (duration) => {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
}

export default {
  command: ['rollwaifu', 'roll', 'rw', 'rf'],
  category: 'gacha',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const userId = m.sender
    const chat = db.chats[chatId] || {}
    
    // --- MODELO HÍBRIDO ---
    const globalUser = db.users[userId] || {} // Para dinero y cooldowns
    const localUser = chat.users[userId] || {} // Para inventario de personajes del grupo
    
    const now = Date.now()

    if (chat.adminonly || !chat.gacha)
      return m.reply(`🐲 Estos comandos están desactivados en este grupo. (◕︿◕)`)

    // Verificar si es creador (sin cooldown)
    const isOwner = global.owner?.includes(userId)
    
    // Usamos cooldown global para no spammear en todos los grupos
    const cooldown = globalUser.rwCooldown || 0
    const restante = cooldown - now
    if (restante > 0 && !isOwner) {
      return m.reply(`🐲 Espera *${msToTime(restante)}* para volver a usar este comando. (◕︿◕)`)
    }
    
    if (!isOwner) {
      globalUser.rwCooldown = now + 15 * 60000
    }

    const personajes = obtenerPersonajes()
    const personaje = personajes[Math.floor(Math.random() * personajes.length)]
    if (!personaje) return m.reply('🐲 No se encontró ningún personaje disponible. (◕︿◕)')

    const idUnico = uuidv4().slice(0, 8)
    
    // Verificar si está reservado en el chat
    const reservado = Array.isArray(chat.personajesReservados)
      ? chat.personajesReservados.find((p) => p.name === personaje.name)
      : null

    // Verificar quiénes DEL GRUPO ya lo tienen
    const poseedores = Object.entries(chat.users || {}).filter(
      ([_, u]) => Array.isArray(u.characters) && u.characters.some((c) => c.name === personaje.name),
    )

    // Si por datos antiguos hay duplicados, conservamos el primero y limpiamos el resto.
    if (poseedores.length > 1) {
      const [ownerId] = poseedores[0]
      for (const [dupId, dupUser] of poseedores.slice(1)) {
        dupUser.characters = (dupUser.characters || []).filter((c) => c.name !== personaje.name)
      }
      console.log(`[GACHA] Duplicado corregido para ${personaje.name} en ${chatId}. Owner final: ${ownerId}`)
    }

    const ownerId = poseedores[0]?.[0] || null
    const ownerName = ownerId ? (db.users[ownerId]?.name || ownerId.split('@')[0]) : null

    let estado = 'Libre'
    if (ownerName) {
      estado = `Reclamado por ${ownerName}`
    } else if (reservado) {
        const nombreReservador = db.users[reservado.userId]?.name || 'Alguien'
        estado = `Reservado por ${nombreReservador}`
    }

    const valorPersonaje = typeof personaje.value === 'number' ? personaje.value.toLocaleString() : '0'
    const mensaje = `╭─── ⋆🐉⋆ ───
│ Roll Waifu (◕ᴗ◕✿)
├───────────────
│ ❀ Nombre › *${personaje.name || 'Desconocido'}*
│ ❀ Género › *${personaje.gender || 'Desconocido'}*
│ ❀ Valor › *${valorPersonaje}*
│ ❀ Estado › *${estado}*
│ ❀ Fuente › *${personaje.source || 'Desconocido'}*
╰─── ⋆✨⋆ ───

${global.dev || ''}`

    const imagenUrl = await obtenerImagenGelbooru(personaje)

    const mentions = ownerId ? [ownerId] : []
    if (reservado?.userId) mentions.push(reservado.userId)

    if (imagenUrl) {
      try {
        let imageBuffer = null
        let contentType = ''
        let imageSize = 0
        
        // Estimar tamaño sin descargar todo
        const headRes = await fetch(imagenUrl, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://gelbooru.com/',
          },
          timeout: 5000
        }).catch(() => null)
        
        if (headRes) {
          imageSize = parseInt(headRes.headers.get('content-length') || '0')
        }
        
        const adaptiveTimeout = getAdaptiveTimeout(imageSize)
        
        const imageRes = await fetch(imagenUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://gelbooru.com/',
            'Accept': 'image/webp,image/png,image/jpeg,*/*'
          },
          timeout: adaptiveTimeout
        })
        
        contentType = imageRes.headers.get('content-type') || ''
        
        if (!contentType.includes('image')) {
          // Intenta URL alternativa
          const altUrl = imagenUrl.replace('img2.gelbooru.com', 'img.gelbooru.com')
          if (altUrl !== imagenUrl) {
            const altRes = await fetch(altUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://gelbooru.com/',
              },
              timeout: getAdaptiveTimeout(imageSize)
            })
            const altContentType = altRes.headers.get('content-type') || ''
            if (altContentType.includes('image') && altRes.ok) {
              imageBuffer = Buffer.from(await altRes.arrayBuffer())
            }
          }
        } else if (imageRes.ok) {
          imageBuffer = Buffer.from(await imageRes.arrayBuffer())
        }
        
        // FALLBACK a SafeBooru si falla
        if (!imageBuffer) {
          const tags = buildTagCandidates(personaje)
          for (const tag of tags) {
            const safeRes = await getJsonSafe(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(tag)}&limit=1`)
            if (safeRes?.length > 0) {
              const fileUrl = safeRes[0].file_url || safeRes[0].url
              if (fileUrl) {
                const fbRes = await fetch(fileUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  },
                  timeout: getAdaptiveTimeout(imageSize)
                })
                if (fbRes.ok && fbRes.headers.get('content-type')?.includes('image')) {
                  imageBuffer = Buffer.from(await fbRes.arrayBuffer())
                  break
                }
              }
            }
          }
        }
        
        if (!imageBuffer || imageBuffer.length === 0) {
          throw new Error('No se pudo descargar imagen válida')
        }
        
        // Procesar imagen con sharp
        imageBuffer = await normalizeImage(imageBuffer)
        
        if (!imageBuffer) {
          throw new Error('La imagen no pudo procesarse')
        }
        
        // ⚡ ACTUALIZAR ESTADÍSTICAS - ÉXITO
        updateStats(personaje.name, true, imageBuffer.length)
        
        const envio = await client.sendMessage(
          chatId,
          {
            image: imageBuffer,
            caption: mensaje
          },
          { quoted: m }
        )
        console.log(`[RW] ✅ Imagen enviada`)
      } catch (e) {
        // ⚡ ACTUALIZAR ESTADÍSTICAS - FALLO
        updateStats(personaje.name, false, 0)
        
        console.log(`[RW] ⚠️ Error: ${e.message}`)
        await m.reply(mensaje)
      }
    } else {
      // ⚡ ACTUALIZAR ESTADÍSTICAS - SIN URL
      updateStats(personaje.name, false, 0)
      
      await m.reply(`${mensaje}\n\n⚠️ *Advertencia:* No se pudieron cargar las imágenes. Las APIs están temporalmente caídas o no responden. (╥﹏╥)`)
    }

    if (!ownerId) {
        reservarPersonaje(
          chatId,
          userId,
          {
            ...personaje,
            id: idUnico,
            reservedBy: userId,
            reservedUntil: now + 20000,
            expiresAt: now + 60000,
          },
          db,
        )
    }
  },
};
