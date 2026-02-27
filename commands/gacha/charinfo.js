import {promises as fs} from 'fs';
import fetch from 'node-fetch';

const obtenerImagenGelbooru = async (keyword) => {
  const tag = encodeURIComponent(keyword)

  // 1. Gelbooru directo
  try {
    const res = await fetch(`https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
    const data = await res.json()
    const posts = data?.post || []
    const valid = posts.filter(p => p.file_url && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url))
    if (valid.length) return valid[Math.floor(Math.random() * valid.length)].file_url
  } catch {}

  // 2. Danbooru fallback
  try {
    const res = await fetch(`https://danbooru.donmai.us/posts.json?tags=${tag}&limit=50`)
    const data = await res.json()
    const valid = data.filter(p => (p.file_url || p.large_file_url))
    if (valid.length) {
      const post = valid[Math.floor(Math.random() * valid.length)]
      return post.file_url || post.large_file_url
    }
  } catch {}

  // 3. Yandere fallback
  try {
    const res = await fetch(`https://yande.re/post.json?tags=${tag}&limit=50`)
    const data = await res.json()
    const valid = data.filter(p => p.file_url)
    if (valid.length) return valid[Math.floor(Math.random() * valid.length)].file_url
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
      return m.reply(`✎ Estos comandos estan desactivados en este grupo.`)

    if (args.length === 0)
      return m.reply(
        `✎ Por favor, proporciona el nombre de un personaje.`
      )

    try {
      const characterName = args.join(' ').toLowerCase().trim()
      const characters = await loadCharacters()
      const character = findSimilarCharacter(characterName, characters)

      if (!character)
        return m.reply(`✎ No se ha encontrado el personaje *${characterName}*, ni uno similar.`)

      const message = `➭ Nombre › *${character.name}*\n\n✎ Género › *${character.gender}*\n⛁ Valor › *${character.value.toLocaleString()}*\n❖ Fuente › *${character.source}*\n\n${dev}`

      const imagenUrl = await obtenerImagenGelbooru(character.keyword)
      if (imagenUrl) {
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
