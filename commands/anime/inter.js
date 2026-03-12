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
  // --- TUS REACCIONES ORIGINALES ---
  peek: (from, to) => from === to ? 'está espiando detrás de una puerta por diversión.' : 'está espiando a',
  stare: (from, to) => from === to ? 'se queda mirando al techo sin razón.' : 'se queda mirando fijamente a',
  trip: (from, to) => from === to ? 'se tropezó consigo mismo, otra vez.' : 'tropezó accidentalmente con',
  sleep: (from, to) => from === to ? 'está durmiendo plácidamente.' : 'está durmiendo con',
  sing: (from, to) => from === to ? 'está cantando.' : 'le está cantando a',
  tickle: (from, to) => from === to ? 'se está haciendo cosquillas.' : 'le está haciendo cosquillas a',
  slap: (from, to, genero) => from === to ? `se dio una bofetada a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'le dio una bofetada a',
  kill: (from, to) => from === to ? 'se autoeliminó en modo dramático.' : 'asesinó a',
  kiss: (from, to) => from === to ? 'se mandó un beso al aire.' : 'le dio un beso a',
  hug: (from, to, genero) => from === to ? `se abrazó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'le dio un abrazo a',
  pat: (from, to) => from === to ? 'se acarició la cabeza con ternura.' : 'le dio una caricia a',
  lick: (from, to) => from === to ? 'se lamió por curiosidad.' : 'lamió a',
  cry: (from, to) => from === to ? 'está llorando.' : 'está llorando por',
  blush: (from, to) => from === to ? 'se sonrojó.' : 'se sonrojó por',
  smile: (from, to) => from === to ? 'está sonriendo.' : 'le sonrió a',
  wave: (from, to, genero) => from === to ? `se saludó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} en el espejo.` : 'está saludando a',
  highfive: (from, to) => from === to ? 'se chocó los cinco frente al espejo.' : 'chocó los 5 con',
  dance: (from, to) => from === to ? 'está bailando.' : 'está bailando con',
  wink: (from, to, genero) => from === to ? `se guiñó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} en el espejo.` : 'le guiñó a',
  happy: (from, to) => from === to ? 'está feliz.' : 'está feliz con',
  cuddle: (from, to, genero) => from === to ? `se acurrucó ${genero === 'Hombre' ? 'solo' : genero === 'Mujer' ? 'sola' : 'solx'}.` : 'se acurrucó con',
  poke: (from, to) => from === to ? 'se picó la cara.' : 'le picó la cara a',
  bite: (from, to, genero) => from === to ? `se mordió ${genero === 'Hombre' ? 'solito' : genero === 'Mujer' ? 'solita' : 'solitx'}.` : 'mordió a',

  // --- REACCIONES QUE FALTABAN (Agregadas de la base) ---
  angry: (from, to, genero) => from === to ? `está muy ${genero === 'Hombre' ? 'enojado' : 'enojada'}.` : `está muy ${genero === 'Hombre' ? 'enojado' : 'enojada'} con`,
  bleh: (from, to) => from === to ? 'se sacó la lengua frente al espejo.' : 'le está haciendo muecas con la lengua a',
  bored: (from, to, genero) => from === to ? `está muy ${genero === 'Hombre' ? 'aburrido' : 'aburrida'}.` : `está ${genero === 'Hombre' ? 'aburrido' : 'aburrida'} de`,
  bonk: (from, to) => from === to ? 'se golpeó la cabeza.' : 'le dio un golpe a',
  bully: (from, to) => from === to ? 'se hace bullying solo.' : 'le está haciendo bullying a',
  coffee: (from, to) => from === to ? 'está tomando café.' : 'está tomando café con',
  clap: (from, to) => from === to ? 'está aplaudiendo.' : 'le aplaude a',
  cringe: (from, to) => from === to ? 'siente cringe.' : 'siente cringe por',
  drunk: (from, to) => from === to ? 'está borracho/a.' : 'está borracho/a con',
  dramatic: (from, to) => from === to ? 'hace drama.' : 'le hace un drama a',
  handhold: (from, to) => from === to ? 'se agarra la mano.' : 'le agarró la mano a',
  eat: (from, to) => from === to ? 'está comiendo algo rico.' : 'está comiendo con',
  kill: (from, to) => from === to ? 'se murió.' : 'asesinó a',
  love: (from, to) => from === to ? 'se quiere mucho.' : 'siente amor por',
  pout: (from, to) => from === to ? 'hace pucheros.' : 'le hace pucheros a',
  punch: (from, to) => from === to ? 'lanza golpes al aire.' : 'le dio un puñetazo a',
  run: (from, to) => from === to ? 'sale corriendo.' : 'huye de',
  scared: (from, to) => from === to ? 'está asustado/a.' : 'tiene miedo de',
  sad: (from, to) => from === to ? 'está triste.' : 'está triste por',
  smoke: (from, to) => from === to ? 'fuma un cigarro.' : 'fuma con',
  spit: (from, to) => from === to ? 'escupió al suelo.' : 'le escupió a',
  smug: (from, to) => from === to ? 'presume.' : 'presume ante',
  think: (from, to) => from === to ? 'piensa...' : 'piensa en',
  walk: (from, to) => from === to ? 'camina solo/a.' : 'camina con',
  impregnate: (from, to) => from === to ? 'se embarazó.' : 'embarazó a',
  confused: (from, to) => from === to ? 'está confundido.' : 'está confundido por',
  seduce: (from, to) => from === to ? 'se seduce solo.' : 'intenta seducir a',
  shy: (from, to) => from === to ? 'es timido/a.' : 'es timido/a con',

  // --- NUEVOS COMANDOS (10+) ---
  kick: (from, to) => from === to ? 'se pateó a sí mismo.' : 'le dio una patada a',
  splash: (from, to) => from === to ? 'se salpicar el agua.' : 'le salpicó agua a',
  grab: (from, to) => from === to ? 'se agarró a sí mismo.' : 'agarró a',
  flick: (from, to) => from === to ? 'se dio un coscorrón.' : 'le dio un coscorrón a',
  comfort: (from, to) => from === to ? 'se consuela a sí mismo.' : 'está consolando a',
  freeze: (from, to) => from === to ? 'está congelado/a.' : 'congeló a',
  shock: (from, to) => from === to ? 'está sorprendido/a.' : 'sorprendió a',
  bite_head: (from, to) => from === to ? 'se mordió la cabeza.' : 'le mordió la cabeza a',
  slurp: (from, to) => from === to ? 'está sorbing algo delicioso.' : 'sorbe a',
  knead: (from, to) => from === to ? 'está amasando el aire.' : 'le hace amasada a',
  celebrate: (from, to) => from === to ? 'está celebrando su victoria.' : 'está celebrando con'
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

// ===== NUEVA FUNCIONALIDAD: CARGAR INTERACCIONES LOCALES =====

// Cargar índice de interacciones locales
let localInteractionsCache = null

function loadLocalInteractions() {
  if (localInteractionsCache) return localInteractionsCache

  const cache = {}
  try {
    if (fs.existsSync(INTERACTIONS_JSON)) {
      const data = JSON.parse(fs.readFileSync(INTERACTIONS_JSON, 'utf8'))
      Object.entries(data).forEach(([cmd, info]) => {
        cache[cmd] = info.local || []
      })
    }
  } catch (e) {
    console.warn('[Anime] Error loading interactions.json:', e.message)
  }

  localInteractionsCache = cache
  return cache
}

// Obtener archivo local aleatorio
function getLocalMedia(command) {
  const cache = loadLocalInteractions()
  const files = cache[command] || []

  if (files.length === 0) return null

  const randomFile = files[Math.floor(Math.random() * files.length)]
  const filePath = path.join(__dirname, '../../', randomFile)

  if (fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath)
    } catch (e) {
      console.error('[Anime] Error reading local file:', e.message)
      return null
    }
  }

  return null
}

// Guardar archivo descargado localmente (auto-cache)
function saveMediaLocally(command, buffer) {
  try {
    if (!fs.existsSync(INTERACTIONS_DIR)) {
      fs.mkdirSync(INTERACTIONS_DIR, { recursive: true })
    }

    const commandDir = path.join(INTERACTIONS_DIR, command)
    if (!fs.existsSync(commandDir)) {
      fs.mkdirSync(commandDir, { recursive: true })
    }

    // Detectar tipo de archivo
    const ext = getBufferType(buffer)
    if (ext === 'unknown') return

    // Guardar con nombre secuencial
    const files = fs.readdirSync(commandDir)
    const fileNum = files.length + 1
    const fileName = `${fileNum}.${ext}`
    const filePath = path.join(commandDir, fileName)

    fs.writeFileSync(filePath, buffer)

    // Actualizar interactions.json
    if (fs.existsSync(INTERACTIONS_JSON)) {
      const data = JSON.parse(fs.readFileSync(INTERACTIONS_JSON, 'utf8'))
      if (!data[command]) {
        data[command] = { local: [], fallback: true }
      }

      const relPath = `media/interactions/${command}/${fileName}`
      if (!data[command].local.includes(relPath)) {
        data[command].local.push(relPath)
        fs.writeFileSync(INTERACTIONS_JSON, JSON.stringify(data, null, 2))
      }
    }
  } catch (e) {
    console.error('[Anime] Error saving media locally:', e.message)
  }
}

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
// (Agregué los que faltaban para que coincidan con los textos de arriba)
const commandAliases = {
  mirar: 'stare', espiar: 'peek', tropezar: 'trip', dormir: 'sleep',
  cantar: 'sing', cosquillas: 'tickle', bofetada: 'slap', matar: 'kill',
  besar: 'kiss', abrazar: 'hug', acariciar: 'pat', lamer: 'lick',
  llorar: 'cry', sonrojar: 'blush', sonreir: 'smile', saludar: 'wave',
  chocar: 'highfive', bailar: 'dance', guiñar: 'wink', feliz: 'happy',
  acurrucar: 'cuddle', picar: 'poke', morder: 'bite',
  // Nuevos:
  comer: 'eat', fumar: 'smoke', enojado: 'angry', aburrido: 'bored',
  golpear: 'punch', correr: 'run', asustado: 'scared', triste: 'sad',
  cafe: 'coffee', presumir: 'smug', pensar: 'think', escupir: 'spit',
  caminar: 'walk', embarazar: 'impregnate', timido: 'shy', seducir: 'seduce',
  // Nuevos comandos:
  patada: 'kick', salpicar: 'splash', agarrar: 'grab', coscorron: 'flick',
  consolar: 'comfort', congelar: 'freeze', sorpresa: 'shock',
  morder_cabeza: 'bite_head', sorber: 'slurp', amasar: 'knead', celebrar: 'celebrate'
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

    // 5. Obtener Video/GIF (Primero local, luego remoto)
    try {
      let mediaBuffer = null

      // OPCIÓN 1: Buscar en /media/interactions/ local
      mediaBuffer = getLocalMedia(currentCommand)
      if (mediaBuffer) {
        console.log(`[Anime] Using local media for ${currentCommand}`)
      }

      // OPCIÓN 2: Fallback a API remota (si no tiene local)
      if (!mediaBuffer) {
        let mediaUrl = null

        // Opción A: API del Bot (si existe)
        if (typeof api !== 'undefined' && api?.url) {
          const response = await fetch(
            `${api.url}/sfw/interaction?type=${currentCommand}${api.key ? `&key=${api.key}` : ''}`
          )
          const json = await response.json().catch(() => ({}))
          mediaUrl = json?.result || json?.url
        }

        // Opción B: Fallback a Waifu.pics
        if (!mediaUrl) {
          let apiCmd = currentCommand
          if (apiCmd === 'eat') apiCmd = 'nom'

          let res = await fetch(`https://api.waifu.pics/sfw/${apiCmd}`)
          if (!res.ok) res = await fetch(`https://api.waifu.pics/sfw/neko`)

          const json = await res.json().catch(() => ({}))
          mediaUrl = json?.url
        }

        if (!mediaUrl) throw new Error('No media url')

        // Descargar
        const mediaRes = await fetch(mediaUrl)
        const arrayBuf = await mediaRes.arrayBuffer()
        mediaBuffer = Buffer.from(arrayBuf)

        // Auto-guardar localmente (futuro caché)
        saveMediaLocally(currentCommand, mediaBuffer)
        console.log(`[Anime] Downloaded and cached: ${currentCommand}`)
      }

      if (!mediaBuffer) throw new Error('No media buffer')
      
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
