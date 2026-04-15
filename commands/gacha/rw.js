import fs from 'fs';
import {v4 as uuidv4} from 'uuid';
import fetch from 'node-fetch';

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
    personaje.keyword,
    personaje.name && personaje.source ? `${personaje.name} (${personaje.source})` : null, // MÁS ESPECÍFICO PRIMERO
    personaje.name && personaje.source ? `${personaje.name} ${personaje.source}` : null,
    personaje.name,
    // Eliminado: personaje.source - Esto causaba que, como último recurso, se trajera *cualquier* personaje del mismo anime/juego.
  ].filter(Boolean)

  const set = new Set()
  for (const entry of raw) {
    const base = normalizeTag(entry)
    if (base) set.add(base)

    // Variante sin sufijos entre paréntesis: rem_(re:zero) -> rem
    const noSuffix = base.replace(/_\([^)]*\)$/g, '')
    if (noSuffix && noSuffix !== base) set.add(noSuffix)

    // Variante con espacios para endpoints que toleran textos naturales
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

const obtenerImagenGelbooru = async (personaje) => {
  const tags = buildTagCandidates(personaje)
  if (!tags.length) return null

  for (const currentTag of tags) {
    const tag = encodeURIComponent(currentTag)

    // 1. API Proxy Delirius (Gelbooru - funciona)
    {
      try {
        const data = await getJsonSafe(`https://api.delirius.store/search/gelbooru?query=${tag}`)
        const posts = Array.isArray(data?.data) ? data.data : []
        
        const url = pickRandomImageUrl(posts, (p) => {
          if (p?.image) return p.image
          return null
        })
        if (url) return url
      } catch (e) {
        // Continuar
      }
    }

    // 2. SafeBooru directo (fallback confiable)
    {
      const data = await getJsonSafe(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
      const posts = Array.isArray(data) ? data : (data?.post || [])
      const url = pickRandomImageUrl(posts, (p) => {
        if (p?.file_url) return p.file_url.startsWith('http') ? p.file_url : `https://safebooru.org${p.file_url}`
        if (p?.directory && p?.image) return `https://safebooru.org/images/${p.directory}/${p.image}`
        return null
      })
      if (url) return url
    }

    // 3. Gelbooru directo (intento final)
    {
      const data = await getJsonSafe(`https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
      const posts = Array.isArray(data) ? data : (data?.post || [])
      const url = pickRandomImageUrl(posts, (p) => {
        if (p?.file_url) return p.file_url
        if (p?.source) return p.source
        return null
      })
      if (url) return url
    }
  }

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

    // Usamos cooldown global para no spammear en todos los grupos
    const cooldown = globalUser.rwCooldown || 0
    const restante = cooldown - now
    if (restante > 0) {
      return m.reply(`🐲 Espera *${msToTime(restante)}* para volver a usar este comando. (◕︿◕)`)
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

    // Guardamos cooldown en globalUser
    globalUser.rwCooldown = now + 15 * 60000

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
        await client.sendMessage(chatId, { image: { url: imagenUrl }, caption: mensaje }, { quoted: m })
      } catch (e) {
        console.error('Error enviando imagen:', e)
        await m.reply(mensaje)
      }
    } else {
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
