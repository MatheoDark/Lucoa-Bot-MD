import fs from 'fs'
import { promises as fsp } from 'fs'
import fetch from 'node-fetch'
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
const HTTP_URL_REGEX = /^https?:\/\//i

// 🛡️ HEADERS FALSOS: Vital para que Gelbooru/Rule34 no bloqueen la descarga
const fetchHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://google.com/',
  'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
}

// 🛠️ TÚNEL ANTI-CLOUDFLARE: Maneja bloqueos de Cloudflare automáticamente
async function smartFetchBuffer(url) {
  try {
    let res = await fetch(url, { headers: fetchHeaders, timeout: 15000 })
    let buffer = Buffer.from(await res.arrayBuffer())
    let head = buffer.slice(0, 4).toString('hex')

    // Si es HTML (3c21444f = <!DO) o muy pequeño, usamos Proxy
    if (head === '3c21444f' || buffer.length < 1000) {
      console.log('[WIMAGE] 🛡️ Cloudflare detectado. Usando Proxy anónimo...')
      res = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(url)}`, { headers: fetchHeaders, timeout: 15000 })
      buffer = Buffer.from(await res.arrayBuffer())
    }
    return buffer
  } catch (e) {
    console.log('[WIMAGE] 🛡️ Falló descarga directa, intentando Proxy...', e.message)
    let res = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(url)}`, { headers: fetchHeaders, timeout: 15000 })
    return Buffer.from(await res.arrayBuffer())
  }
}

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
    // �️ Usar smartFetchBuffer para evitar Cloudflare
    const dlBuffer = await smartFetchBuffer(url)
    
    // Validación: si sigue siendo HTML, Cloudflare nos bloqueó el video
    if (dlBuffer.slice(0, 4).toString('hex') === '3c21444f') {
      throw new Error('Cloudflare bloqueó la descarga del video')
    }
    
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

  const isLikelyMediaUrl = (url = '') => {
    if (typeof url !== 'string') return false
    const clean = url.trim()
    if (!clean || !HTTP_URL_REGEX.test(clean)) return false
    if (MEDIA_REGEX.test(clean)) return true
    // Algunas APIs devuelven links directos sin extensión explícita.
    return !/index\.php|page=post|s=list|s=view/i.test(clean)
  }

  const getUrlList = (posts = [], mapper) => posts
    .map(mapper)
    .filter((url) => isLikelyMediaUrl(url))

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
  for (const searchSource of searchSources) {
    try {
      const valid = await searchSource()
      if (valid.length) {
        const chosen = pickDifferentMedia(valid, previousUrl)
        if (chosen) {
          recentMediaByCharacter.set(keyword, chosen)
          return chosen
        }
      }
    } catch {
      // Continuar con la siguiente fuente si esta falla
    }
  }

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
  run: async ({ client, m, args }) => {
    const db = global.db.data
    const chatId = m.chat
    const chatData = db.chats[chatId]

    if (chatData?.adminonly || !chatData?.gacha)
      return m.reply(`🐲 Estos comandos están desactivados en este grupo. (◕︿◕)`)

    if (args.length === 0)
      return m.reply(`🐲 Por favor, proporciona el nombre de un personaje. (◕︿◕)`)

    try {
      const characterName = args.join(' ').toLowerCase().trim()
      const characters = await loadCharacters()
      const character = findSimilarCharacter(characterName, characters)

      if (!character)
        return m.reply(`🐲 No se ha encontrado el personaje *${characterName}*, ni uno similar. (◕︿◕)`)

      // Nota: Se asume que global.dev existe en tu bot, si no, bórralo de esta línea.
      const devText = global.dev || ''
      const message = `╭─── ⋆🐉⋆ ───\n│ Char Info (◕ᴗ◕✿)\n├───────────────\n│ ❀ Nombre › *${character.name}*\n│ ❀ Género › *${character.gender}*\n│ ❀ Valor › *${character.value.toLocaleString()}*\n│ ❀ Fuente › *${character.source}*\n╰─── ⋆✨⋆ ───\n\n${devText}`

      const imagenUrl = await obtenerImagenGelbooru(character.keyword)
      
      if (imagenUrl) {
        try {
          const mediaType = getMediaTypeByUrl(imagenUrl)
          
          if (mediaType === 'image') {
            // 🛠️ USAMOS SMARTFETCHBUFFER PARA EVITAR CLOUDFLARE
            const mediaBuffer = await smartFetchBuffer(imagenUrl)
            if (!mediaBuffer || mediaBuffer.length === 0) {
              throw new Error('No se pudo descargar imagen válida')
            }
            
            await client.sendMessage(
              chatId,
              {
                image: mediaBuffer,
                caption: message,
                mimetype: 'image/jpeg',
              },
              { quoted: m }
            )
          } else {
            // Es un GIF o Video
            try {
              const { buffer, hasAudio } = await convertToMp4(imagenUrl, imagenUrl)
              await client.sendMessage(
                chatId,
                {
                  video: buffer,
                  caption: message,
                  ...(GIF_REGEX.test(imagenUrl) || !hasAudio ? { gifPlayback: true } : {}),
                  mimetype: 'video/mp4',
                },
                { quoted: m }
              )
            } catch {
              // Si falla FFmpeg, intentamos enviar el video original con smartFetchBuffer
              const fallbackBuffer = await smartFetchBuffer(imagenUrl)
              if (!fallbackBuffer || fallbackBuffer.length === 0) {
                throw new Error('No se pudo descargar video válido')
              }
              
              await client.sendMessage(
                chatId,
                {
                  video: fallbackBuffer,
                  caption: message,
                  ...(GIF_REGEX.test(imagenUrl) ? { gifPlayback: true } : {}),
                  mimetype: GIF_REGEX.test(imagenUrl) ? 'image/gif' : 'video/mp4',
                },
                { quoted: m }
              )
            }
          }
        } catch (mediaError) {
          console.error("[WIMAGE] Error al enviar media:", mediaError)
          await m.reply(message + "\n\n⚠️ *(No se pudo cargar la imagen, pero el personaje es válido)*")
        }
      } else {
        await m.reply(message + "\n\n⚠️ *(Sin imágenes disponibles)*")
      }
    } catch (error) {
      console.error("Error general en comando wimage:", error)
      const fallbackMsg = global.msgglobal || "🐲 Ocurrió un error al procesar el personaje."
      await client.sendMessage(chatId, { text: fallbackMsg }, { quoted: m })
    }
  },
}
