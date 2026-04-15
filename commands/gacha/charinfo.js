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

const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|webp|gif|mp4|webm|mov)$/i
const VIDEO_EXT_REGEX = /\.(mp4|webm|mov)$/i
const GIF_EXT_REGEX = /\.gif$/i
const HTTP_URL_REGEX = /^https?:\/\//i

// 🛡️ HEADERS FALSOS (Base)
const fetchHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://gelbooru.com/',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
}

// 🛠️ TÚNEL BLINDADO DINÁMICO (Camaleón)
async function smartFetchBuffer(url) {
    const urlObj = new URL(url);
    const dynamicHeaders = {
        'User-Agent': fetchHeaders['User-Agent'],
        'Referer': `${urlObj.protocol}//${urlObj.hostname}/`,
        'Accept': fetchHeaders['Accept']
    };
    
    const proxies = [
        url,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ];
    if (url.includes('img2.gelbooru.com')) proxies.push(url.replace('img2.gelbooru.com', 'img.gelbooru.com'));

    for (let targetUrl of proxies) {
        try {
            let res = await fetch(targetUrl, { headers: dynamicHeaders, timeout: 15000 });
            let buffer = Buffer.from(await res.arrayBuffer());
            let head = buffer.slice(0, 4).toString('hex');
            if (head !== '3c21444f' && head !== '7b227374' && buffer.length > 5000) {
              console.log(`[WIMAGE] ✅ Imagen descargada exitosamente desde: ${targetUrl.substring(0, 50)}...`)
              return buffer;
            }
        } catch (e) {}
    }
    throw new Error('Todas las rutas bloqueadas.');
}

// 🧠 INTELIGENCIA DE ETIQUETAS
const normalizeTag = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[():'".]/g, ' ').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n')

const buildTagCandidates = (personaje = {}) => {
  const nombreTieneEspacios = typeof personaje.name === 'string' && personaje.name.includes(' ')
  const raw = [
    personaje.keyword,
    personaje.keyword ? personaje.keyword.replace(/\(/g, '_').replace(/\)/g, '_').replace(/__+/g, '_') : null,
    personaje.keyword ? personaje.keyword.replace(/_\([^)]*\)$/, '') : null,
    personaje.name && personaje.source ? `${personaje.name} (${personaje.source})` : null,
    personaje.name && personaje.source ? `${personaje.name.toLowerCase()} ${personaje.source.toLowerCase()}` : null,
    personaje.name && personaje.source ? `${personaje.name.toLowerCase()}_${personaje.source.toLowerCase()}` : null,
    personaje.name && personaje.source ? `${personaje.name} ${personaje.source.split(' ').slice(0, 2).join(' ')}` : null,
    nombreTieneEspacios ? personaje.name : null,
    nombreTieneEspacios ? personaje.name.replace(/\s/g, '_') : null,
  ].filter(Boolean)

  const set = new Set()
  for (const entry of raw) {
    const base = normalizeTag(entry)
    if (base && base.length > 0) {
      set.add(base)
      const noSuffix = base.replace(/_\([^)]*\)$/g, '')
      if (noSuffix && noSuffix !== base) set.add(noSuffix)
    }
  }
  return [...set]
}

const getJsonSafe = async (url) => {
  try {
    const res = await fetch(url, { headers: fetchHeaders, timeout: 10000 })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

const isLikelyMediaUrl = (url = '') => {
  if (typeof url !== 'string') return false
  const clean = url.trim()
  if (!clean || !HTTP_URL_REGEX.test(clean)) return false
  if (IMAGE_EXT_REGEX.test(clean)) return true
  return !/index\.php|page=post|s=list|s=view/i.test(clean)
}

const pickDifferentImageUrl = (urls = [], previousUrl = '') => {
  const previous = String(previousUrl || '').trim()
  const normalized = urls.map((url) => String(url || '').trim()).filter(Boolean)
  if (!normalized.length) return null
  const different = normalized.filter((url) => url !== previous)
  const pool = different.length ? different : normalized
  return pool[Math.floor(Math.random() * pool.length)]
}

const pickMediaFromPosts = (posts = [], mapper, previousUrl = '') => {
  const urls = posts.map(mapper).filter((url) => isLikelyMediaUrl(url))
  return pickDifferentImageUrl(urls, previousUrl)
}

function getMediaTypeByUrl(url = '') {
  const value = String(url).toLowerCase()
  if (GIF_EXT_REGEX.test(value)) return 'gif'
  if (VIDEO_EXT_REGEX.test(value)) return 'video'
  return 'image'
}

async function convertToMp4(url, originalName = '') {
  const tmpDir = join(os.tmpdir(), 'lucoa_wimage_convert')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  const id = Date.now() + '_' + Math.random().toString(36).slice(2)
  const inputPath = join(tmpDir, `${id}_in`)
  const outputPath = join(tmpDir, `${id}_out.mp4`)

  try {
    const urlObj = new URL(url);
    const dynamicHeaders = { ...fetchHeaders, 'Referer': `${urlObj.protocol}//${urlObj.hostname}/` };
    const res = await fetch(url, { headers: dynamicHeaders })
    const dlBuffer = Buffer.from(await res.arrayBuffer())
    
    if (dlBuffer.slice(0, 4).toString('hex') === '3c21444f') throw new Error('Cloudflare bloqueó el video');
    fs.writeFileSync(inputPath, dlBuffer)

    let hasAudio = false
    try {
      const { stdout } = await execAsync(`ffprobe -v quiet -select_streams a -show_entries stream=codec_type -of csv=p=0 "${inputPath}"`, { timeout: 10000 })
      hasAudio = stdout.trim().includes('audio')
    } catch { hasAudio = false }

    const noAudio = !hasAudio || GIF_EXT_REGEX.test(originalName)
    const ffmpegCmd = noAudio
      ? `ffmpeg -y -i "${inputPath}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=15" -c:v libx264 -pix_fmt yuv420p -an "${outputPath}"`
      : `ffmpeg -y -i "${inputPath}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=24" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k "${outputPath}"`

    await execAsync(ffmpegCmd, { timeout: 30000 })
    const buffer = fs.readFileSync(outputPath)

    try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath) } catch {}
    return { buffer, hasAudio: !noAudio }
  } catch (error) {
    try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath) } catch {}
    throw error
  }
}

// 🔥 RECIBE OBJETO ENTERO PARA CREAR ETIQUETAS INTELIGENTES
const obtenerImagenGelbooru = async (personaje) => {
  if (personaje.imageUrl) {
    console.log(`[WIMAGE] ✅ Usando URL manual: ${personaje.name}`)
    return personaje.imageUrl
  }
  
  const tags = buildTagCandidates(personaje)
  if (!tags.length) return null
  
  console.log(`[WIMAGE] 🔍 Buscando con tags: ${tags.join(', ')}`)
  const previousUrl = recentMediaByCharacter.get(personaje.keyword || personaje.name || '') || ''

  const buscarEnApis = async (consulta) => {
    const tag = encodeURIComponent(consulta)
    
    try {
      console.log(`[WIMAGE] 📡 Intentando Delirius con: ${consulta}`)
      const data = await getJsonSafe(`https://api.delirius.store/search/gelbooru?query=${tag}`)
      const posts = Array.isArray(data?.data) ? data.data : []
      if (posts.length > 0) {
        const url = pickMediaFromPosts(posts, (p) => p?.image || null, previousUrl)
        if (url) { console.log(`[WIMAGE] ✅ Encontrado en Delirius`); return url }
      }
    } catch {}
    
    try {
      console.log(`[WIMAGE] 📡 Intentando SafeBooru con: ${consulta}`)
      const data = await getJsonSafe(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
      const posts = Array.isArray(data) ? data : (data?.post || [])
      if (posts.length > 0) {
        const url = pickMediaFromPosts(posts, (p) => {
          if (p?.file_url) return p.file_url.startsWith('http') ? p.file_url : `https://safebooru.org${p.file_url}`
          if (p?.directory && p?.image) return `https://safebooru.org/images/${p.directory}/${p.image}`
          return null
        }, previousUrl)
        if (url) { console.log(`[WIMAGE] ✅ Encontrado en SafeBooru`); return url }
      }
    } catch {}
    
    try {
      console.log(`[WIMAGE] 📡 Intentando Konachan con: ${consulta}`)
      const data = await getJsonSafe(`https://konachan.com/post.json?tags=${tag}&limit=50`)
      const posts = Array.isArray(data) ? data : []
      if (posts.length > 0) {
        const url = pickMediaFromPosts(posts, (p) => p?.file_url || p?.sample_url || null, previousUrl)
        if (url) { console.log(`[WIMAGE] ✅ Encontrado en Konachan`); return url }
      }
    } catch {}
    
    try {
      console.log(`[WIMAGE] 📡 Intentando Yande.re con: ${consulta}`)
      const data = await getJsonSafe(`https://yande.re/post.json?tags=${tag}&limit=50`)
      const posts = Array.isArray(data) ? data : []
      if (posts.length > 0) {
        const url = pickMediaFromPosts(posts, (p) => p?.file_url || p?.sample_url || null, previousUrl)
        if (url) { console.log(`[WIMAGE] ✅ Encontrado en Yande.re`); return url }
      }
    } catch {}
    
    return null
  }

  for (const currentTag of tags) {
    const exact = await buscarEnApis(currentTag)
    if (exact) {
      recentMediaByCharacter.set(personaje.keyword || personaje.name || '', exact)
      return exact
    }
  }
  
  console.log(`[WIMAGE] ⚠️ No se encontró imagen para ${personaje.name}`)
  return null
}

const loadCharacters = async () => JSON.parse(await fsp.readFile('./lib/characters.json', 'utf-8'))

function findSimilarCharacter(name, characters) {
  name = name.toLowerCase().trim()
  return characters.find((c) => c.name.toLowerCase() === name) || characters.find((c) => c.name.toLowerCase().includes(name)) || characters.find((c) => name.includes(c.name.toLowerCase()))
}

export default {
  command: ['charimage', 'wimage', 'cimage'],
  category: 'gacha',
  run: async ({ client, m, args }) => {
    const db = global.db.data
    const chatId = m.chat
    const chatData = db.chats[chatId]

    if (chatData?.adminonly || !chatData?.gacha) return m.reply(`🐲 Estos comandos están desactivados en este grupo. (◕︿◕)`)
    if (args.length === 0) return m.reply(`🐲 Por favor, proporciona el nombre de un personaje. (◕︿◕)`)

    try {
      const characterName = args.join(' ').toLowerCase().trim()
      const characters = await loadCharacters()
      const character = findSimilarCharacter(characterName, characters)

      if (!character) return m.reply(`🐲 No se ha encontrado el personaje *${characterName}*. (◕︿◕)`)

      const message = `╭─── ⋆🐉⋆ ───\n│ Char Info (◕ᴗ◕✿)\n├───────────────\n│ ❀ Nombre › *${character.name}*\n│ ❀ Género › *${character.gender}*\n│ ❀ Valor › *${character.value.toLocaleString()}*\n│ ❀ Fuente › *${character.source}*\n╰─── ⋆✨⋆ ───\n\n${global.dev || ''}`

      // 🔥 ENVIAMOS OBJETO ENTERO PARA ETIQUETAS INTELIGENTES
      const imagenUrl = await obtenerImagenGelbooru(character) 
      
      if (imagenUrl) {
        try {
          const mediaType = getMediaTypeByUrl(imagenUrl)
          if (mediaType === 'image') {
            const mediaBuffer = await smartFetchBuffer(imagenUrl)
            await client.sendMessage(chatId, { image: mediaBuffer, caption: message, mimetype: 'image/jpeg' }, { quoted: m })
          } else {
            const { buffer, hasAudio } = await convertToMp4(imagenUrl, imagenUrl)
            await client.sendMessage(chatId, { video: buffer, caption: message, ...(GIF_EXT_REGEX.test(imagenUrl) || !hasAudio ? { gifPlayback: true } : {}), mimetype: 'video/mp4' }, { quoted: m })
          }
        } catch (mediaError) {
          console.error('[WIMAGE] Error cargando media:', mediaError)
          await m.reply(message + "\n\n⚠️ *(No se pudo cargar la imagen)*")
        }
      } else {
        await m.reply(message + "\n\n⚠️ *(Sin imágenes disponibles)*")
      }
    } catch (error) {
      console.error('[WIMAGE] Error general:', error)
      await client.sendMessage(chatId, { text: global.msgglobal || "🐲 Error procesando." }, { quoted: m })
    }
  },
}
