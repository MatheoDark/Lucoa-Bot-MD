import fs from 'fs';
import {promises as fsp} from 'fs';
import fetch from 'node-fetch';
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import os from 'os'

const execAsync = promisify(exec)
const recentMediaByCharacter = globalThis.__wimageRecentMediaByCharacter || new Map()
globalThis.__wimageRecentMediaByCharacter = recentMediaByCharacter

const normalizeImageUrl = (url = '') => String(url).trim().replace(/#.*$/, '')

const MEDIA_REGEX = /\.(jpg|jpeg|png|webp|gif|mp4|webm|mov)$/i
const VIDEO_REGEX = /\.(mp4|webm|mov)$/i
const GIF_REGEX = /\.gif$/i

const pickRandomMedia = (urls = []) => {
  const normalized = urls.map((url) => normalizeImageUrl(url)).filter(Boolean)
  if (!normalized.length) return null
  return normalized[Math.floor(Math.random() * normalized.length)]
}

const pickDifferentMedia = (urls = [], previousUrl = '') => {
  const previous = normalizeImageUrl(previousUrl)
  const normalized = urls.map((url) => normalizeImageUrl(url)).filter(Boolean)
  if (!normalized.length) return null
  const different = normalized.filter((url) => url !== previous)
  const pool = different.length ? different : normalized
  return pool[Math.floor(Math.random() * pool.length)]
}

function getMediaTypeByUrl(url = '') {
  const value = String(url).toLowerCase()
  if (GIF_REGEX.test(value)) return 'gif'
  if (VIDEO_REGEX.test(value)) return 'video'
  return 'image'
}

async function convertToMp4(url, originalName = '') {
  const tmpDir = join(os.tmpdir(), 'lucoa_charinfo_convert')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  const id = Date.now() + '_' + Math.random().toString(36).slice(2)
  const inputPath = join(tmpDir, `${id}_in`)
  const outputPath = join(tmpDir, `${id}_out.mp4`)

  try {
    const res = await fetch(url)
    const dlBuffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(inputPath, dlBuffer)

    let hasAudio = false
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -select_streams a -show_entries stream=codec_type -of csv=p=0 "${inputPath}"`,
        { timeout: 10000 }
      )
      hasAudio = stdout.trim().includes('audio')
    } catch {
      hasAudio = false
    }

    const noAudio = !hasAudio || GIF_REGEX.test(originalName)
    const ffmpegCmd = noAudio
      ? `ffmpeg -y -i "${inputPath}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=15" -c:v libx264 -pix_fmt yuv420p -an "${outputPath}"`
      : `ffmpeg -y -i "${inputPath}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=24" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k "${outputPath}"`

    await execAsync(ffmpegCmd, { timeout: 30000 })
    const buffer = fs.readFileSync(outputPath)

    try { fs.unlinkSync(inputPath) } catch {}
    try { fs.unlinkSync(outputPath) } catch {}

    return { buffer, hasAudio: !noAudio }
  } catch (error) {
    try { fs.unlinkSync(inputPath) } catch {}
    try { fs.unlinkSync(outputPath) } catch {}
    throw error
  }
}

const obtenerImagenGelbooru = async (keyword) => {
  const tag = encodeURIComponent(keyword)
  const previousUrl = recentMediaByCharacter.get(keyword) || ''

  const getUrlList = (posts = [], mapper) => posts
    .map(mapper)
    .filter((url) => typeof url === 'string' && MEDIA_REGEX.test(url))

  const searchSources = [
    async () => {
      const res = await fetch(`https://api.delirius.store/search/gelbooru?query=${tag}`)
      const data = await res.json()
      const posts = Array.isArray(data?.data) ? data.data : []
      return getUrlList(posts, (p) => p?.image || null)
    },
    async () => {
      const res = await fetch(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
      const data = await res.json()
      const posts = Array.isArray(data) ? data : (data?.post || [])
      return getUrlList(posts, (p) => {
        if (p.file_url) return p.file_url.startsWith('http') ? p.file_url : `https://safebooru.org${p.file_url}`
        if (p.image) return `https://safebooru.org/images/${p.directory}/${p.image}`
        return null
      })
    },
    async () => {
      const res = await fetch(`https://konachan.com/post.json?tags=${tag}&limit=50`)
      const data = await res.json()
      const posts = Array.isArray(data) ? data : []
      return getUrlList(posts, (p) => p?.file_url || p?.sample_url || null)
    },
    async () => {
      const res = await fetch(`https://yande.re/post.json?tags=${tag}&limit=50`)
      const data = await res.json()
      const posts = Array.isArray(data) ? data : []
      return getUrlList(posts, (p) => p?.file_url || p?.sample_url || null)
    },
    async () => {
      const res = await fetch(`https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
      const data = await res.json()
      const posts = data?.post || []
      return getUrlList(posts, (p) => p.file_url || null)
    },
    async () => {
      const res = await fetch(`https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
      const data = await res.json()
      const posts = Array.isArray(data) ? data : (data?.post || [])
      return getUrlList(posts, (p) => p?.file_url || null)
    },
  ]

  // 1. Búsqueda en varias fuentes
  try {
    for (const searchSource of searchSources) {
      const valid = await searchSource()
      if (valid.length) {
        const chosen = pickDifferentMedia(valid, previousUrl)
        if (chosen) {
          recentMediaByCharacter.set(keyword, chosen)
          return chosen
        }
      }
    }
  } catch {}

  // 2. Danbooru fallback adicional
  try {
    const res = await fetch(`https://danbooru.donmai.us/posts.json?tags=${tag}&limit=50`)
    const data = await res.json()
    const valid = getUrlList(data, (p) => p.file_url || p.large_file_url || p.source || null)
    if (valid.length) {
      const chosen = pickDifferentMedia(valid, previousUrl)
      if (chosen) {
        recentMediaByCharacter.set(keyword, chosen)
        return chosen
      }
    }
  } catch {}

  return null
}

const charactersFilePath = './lib/characters.json'

async function loadCharacters() {
  try {
    const data = await fsp.readFile(charactersFilePath, 'utf-8')
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

      const imagenUrl = await obtenerImagenGelbooru(character.keyword)
      if (imagenUrl) {
        try {
          const mediaType = getMediaTypeByUrl(imagenUrl)
          await client.sendMessage(
            chatId,
            mediaType === 'image'
              ? {
                  image: { url: imagenUrl },
                  caption: message,
                  mimetype: 'image/jpeg',
                }
              : await (async () => {
                  try {
                    const { buffer, hasAudio } = await convertToMp4(imagenUrl, imagenUrl)
                    return {
                      video: buffer,
                      caption: message,
                      ...(GIF_REGEX.test(imagenUrl) || !hasAudio ? { gifPlayback: true } : {}),
                      mimetype: 'video/mp4',
                    }
                  } catch {
                    return {
                      video: { url: imagenUrl },
                      caption: message,
                      ...(GIF_REGEX.test(imagenUrl) ? { gifPlayback: true } : {}),
                      mimetype: GIF_REGEX.test(imagenUrl) ? 'image/gif' : 'video/mp4',
                    }
                  }
                })(),
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
