import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'
import { fileURLToPath } from 'url'

const execPromise = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths
const INTERACTIONS_DIR = path.join(__dirname, '../../media/interactions')
const INTERACTIONS_JSON = path.join(__dirname, '../../media/interactions.json')

/**
 * ✅ Estilo Lucoa Mejorado:
 * - Se han agregado TODAS las reacciones que faltaban en 'captions'.
 * - Ahora funcionan comandos como #comer, #fumar, #enojado, etc.
 */

const captions = {
  // --- COMANDOS PURRBOT V2 (VERIFICADOS Y RÁPIDOS) ---
  kiss: (from, to) => from === to ? 'se mandó un beso al aire.' : 'le dio un beso a',
  hug: (from, to, genero) => from === to ? `se abrazó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'le dio un abrazo a',
  pat: (from, to) => from === to ? 'se acarició la cabeza con ternura.' : 'le dio una caricia a',
  poke: (from, to) => from === to ? 'se picó la cara.' : 'le picó la cara a',
  slap: (from, to, genero) => from === to ? `se dio una bofetada a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'le dio una bofetada a',
  bite: (from, to, genero) => from === to ? `se mordió ${genero === 'Hombre' ? 'solito' : genero === 'Mujer' ? 'solita' : 'solitx'}.` : 'mordió a',
  punch: (from, to) => from === to ? 'lanza golpes al aire.' : 'le dio un puñetazo a',
  kick: (from, to) => from === to ? 'se pateó a sí mismo.' : 'le dio una patada a',
  cuddle: (from, to, genero) => from === to ? `se acurrucó ${genero === 'Hombre' ? 'solo' : genero === 'Mujer' ? 'sola' : 'solx'}.` : 'se acurrucó con',
  dance: (from, to) => from === to ? 'está bailando.' : 'está bailando con',
  wave: (from, to, genero) => from === to ? `se saludó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} en el espejo.` : 'está saludando a',
  smile: (from, to) => from === to ? 'está sonriendo.' : 'le sonrió a',
  wink: (from, to, genero) => from === to ? `se guiñó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} en el espejo.` : 'le guiñó a',
  blush: (from, to) => from === to ? 'se sonrojó.' : 'se sonrojó por',
  cry: (from, to) => from === to ? 'está llorando.' : 'está llorando por',
  eat: (from, to) => from === to ? 'está comiendo algo rico.' : 'está comiendo con',

  // --- COMANDOS NEKOS.LIFE (FALLBACK) ---
  tickle: (from, to) => from === to ? 'se está haciéndose cosquillas.' : 'le hace cosquillas a',
  feed: (from, to) => from === to ? 'está comiendo.' : 'está alimentando a',
  meow: (from, to) => from === to ? 'está maullando.' : 'maúlla cerca de',
  neko: (from, to) => from === to ? 'está siendo un neko.' : 'es un neko para',
  lizard: (from, to) => from === to ? 'está siendo un lagarto.' : 'es un lagarto para',
  woof: (from, to) => from === to ? 'está ladrando.' : 'ladra cerca de',
  fox_girl: (from, to) => from === to ? 'está siendo una chica zorro.' : 'es una chica zorro para',
  smug: (from, to) => from === to ? 'está sonriendo altivamente.' : 'le sonríe altivamente a',
  lewd: (from, to) => from === to ? 'está siendo provocador.' : 'se está comportando de manera provocadora con',
  spank: (from, to, genero) => from === to ? `se nalgueó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'le dio una nalgada a',
  gasm: (from, to) => from === to ? 'está jadeando.' : 'hace jadear a',
  gecko: (from, to) => from === to ? 'está siendo un gecko.' : 'es un gecko para'
}

// Símbolos (Tu configuración)
const symbols = [
  '(⁠◠⁠‿⁠◕⁠)', '˃͈◡˂͈', '૮(˶ᵔᵕᵔ˶)ა', '(づ｡◕‿‿◕｡)づ', '(✿◡‿◡)', '(꒪⌓꒪)',
  '(✿✪‿✪｡)', '(*≧ω≦)', '(✧ω◕)', '˃ 𖥦 ˂', '(⌒‿⌒)', '(¬‿¬)', '(✧ω✧)',
  '✿(◕ ‿◕)✿', 'ʕ•́ᴥ•̀ʔっ', '(ㅇㅅㅇ❀)', '(∩︵∩)', '(✪ω✪)', '(✯◕‿◕✯)', '(•̀ᴗ•́)و ̑̑'
]

function getRandomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)]
}

// ===== DESCARGA BAJO DEMANDA (SIN CACHÉ LOCAL) =====

// Conversión GIF → MP4 (WhatsApp no reproduce GIFs inline, necesita MP4)
async function gifToMp4(gifBuffer) {
  try {
    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')
    const filename = `anime_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    const gifPath = `./tmp/${filename}.gif`
    const mp4Path = `./tmp/${filename}.mp4`
    await fs.promises.writeFile(gifPath, gifBuffer)
    await execPromise(`ffmpeg -y -i "${gifPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${mp4Path}"`)
    const mp4Buffer = await fs.promises.readFile(mp4Path)
    await fs.promises.unlink(gifPath).catch(() => {})
    await fs.promises.unlink(mp4Path).catch(() => {})
    return mp4Buffer
  } catch (e) {
    console.error('[Anime] Error convirtiendo GIF a MP4:', e.message)
    return gifBuffer
  }
}

// Detectar tipo de archivo por magic bytes
function getBufferType(buffer) {
  try {
    if (!Buffer.isBuffer(buffer)) return 'unknown'
    const magic = buffer.toString('hex', 0, 8).toUpperCase()
    if (magic.startsWith('474946')) return 'gif'
    if (magic.startsWith('89504E47')) return 'png'
    if (magic.startsWith('FFD8FF')) return 'jpg'
    if (magic.includes('66747970')) return 'mp4'
    if (magic.startsWith('1A45DFA3')) return 'webm'
    return 'unknown'
  } catch { return 'unknown' }
}

// Alias ES -> Command EN
const commandAliases = {
  // PurrBot v2
  besar: 'kiss',
  abrazar: 'hug',
  acariciar: 'pat',
  picar: 'poke',
  bofetada: 'slap',
  morder: 'bite',
  golpear: 'punch',
  patada: 'kick',
  acurrucar: 'cuddle',
  bailar: 'dance',
  saludar: 'wave',
  sonreir: 'smile',
  guiñar: 'wink',
  sonrojar: 'blush',
  llorar: 'cry',
  comer: 'eat',
  // Nekos.life
  hacercosquillas: 'tickle',
  cosquillas: 'tickle',
  alimentar: 'feed',
  maullar: 'meow',
  ladrar: 'woof',
  chicazorro: 'fox_girl',
  sonrisaaltiva: 'smug',
  provocador: 'lewd',
  nalgada: 'spank',
  jadear: 'gasm'
}

// Generamos la lista de comandos para el export
const englishCommands = Object.keys(captions)
const spanishAliases = Object.keys(commandAliases)

export default {
  command: [...englishCommands, ...spanishAliases],
  category: 'anime',
  
  run: async ({ client, m }) => {
    // 1. Validaciones
    if (!m.text || !globalThis.prefix || typeof globalThis.prefix.exec !== 'function') return
    const match = globalThis.prefix.exec(m.text)
    if (!match) return

    const usedPrefix = match[0]
    // Detectar comando y limpiar espacios
    const commandRaw = m.text.slice(usedPrefix.length).trim().split(' ')[0].toLowerCase()
    
    // Convertir Alias a Comando Base (ej: comer -> eat)
    const currentCommand = commandAliases[commandRaw] || commandRaw
    
    // Si no tenemos texto para ese comando, no hacemos nada
    if (!captions[currentCommand]) return

    // 2. Definir quién recibe la acción
    let who
    const texto = m.mentionedJid
    if (m.isGroup) {
      who = texto.length > 0 ? texto[0] : m.quoted ? m.quoted.sender : m.sender
    } else {
      who = m.quoted ? m.quoted.sender : m.sender
    }

    // 3. Nombres y Género
    const fromName = global.db.data.users[m.sender]?.name || 'Alguien'
    const toName = global.db.data.users[who]?.name || 'alguien'
    const genero = global.db.data.users[m.sender]?.genre || 'Oculto'

    // 4. Crear texto final
    const captionText = captions[currentCommand](fromName, toName, genero)
    const caption = who !== m.sender
        ? `@${m.sender.split('@')[0]} ${captionText} @${who.split('@')[0]} ${getRandomSymbol()}.`
        : `${fromName} ${captionText} ${getRandomSymbol()}.`

    // 5. Obtener Video/GIF - Cascada de APIs (SIN CACHÉ LOCAL)
    try {
      let mediaBuffer = null
      let mediaUrl = null

      // 🎬 DUAL API FALLBACK: fuentes directas por comando + PurrBot v2 → v1
      // PurrBot v2 (Primario): 19 comandos disponibles
      // PurrBot v1 (Fallback): 14 comandos disponibles
      // Para comandos sin endpoint directo en v2, se priorizan APIs con reacción real.
      
      // Mapeos para v2
      const purbotv2Map = {
        'kiss': 'kiss', 'hug': 'hug', 'pat': 'pat', 'poke': 'poke', 'slap': 'slap',
        'bite': 'bite', 'cuddle': 'cuddle', 'dance': 'dance', 'smile': 'smile',
        'blush': 'blush', 'cry': 'cry', 'tickle': 'tickle',
        'punch': 'slap', 'kick': 'slap', 'wave': 'smile', 'wink': 'smile', 'eat': 'comfy',
        'feed': 'lay', 'meow': 'smile', 'neko': 'tail', 'lizard': 'pout', 'woof': 'dance',
        'fox_girl': 'tail', 'smug': 'smile', 'lewd': 'lick', 'spank': 'slap', 'gasm': 'pout', 'gecko': 'tail'
      }
      
      // Mapeos para v1 (fallback cuando v2 falla)
      const purbotv1Map = {
        // Directos (disponibles en v1)
        'kiss': 'kiss', 'hug': 'hug', 'pat': 'pat', 'poke': 'poke', 'slap': 'slap',
        'bite': 'bite', 'cuddle': 'cuddle', 'dance': 'dance', 'smile': 'smile',
        'blush': 'blush', 'cry': 'cry', 'tickle': 'tickle', 'feed': 'feed', 'neko': 'neko',
        
        // Mapeados (no existen en v1 exacto)
        'punch': 'slap', 'kick': 'slap', 'wave': 'smile', 'wink': 'smile', 'eat': 'smile',
        'meow': 'smile', 'lizard': 'smile', 'woof': 'dance', 'fox_girl': 'neko',
        'smug': 'smile', 'lewd': 'smile', 'spank': 'slap', 'gasm': 'smile', 'gecko': 'neko'
      }

      const directReactionApis = {
        punch: [
          'https://nekos.best/api/v2/punch',
          'https://api.otakugifs.xyz/gif?reaction=punch'
        ],
        kick: [
          'https://nekos.best/api/v2/kick'
        ],
        wave: [
          'https://nekos.best/api/v2/wave',
          'https://api.otakugifs.xyz/gif?reaction=wave'
        ],
        wink: [
          'https://nekos.best/api/v2/wink'
        ],
        feed: [
          'https://nekos.best/api/v2/feed'
        ],
        neko: [
          'https://nekos.best/api/v2/neko'
        ],
        smug: [
          'https://nekos.best/api/v2/smug',
          'https://api.otakugifs.xyz/gif?reaction=smug'
        ]
      }

      // Prioriza reacción real cuando existe endpoint dedicado.
      const fetchDirectReaction = async (cmd) => {
        const apis = directReactionApis[cmd]
        if (!apis?.length) return null

        for (const api of apis) {
          try {
            const res = await fetch(api, { timeout: 5000 })
            if (!res.ok) continue
            const json = await res.json().catch(() => ({}))
            const url = json?.results?.[0]?.url || json?.url || json?.link
            if (url) return url
          } catch (e) {
            console.warn(`[Anime] API directa falló para ${cmd} (${api}): ${e.message}`)
          }
        }

        return null
      }

      // Función para intentar ambas APIs de PurrBot
      const fetchFromPurrBot = async (cmd) => {
        let url = null
        
        // 1️⃣ Intenta PurrBot v2 primero
        if (purbotv2Map[cmd]) {
          try {
            const v2Endpoint = purbotv2Map[cmd]
            const res = await fetch(`https://api.purrbot.site/v2/img/sfw/${v2Endpoint}/gif`, { timeout: 5000 })
            if (res.ok) {
              const json = await res.json().catch(() => ({}))
              if (json?.link) return json.link
            }
          } catch (e) {
            console.warn(`[Anime] v2 intento falló para ${cmd}: ${e.message}`)
          }
        }
        
        // 2️⃣ Fallback a PurrBot v1
        if (purbotv1Map[cmd]) {
          try {
            const v1Endpoint = purbotv1Map[cmd]
            const res = await fetch(`https://purrbot.site/api/img/sfw/${v1Endpoint}/gif`, { timeout: 5000 })
            if (res.ok) {
              const json = await res.json().catch(() => ({}))
              if (json?.link) {
                console.log(`[Anime] ${cmd} obtenido desde PurrBot v1 (fallback)`)
                return json.link
              }
            }
          } catch (e) {
            console.warn(`[Anime] v1 intento falló para ${cmd}: ${e.message}`)
          }
        }
        
        return null
      }

      // Ruta especial para comandos con endpoint directo (coherencia visual del comando)
      mediaUrl = await fetchDirectReaction(currentCommand)

      // Fallback general
      if (!mediaUrl && (purbotv2Map[currentCommand] || purbotv1Map[currentCommand])) {
        mediaUrl = await fetchFromPurrBot(currentCommand)
      }

      if (!mediaUrl) throw new Error('No se pudo obtener GIF de PurrBot v2 o v1')

      // Descargar desde URL obtenida
      const mediaRes = await fetch(mediaUrl)
      const arrayBuf = await mediaRes.arrayBuffer()
      mediaBuffer = Buffer.from(arrayBuf)

      if (!mediaBuffer) throw new Error('Buffer vacío')
      
      const mentions = [...new Set([who, m.sender])].filter(Boolean)
      const type = getBufferType(mediaBuffer)
      let msgOptions = { caption: caption, mentions: mentions }

      if (type === 'gif') {
        // GIF → MP4 para que WhatsApp lo reproduzca inline
        const mp4Buffer = await gifToMp4(mediaBuffer)
        msgOptions.video = mp4Buffer
        msgOptions.gifPlayback = true
      } else if (type === 'mp4' || type === 'webm') {
        msgOptions.video = mediaBuffer
        msgOptions.gifPlayback = true
      } else if (type === 'jpg' || type === 'png') {
        // ⚠️ Si recibimos PNG/JPG estático, lo enviamos como imagen
        // pero esto NO debería ocurrir con PurrBot v2
        msgOptions.image = mediaBuffer
      } else {
        // Fallback: intentar como video
        msgOptions.video = mediaBuffer
        msgOptions.gifPlayback = true
      }

      await client.sendMessage(m.chat, msgOptions, { quoted: m })

    } catch (e) {
      console.error(e)
      // Mensaje de error discreto
      await m.reply('🐲 No se pudo cargar la reacción. (╥﹏╥)')
    }
  },
}
