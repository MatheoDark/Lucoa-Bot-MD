import {promises as fs} from 'fs';
import fetch from 'node-fetch';

const lastImageByCharacter = new Map()

const normalizeImageUrl = (url = '') => String(url).trim().replace(/#.*$/, '')

const pickDifferentImage = (urls = [], previousUrl = '') => {
  const previous = normalizeImageUrl(previousUrl)
  const normalized = urls.map((url) => normalizeImageUrl(url)).filter(Boolean)
  const different = normalized.filter((url) => url !== previous)
  const pool = different.length ? different : normalized
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

const obtenerImagenGelbooru = async (keyword, previousUrl = '') => {
  const tag = encodeURIComponent(keyword)

  // 1. SafeBooru (funcional y sin auth)
  try {
    const res = await fetch(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
    const data = await res.json()
    const posts = Array.isArray(data) ? data : (data?.post || [])
    const valid = posts
      .map(p => {
        if (p.file_url && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url)) return p.file_url
        if (p.image && /\.(jpg|jpeg|png|webp)$/i.test(p.image)) {
          const url = `https://safebooru.org/images/${p.directory}/${p.image}`
          return url
        }
        return null
      })
      .filter(Boolean)
    if (valid.length) {
      return pickDifferentImage(valid, previousUrl)
    }
  } catch {}

  // 2. Gelbooru fallback
  try {
    const res = await fetch(`https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
    const data = await res.json()
    const posts = data?.post || []
    const valid = posts
      .map(p => (p.file_url && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url) ? p.file_url : null))
      .filter(Boolean)
    if (valid.length) return pickDifferentImage(valid, previousUrl)
  } catch {}

  // 3. Danbooru fallback
  try {
    const res = await fetch(`https://danbooru.donmai.us/posts.json?tags=${tag}&limit=50`)
    const data = await res.json()
    const valid = data
      .map(p => p.file_url || p.large_file_url)
      .filter(Boolean)
    if (valid.length) {
      return pickDifferentImage(valid, previousUrl)
    }
  } catch {}

  return null
}

const charactersFilePath = './lib/characters.json'

async function loadCharacters() {
  try {
    const data = await fs.readFile(charactersFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('❀ Error al cargar characters.json:', error)
    throw new Error('❀ No se pudo cargar el archivo characters.json')
  }
}

function findSimilarCharacter(name, characters) {
  name = name.toLowerCase().trim()
  return (
    characters.find((c) => c.name.toLowerCase() === name) ||
    characters.find((c) => c.name.toLowerCase().includes(name)) ||
    characters.find((c) => name.includes(c.name.toLowerCase()))
  )
}

export default {
  command: ['charimage', 'wimage', 'cimage'],
  category: 'gacha',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const chatData = db.chats[chatId]

    if (chatData.adminonly || !chatData.gacha)
      return m.reply(`🐲 Estos comandos están desactivados en este grupo. (◕︿◕)`)

    if (args.length === 0)
      return m.reply(
        `🐲 Por favor, proporciona el nombre de un personaje. (◕︿◕)`
      )

    try {
      const characterName = args.join(' ').toLowerCase().trim()
      const characters = await loadCharacters()
      const character = findSimilarCharacter(characterName, characters)

      if (!character)
        return m.reply(`🐲 No se ha encontrado el personaje *${characterName}*, ni uno similar. (◕︿◕)`)

      const message = `╭─── ⋆🐉⋆ ───\n│ Char Info (◕ᴗ◕✿)\n├───────────────\n│ ❀ Nombre › *${character.name}*\n│ ❀ Género › *${character.gender}*\n│ ❀ Valor › *${character.value.toLocaleString()}*\n│ ❀ Fuente › *${character.source}*\n╰─── ⋆✨⋆ ───\n\n${dev}`

      const previousUrl = lastImageByCharacter.get(character.keyword) || ''
      const imagenUrl = await obtenerImagenGelbooru(character.keyword, previousUrl)
      if (imagenUrl) {
        lastImageByCharacter.set(character.keyword, imagenUrl)
        try {
          await client.sendMessage(
            chatId,
            {
              image: { url: imagenUrl },
              caption: message,
              mimetype: 'image/jpeg',
            },
            { quoted: m },
          )
        } catch {
          await m.reply(message)
        }
      } else {
        await m.reply(message)
      }
    } catch (error) {
      await client.sendMessage(chatId, { text: msgglobal }, { quoted: m })
    }
  },
};
