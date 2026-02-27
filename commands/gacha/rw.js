import fs from 'fs';
import {v4 as uuidv4} from 'uuid';
import fetch from 'node-fetch';

const obtenerImagenGelbooru = async (keyword) => {
  const tag = encodeURIComponent(keyword)

  // 1. SafeBooru (funcional y sin auth)
  try {
    const res = await fetch(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
    const data = await res.json()
    const posts = Array.isArray(data) ? data : (data?.post || [])
    const valid = posts.filter(p => (p.file_url || p.image) && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url || p.image))
    if (valid.length) {
      const post = valid[Math.floor(Math.random() * valid.length)]
      const url = post.file_url || `https://safebooru.org/images/${post.directory}/${post.image}`
      return url.startsWith('http') ? url : `https://safebooru.org${url}`
    }
  } catch {}

  // 2. Gelbooru fallback
  try {
    const res = await fetch(`https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
    const data = await res.json()
    const posts = data?.post || []
    const valid = posts.filter(p => p.file_url && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url))
    if (valid.length) return valid[Math.floor(Math.random() * valid.length)].file_url
  } catch {}

  // 3. Danbooru fallback
  try {
    const res = await fetch(`https://danbooru.donmai.us/posts.json?tags=${tag}&limit=50`)
    const data = await res.json()
    const valid = data.filter(p => (p.file_url || p.large_file_url))
    if (valid.length) {
      const post = valid[Math.floor(Math.random() * valid.length)]
      return post.file_url || post.large_file_url
    }
  } catch {}

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
      return m.reply(`✎ Estos comandos estan desactivados en este grupo.`)

    // Usamos cooldown global para no spammear en todos los grupos
    const cooldown = globalUser.rwCooldown || 0
    const restante = cooldown - now
    if (restante > 0) {
      return m.reply(`ꕥ Espera *${msToTime(restante)}* para volver a usar este comando.`)
    }

    const personajes = obtenerPersonajes()
    const personaje = personajes[Math.floor(Math.random() * personajes.length)]
    if (!personaje) return m.reply('《✧》 No se encontró ningún personaje disponible.')

    const idUnico = uuidv4().slice(0, 8)
    
    // Verificar si está reservado en el chat
    const reservado = Array.isArray(chat.personajesReservados)
      ? chat.personajesReservados.find((p) => p.name === personaje.name)
      : null

    // Verificar si alguien DEL GRUPO ya lo tiene
    const poseedor = Object.entries(chat.users).find(
      ([_, u]) => Array.isArray(u.characters) && u.characters.some((c) => c.name === personaje.name),
    )

    let estado = 'Libre'
    if (poseedor) {
        const [id] = poseedor
        const nombrePoseedor = db.users[id]?.name || id.split('@')[0]
        estado = `Reclamado por ${nombrePoseedor}`
    } else if (reservado) {
        const nombreReservador = db.users[reservado.userId]?.name || 'Alguien'
        estado = `Reservado por ${nombreReservador}`
    }

    // Guardamos cooldown en globalUser
    globalUser.rwCooldown = now + 15 * 60000

    const valorPersonaje = typeof personaje.value === 'number' ? personaje.value.toLocaleString() : '0'
    const mensaje = `➩ Nombre › *${personaje.name || 'Desconocido'}*

⚥ Género › *${personaje.gender || 'Desconocido'}*
⛁ Valor › *${valorPersonaje}*
♡ Estado › *${estado}*
❖ Fuente › *${personaje.source || 'Desconocido'}*

${global.dev || ''}`

    const imagenUrl = await obtenerImagenGelbooru(personaje.keyword)

    if (imagenUrl) {
      try {
        await client.sendMessage(
          chatId,
          {
            image: { url: imagenUrl },
            caption: mensaje,
            mimetype: 'image/jpeg',
          },
          { quoted: m },
        )
      } catch {
        await m.reply(mensaje)
      }
    } else {
      await m.reply(mensaje)
    }

    if (!poseedor) {
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
