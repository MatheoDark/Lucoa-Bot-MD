import fs from 'fs';
import {v4 as uuidv4} from 'uuid';
import fetch from 'node-fetch';
import sharp from 'sharp';

const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|webp)$/i

const normalizeTag = (value = '') => String(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[():'".]/g, ' ')
  .replace(/\s+/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_+|_+$/g, '')

const buildTagCandidates = (personaje = {}) => {
  const raw = [
    // 1. Keyword exacto (si existe)
    personaje.keyword,
    
    // 2. Nombre + Fuente (más específico)
    personaje.name && personaje.source ? `${personaje.name} (${personaje.source})` : null,
    personaje.name && personaje.source ? `${personaje.name.toLowerCase()} ${personaje.source.toLowerCase()}` : null,
    
    // 3. Solo nombre
    personaje.name,
    
    // 4. Nombre corto (primera palabra) + Fuente
    personaje.name && personaje.source ? `${personaje.name.split(' ')[0]} ${personaje.source}` : null,
  ].filter(Boolean)

  const set = new Set()
  for (const entry of raw) {
    const base = normalizeTag(entry)
    if (base) set.add(base)

    // Variante sin sufijos entre paréntesis
    const noSuffix = base.replace(/_\([^)]*\)$/g, '')
    if (noSuffix && noSuffix !== base) set.add(noSuffix)

    // Variante con espacios
    const spaced = base.replace(/_/g, ' ')
    if (spaced) set.add(spaced)
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
  const tags = buildTagCandidates(personaje)
  if (!tags.length) return null

  for (const currentTag of tags) {
    const tag = encodeURIComponent(currentTag)
    console.log(`[RW] Buscando imagen con tag: ${currentTag}`)

    // 1. API Proxy Delirius (Gelbooru - funciona)
    {
      try {
        const data = await getJsonSafe(`https://api.delirius.store/search/gelbooru?query=${tag}`)
        const posts = Array.isArray(data?.data) ? data.data : []
        console.log(`[RW] Delirius: ${posts.length} posts encontrados`)
        
        const url = pickRandomImageUrl(posts, (p) => {
          if (p?.image) return p.image
          return null
        })
        if (url) {
          console.log(`[RW] ✅ Imagen desde Delirius: ${url.slice(0, 80)}`)
          return url
        }
      } catch (e) {
        console.log(`[RW] ❌ Delirius error: ${e.message.slice(0, 50)}`)
      }
    }

    // 2. SafeBooru directo (fallback confiable)
    {
      try {
        const data = await getJsonSafe(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
        const posts = Array.isArray(data) ? data : (data?.post || [])
        console.log(`[RW] SafeBooru: ${posts.length} posts encontrados`)
        
        const url = pickRandomImageUrl(posts, (p) => {
          if (p?.file_url) return p.file_url.startsWith('http') ? p.file_url : `https://safebooru.org${p.file_url}`
          if (p?.directory && p?.image) return `https://safebooru.org/images/${p.directory}/${p.image}`
          return null
        })
        if (url) {
          console.log(`[RW] ✅ Imagen desde SafeBooru: ${url.slice(0, 80)}`)
          return url
        }
      } catch (e) {
        console.log(`[RW] ❌ SafeBooru error: ${e.message.slice(0, 50)}`)
      }
    }

    // 3. Gelbooru directo (intento final)
    {
      try {
        const data = await getJsonSafe(`https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
        const posts = Array.isArray(data) ? data : (data?.post || [])
        console.log(`[RW] Gelbooru: ${posts.length} posts encontrados`)
        
        const url = pickRandomImageUrl(posts, (p) => {
          if (p?.file_url) return p.file_url
          if (p?.source) return p.source
          return null
        })
        if (url) {
          console.log(`[RW] ✅ Imagen desde Gelbooru: ${url.slice(0, 80)}`)
          return url
        }
      } catch (e) {
        console.log(`[RW] ❌ Gelbooru error: ${e.message.slice(0, 50)}`)
      }
    }
  }

  // FALLBACK: Buscar por nombre simple (solo la primera palabra)
  {
    const simpleName = personaje.name?.split(' ')[0] || ''
    if (simpleName && simpleName.length > 2) {
      console.log(`[RW] 🔄 Fallback 1: Buscando por nombre simple: ${simpleName}`)
      
      try {
        const data = await getJsonSafe(`https://api.delirius.store/search/gelbooru?query=${encodeURIComponent(simpleName)}`)
        const posts = Array.isArray(data?.data) ? data.data : []
        if (posts.length > 0) {
          const url = pickRandomImageUrl(posts, (p) => p?.image || null)
          if (url) {
            console.log(`[RW] ✅ Imagen desde nombre simple (Delirius)`)
            return url
          }
        }
      } catch (e) {
        console.log(`[RW] ❌ Fallback 1 error: ${e.message.slice(0, 30)}`)
      }
    }
  }

  // FALLBACK 2: Buscar con nombre + parte de la fuente
  {
    const fuente = personaje.source?.split(' ')[0] || ''
    const nombre = personaje.name?.split(' ')[0] || ''
    if (fuente && nombre && nombre.length > 2) {
      const searchTerm = `${nombre} ${fuente}`
      console.log(`[RW] 🔄 Fallback 2: Búsqueda inteligente: ${searchTerm}`)
      
      try {
        const data = await getJsonSafe(`https://api.delirius.store/search/gelbooru?query=${encodeURIComponent(searchTerm)}`)
        const posts = Array.isArray(data?.data) ? data.data : []
        if (posts.length > 0) {
          const url = pickRandomImageUrl(posts, (p) => p?.image || null)
          if (url) {
            console.log(`[RW] ✅ Imagen desde búsqueda inteligente (${searchTerm})`)
            return url
          }
        }
      } catch (e) {
        console.log(`[RW] ❌ Fallback 2 error: ${e.message.slice(0, 30)}`)
      }
    }
  }

  console.log(`[RW] ⚠️ No se encontró imagen para ningún tag`)
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

    console.log(`[RW] imagenUrl obtenida: ${imagenUrl ? 'SÍ' : 'NO'}`)
    console.log(`[RW] URL: ${imagenUrl}`)

    if (imagenUrl) {
      try {
        console.log(`[RW] Intentando descargar imagen...`)
        console.log(`[RW] URL: ${imagenUrl}`)
        
        // INTENTO 1: Descargar desde URL original
        let imageBuffer = null
        let contentType = ''
        
        const imageRes = await fetch(imagenUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://gelbooru.com/',
            'Accept': 'image/webp,image/png,image/jpeg,*/*'
          },
          timeout: 12000
        })
        
        contentType = imageRes.headers.get('content-type') || ''
        console.log(`[RW] Response Content-Type: ${contentType}`)
        console.log(`[RW] Response Status: ${imageRes.status}`)
        
        // Validar que sea imagen
        if (!contentType.includes('image')) {
          console.log(`[RW] ⚠️ No es imagen (${contentType}), intentando extraer URL directa...`)
          imageBuffer = null
        } else if (imageRes.ok) {
          const arrayBuffer = await imageRes.arrayBuffer()
          imageBuffer = Buffer.from(arrayBuffer)
          console.log(`[RW] ✅ Imagen descargada: ${imageBuffer.length} bytes`)
        }
        
        // INTENTO 2: Si falló, probar convertir URL de img2.gelbooru a img.gelbooru
        if (!imageBuffer) {
          const altUrl = imagenUrl.replace('img2.gelbooru.com', 'img.gelbooru.com')
          if (altUrl !== imagenUrl) {
            console.log(`[RW] Intentando URL alternativa...`)
            const altRes = await fetch(altUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://gelbooru.com/',
              },
              timeout: 12000
            })
            const altContentType = altRes.headers.get('content-type') || ''
            if (altContentType.includes('image') && altRes.ok) {
              const arrayBuffer = await altRes.arrayBuffer()
              imageBuffer = Buffer.from(arrayBuffer)
              console.log(`[RW] ✅ Imagen desde URL alt: ${imageBuffer.length} bytes`)
            }
          }
        }
        
        // INTENTO 3: Si todavía no funciona, usar SafeBooru
        if (!imageBuffer) {
          console.log(`[RW] ⚠️ No se pudo descargar. Buscando en SafeBooru...`)
          const tags = buildTagCandidates(personaje)
          for (const tag of tags) {
            const safeRes = await getJsonSafe(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(tag)}&limit=1`)
            if (safeRes?.length > 0) {
              const fileUrl = safeRes[0].file_url || safeRes[0].url
              if (fileUrl) {
                console.log(`[RW] Descargando fallback desde SafeBooru...`)
                const fbRes = await fetch(fileUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  },
                  timeout: 12000
                })
                if (fbRes.ok && fbRes.headers.get('content-type')?.includes('image')) {
                  imageBuffer = Buffer.from(await fbRes.arrayBuffer())
                  console.log(`[RW] ✅ Imagen desde SafeBooru fallback: ${imageBuffer.length} bytes`)
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
          throw new Error('La imagen descargada no es válida o está corrupta')
        }
        
        console.log(`[RW] ✅ Buffer procesado: ${imageBuffer.length} bytes`)
        
        console.log(`[RW] Enviando imagen a WhatsApp...`)
        const envio = await client.sendMessage(
          chatId,
          {
            image: imageBuffer,
            caption: mensaje
          },
          { quoted: m }
        )
        console.log(`[RW] ✅ Imagen enviada exitosamente`)
        console.log(`[RW] Mensaje ID: ${envio.key.id}`)
      } catch (e) {
        console.error(`[RW] ❌ ERROR: ${e.message}`)
        if (e.stack) console.error(`[RW] Stack: ${e.stack.split('\n').slice(0, 3).join(' | ')}`)
        console.log(`[RW] → Enviando solo texto...`)
        await m.reply(mensaje)
      }
    } else {
      console.log(`[RW] ⚠️ No hay URL de imagen, enviando solo texto con advertencia`)
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
