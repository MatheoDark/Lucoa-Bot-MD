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
  kickanime: (from, to) => from === to ? 'se pateó a sí mismo.' : 'le dio una patada a',
  cuddle: (from, to, genero) => from === to ? `se acurrucó ${genero === 'Hombre' ? 'solo' : genero === 'Mujer' ? 'sola' : 'solx'}.` : 'se acurrucó con',
  dance: (from, to) => from === to ? 'está bailando.' : 'está bailando con',
  run: (from, to) => from === to ? 'salió a correr.' : 'salió a correr con',
  kill: (from, to) => from === to ? 'está en modo caos.' : 'acabó con',
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
  gecko: (from, to) => from === to ? 'está siendo un gecko.' : 'es un gecko para',

  // --- COMANDOS EXTRA (PurrBot/Nekos.best) ---
  angry: (from, to) => from === to ? 'está enojado.' : 'se enojó con',
  fluff: (from, to) => from === to ? 'está esponjoso y feliz.' : 'se puso esponjoso con',
  lick: (from, to) => from === to ? 'se lamió.' : 'lamió a',
  pout: (from, to) => from === to ? 'está haciendo puchero.' : 'le hizo puchero a',
  tail: (from, to) => from === to ? 'mueve la cola.' : 'mueve la cola para',
  comfy: (from, to) => from === to ? 'está cómodo descansando.' : 'está cómodo junto a',
  highfive: (from, to) => from === to ? 'se chocó los cinco en el aire.' : 'le chocó los cinco a',
  handhold: (from, to) => from === to ? 'se tomó de su propia mano.' : 'tomó de la mano a',
  nom: (from, to) => from === to ? 'está haciendo nom nom.' : 'le hizo nom nom a',
  laugh: (from, to) => from === to ? 'se está riendo.' : 'se rió con',
  yeet: (from, to) => from === to ? 'se lanzó al aire.' : 'lanzó a',
  shrug: (from, to) => from === to ? 'se encogió de hombros.' : 'se encogió de hombros ante',
  stare: (from, to) => from === to ? 'se quedó mirando fijo.' : 'miró fijamente a',
  think: (from, to) => from === to ? 'está pensando.' : 'se quedó pensando en',
  peck: (from, to) => from === to ? 'dio un besito al aire.' : 'le dio un besito a',
  bite_head: (from, to) => from === to ? 'hizo una mordida al aire.' : 'le mordió la cabeza a',
  bleh: (from, to) => from === to ? 'sacó la lengua.' : 'le sacó la lengua a',
  bonk: (from, to) => from === to ? 'se dio un golpecito.' : 'le dio un bonk a',
  bored: (from, to) => from === to ? 'está aburrido.' : 'se aburrió con',
  bully: (from, to) => from === to ? 'está en modo bully consigo mismo.' : 'molestó a',
  celebrate: (from, to) => from === to ? 'está celebrando.' : 'celebró con',
  clap: (from, to) => from === to ? 'se aplaudió.' : 'le aplaudió a',
  coffee: (from, to) => from === to ? 'se tomó un café.' : 'invitó un café a',
  comfort: (from, to) => from === to ? 'se consoló.' : 'consoló a',
  confused: (from, to) => from === to ? 'está confundido.' : 'quedó confundido por',
  cringe: (from, to) => from === to ? 'sintió cringe.' : 'sintió cringe por',
  dramatic: (from, to) => from === to ? 'está en modo dramático.' : 'hizo drama con',
  drunk: (from, to) => from === to ? 'está borracho.' : 'se emborrachó con',
  flick: (from, to) => from === to ? 'se dio un flick.' : 'le hizo flick a',
  freeze: (from, to) => from === to ? 'se quedó congelado.' : 'congeló a',
  grab: (from, to) => from === to ? 'se agarró a sí mismo.' : 'agarró a',
  happy: (from, to) => from === to ? 'está feliz.' : 'se puso feliz con',
  impregnate: (from, to) => from === to ? 'está en modo intenso.' : 'fue intenso con',
  knead: (from, to) => from === to ? 'está amasando.' : 'amasó a',
  love: (from, to) => from === to ? 'se ama a sí mismo.' : 'demostró amor a',
  sad: (from, to) => from === to ? 'está triste.' : 'se puso triste por',
  scared: (from, to) => from === to ? 'está asustado.' : 'se asustó de',
  seduce: (from, to) => from === to ? 'intentó seducirse.' : 'sedujo a',
  shock: (from, to) => from === to ? 'quedó en shock.' : 'dejó en shock a',
  shy: (from, to) => from === to ? 'está tímido.' : 'se puso tímido con',
  sing: (from, to) => from === to ? 'está cantando.' : 'le cantó a',
  sleep: (from, to) => from === to ? 'se quedó dormido.' : 'se durmió junto a',
  slurp: (from, to) => from === to ? 'está sorbiendo.' : 'sorbió a',
  smoke: (from, to) => from === to ? 'está fumando.' : 'fumó con',
  spit: (from, to) => from === to ? 'escupió al aire.' : 'escupió a',
  splash: (from, to) => from === to ? 'se salpicó agua.' : 'salpicó agua a',
  trip: (from, to) => from === to ? 'se tropezó.' : 'tropezó cerca de',
  walk: (from, to) => from === to ? 'salió a caminar.' : 'caminó con',
  peek: (from, to) => from === to ? 'se asomó discretamente.' : 'se asomó a mirar a'
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
  patada: 'kickanime',
  patear: 'kickanime',
  acurrucar: 'cuddle',
  bailar: 'dance',
  correr: 'run',
  matar: 'kill',
  decapitar: 'kill',
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
  jadear: 'gasm',

  // Extras
  enojado: 'angry',
  furioso: 'angry',
  esponjoso: 'fluff',
  lamer: 'lick',
  puchero: 'pout',
  cola: 'tail',
  comodo: 'comfy',
  choquepalmas: 'highfive',
  tomarmano: 'handhold',
  reir: 'laugh',
  lanzar: 'yeet',
  encoger: 'shrug',
  mirar: 'stare',
  pensar: 'think',
  besito: 'peck',

  // Extras agregados
  morderescarabajo: 'bite_head',
  burla: 'bleh',
  golpecito: 'bonk',
  aburrido: 'bored',
  acosar: 'bully',
  celebrar: 'celebrate',
  aplaudir: 'clap',
  cafe: 'coffee',
  consolar: 'comfort',
  confundido: 'confused',
  verguenza: 'cringe',
  dramatica: 'dramatic',
  dramatico: 'dramatic',
  borracho: 'drunk',
  flequillo: 'flick',
  congelar: 'freeze',
  agarrar: 'grab',
  feliz: 'happy',
  embarazar: 'impregnate',
  amasar: 'knead',
  amar: 'love',
  triste: 'sad',
  asustado: 'scared',
  seducir: 'seduce',
  timido: 'shy',
  cantar: 'sing',
  dormir: 'sleep',
  sorber: 'slurp',
  fumar: 'smoke',
  escupir: 'spit',
  salpicar: 'splash',
  tropezar: 'trip',
  caminar: 'walk',
  mirar_escondidas: 'peek',
  sonrojarse: 'blush'
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
        'bite': 'bite', 'cuddle': 'cuddle', 'dance': 'dance', 'run': 'smile', 'smile': 'smile',
        'kill': 'angry',
        'blush': 'blush', 'cry': 'cry', 'tickle': 'tickle',
        'angry': 'angry', 'fluff': 'fluff', 'lick': 'lick', 'pout': 'pout', 'tail': 'tail', 'comfy': 'comfy',
        'punch': 'slap', 'kickanime': 'slap', 'wave': 'smile', 'wink': 'smile', 'eat': 'comfy',
        'feed': 'lay', 'meow': 'smile', 'neko': 'tail', 'lizard': 'pout', 'woof': 'dance',
        'fox_girl': 'tail', 'smug': 'smile', 'lewd': 'lick', 'spank': 'slap', 'gasm': 'pout', 'gecko': 'tail',
        'highfive': 'smile', 'handhold': 'hug', 'nom': 'comfy', 'laugh': 'smile',
        'yeet': 'dance', 'shrug': 'pout', 'stare': 'pout', 'think': 'pout', 'peck': 'kiss',

        // Extras agregados
        'bite_head': 'bite', 'bleh': 'pout', 'bonk': 'slap', 'bored': 'comfy',
        'bully': 'angry', 'celebrate': 'smile', 'clap': 'smile', 'coffee': 'comfy',
        'comfort': 'hug', 'confused': 'pout', 'cringe': 'pout', 'dramatic': 'pout',
        'drunk': 'smile', 'flick': 'slap', 'freeze': 'pout', 'grab': 'hug',
        'happy': 'smile', 'impregnate': 'pout', 'knead': 'pat', 'love': 'cuddle',
        'sad': 'cry', 'scared': 'pout', 'seduce': 'wink', 'shock': 'pout',
        'shy': 'blush', 'sing': 'dance', 'sleep': 'comfy', 'slurp': 'lick',
        'smoke': 'smug', 'spit': 'pout', 'splash': 'wave', 'trip': 'run',
        'walk': 'run', 'peek': 'stare'
      }
      
      // Mapeos para v1 (fallback cuando v2 falla)
      const purbotv1Map = {
        // Directos (disponibles en v1)
        'kiss': 'kiss', 'hug': 'hug', 'pat': 'pat', 'poke': 'poke', 'slap': 'slap',
        'bite': 'bite', 'cuddle': 'cuddle', 'dance': 'dance', 'run': 'smile', 'smile': 'smile', 'kill': 'slap',
        'blush': 'blush', 'cry': 'cry', 'tickle': 'tickle', 'feed': 'feed', 'neko': 'neko',
        
        // Mapeados (no existen en v1 exacto)
        'angry': 'smile', 'fluff': 'smile', 'lick': 'smile', 'pout': 'smile', 'tail': 'neko', 'comfy': 'smile',
        'punch': 'slap', 'kickanime': 'slap', 'wave': 'smile', 'wink': 'smile', 'eat': 'smile',
        'meow': 'smile', 'lizard': 'smile', 'woof': 'dance', 'fox_girl': 'neko',
        'smug': 'smile', 'lewd': 'smile', 'spank': 'slap', 'gasm': 'smile', 'gecko': 'neko',
        'highfive': 'smile', 'handhold': 'hug', 'nom': 'smile', 'laugh': 'smile',
        'yeet': 'dance', 'shrug': 'smile', 'stare': 'smile', 'think': 'smile', 'peck': 'kiss',

        // Extras agregados
        'bite_head': 'bite', 'bleh': 'smile', 'bonk': 'slap', 'bored': 'smile',
        'bully': 'slap', 'celebrate': 'smile', 'clap': 'smile', 'coffee': 'smile',
        'comfort': 'hug', 'confused': 'smile', 'cringe': 'smile', 'dramatic': 'smile',
        'drunk': 'smile', 'flick': 'slap', 'freeze': 'smile', 'grab': 'hug',
        'happy': 'smile', 'impregnate': 'smile', 'knead': 'pat', 'love': 'hug',
        'sad': 'cry', 'scared': 'smile', 'seduce': 'smile', 'shock': 'smile',
        'shy': 'blush', 'sing': 'dance', 'sleep': 'smile', 'slurp': 'smile',
        'smoke': 'smile', 'spit': 'smile', 'splash': 'smile', 'trip': 'smile',
        'walk': 'smile', 'peek': 'smile'
      }

      const directReactionApis = {
        punch: [
          'https://nekos.best/api/v2/punch',
          'https://api.otakugifs.xyz/gif?reaction=punch'
        ],
        kickanime: [
          'https://nekos.best/api/v2/kick'
        ],
        wave: [
          'https://nekos.best/api/v2/wave',
          'https://api.otakugifs.xyz/gif?reaction=wave'
        ],
        run: [
          'https://nekos.best/api/v2/run',
          'https://api.otakugifs.xyz/gif?reaction=run'
        ],
        kill: [
          'https://api.otakugifs.xyz/gif?reaction=kill'
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
        ],
        highfive: [
          'https://nekos.best/api/v2/highfive'
        ],
        handhold: [
          'https://nekos.best/api/v2/handhold'
        ],
        nom: [
          'https://nekos.best/api/v2/nom'
        ],
        laugh: [
          'https://nekos.best/api/v2/laugh'
        ],
        yeet: [
          'https://nekos.best/api/v2/yeet'
        ],
        shrug: [
          'https://nekos.best/api/v2/shrug'
        ],
        stare: [
          'https://nekos.best/api/v2/stare'
        ],
        think: [
          'https://nekos.best/api/v2/think'
        ],
        peck: [
          'https://nekos.best/api/v2/peck'
        ],

        // Extras agregados
        bite_head: [
          'https://api.otakugifs.xyz/gif?reaction=bite'
        ],
        bleh: [
          'https://api.otakugifs.xyz/gif?reaction=bleh'
        ],
        bonk: [
          'https://api.otakugifs.xyz/gif?reaction=bonk'
        ],
        bored: [
          'https://api.otakugifs.xyz/gif?reaction=bored'
        ],
        bully: [
          'https://api.otakugifs.xyz/gif?reaction=bully'
        ],
        celebrate: [
          'https://api.otakugifs.xyz/gif?reaction=happy'
        ],
        clap: [
          'https://api.otakugifs.xyz/gif?reaction=clap'
        ],
        coffee: [
          'https://api.otakugifs.xyz/gif?reaction=coffee'
        ],
        comfort: [
          'https://api.otakugifs.xyz/gif?reaction=comfort'
        ],
        confused: [
          'https://api.otakugifs.xyz/gif?reaction=confused'
        ],
        cringe: [
          'https://api.otakugifs.xyz/gif?reaction=cringe'
        ],
        dramatic: [
          'https://api.otakugifs.xyz/gif?reaction=dramatic'
        ],
        drunk: [
          'https://api.otakugifs.xyz/gif?reaction=drunk'
        ],
        flick: [
          'https://api.otakugifs.xyz/gif?reaction=flick'
        ],
        freeze: [
          'https://api.otakugifs.xyz/gif?reaction=freeze'
        ],
        grab: [
          'https://api.otakugifs.xyz/gif?reaction=grab'
        ],
        happy: [
          'https://api.otakugifs.xyz/gif?reaction=happy'
        ],
        impregnate: [
          'https://api.otakugifs.xyz/gif?reaction=seduce'
        ],
        knead: [
          'https://api.otakugifs.xyz/gif?reaction=knead'
        ],
        love: [
          'https://api.otakugifs.xyz/gif?reaction=love'
        ],
        sad: [
          'https://api.otakugifs.xyz/gif?reaction=sad'
        ],
        scared: [
          'https://api.otakugifs.xyz/gif?reaction=scared'
        ],
        seduce: [
          'https://api.otakugifs.xyz/gif?reaction=seduce'
        ],
        shock: [
          'https://api.otakugifs.xyz/gif?reaction=shock'
        ],
        shy: [
          'https://api.otakugifs.xyz/gif?reaction=shy'
        ],
        sing: [
          'https://api.otakugifs.xyz/gif?reaction=sing'
        ],
        sleep: [
          'https://api.otakugifs.xyz/gif?reaction=sleep'
        ],
        slurp: [
          'https://api.otakugifs.xyz/gif?reaction=lick'
        ],
        smoke: [
          'https://api.otakugifs.xyz/gif?reaction=smoke'
        ],
        spit: [
          'https://api.otakugifs.xyz/gif?reaction=spit'
        ],
        splash: [
          'https://api.otakugifs.xyz/gif?reaction=splash'
        ],
        trip: [
          'https://api.otakugifs.xyz/gif?reaction=trip'
        ],
        walk: [
          'https://api.otakugifs.xyz/gif?reaction=walk'
        ],
        peek: [
          'https://api.otakugifs.xyz/gif?reaction=peek'
        ]
      }

      // Para mantener coherencia, primero intentamos la reacción real por nombre.
      const reactionAliasMap = {
        kickanime: 'kick',
        bite_head: 'bite',
        impregnate: 'seduce',
        slurp: 'lick'
      }

      const extractReactionUrl = (json = {}) => json?.results?.[0]?.url || json?.url || json?.link

      const tryReactionApiByName = async (reactionName) => {
        const endpoints = [
          `https://api.otakugifs.xyz/gif?reaction=${reactionName}`,
          `https://nekos.best/api/v2/${reactionName}`
        ]

        for (const endpoint of endpoints) {
          try {
            const res = await fetch(endpoint, { timeout: 5000 })
            if (!res.ok) continue
            const json = await res.json().catch(() => ({}))
            const url = extractReactionUrl(json)
            if (url) return url
          } catch {
            // Si falla una fuente, seguimos con la siguiente.
          }
        }

        return null
      }

      const fetchDirectReaction = async (cmd) => {
        const apis = directReactionApis[cmd] || []

        // 1) Endpoints explícitos conocidos para ese comando.
        for (const api of apis) {
          try {
            const res = await fetch(api, { timeout: 5000 })
            if (!res.ok) continue
            const json = await res.json().catch(() => ({}))
            const url = extractReactionUrl(json)
            if (url) return url
          } catch (e) {
            console.warn(`[Anime] API directa falló para ${cmd} (${api}): ${e.message}`)
          }
        }

        // 2) Intento genérico con el nombre real del comando.
        let url = await tryReactionApiByName(cmd)
        if (url) return url

        // 3) Intento con alias de reacción cuando el nombre interno difiere.
        const altReaction = reactionAliasMap[cmd]
        if (altReaction) {
          url = await tryReactionApiByName(altReaction)
          if (url) return url
        }

        return null
      }

      // Función para intentar ambas APIs de PurrBot
      const fetchFromPurrBot = async (cmd) => {
        const v2Candidates = [...new Set([cmd, purbotv2Map[cmd]].filter(Boolean))]
        const v1Candidates = [...new Set([cmd, purbotv1Map[cmd]].filter(Boolean))]

        // 1️⃣ Intenta PurrBot v2 primero: comando real -> mapeo
        for (const v2Endpoint of v2Candidates) {
          try {
            const res = await fetch(`https://api.purrbot.site/v2/img/sfw/${v2Endpoint}/gif`, { timeout: 5000 })
            if (!res.ok) continue
            const json = await res.json().catch(() => ({}))
            if (json?.link) return json.link
          } catch (e) {
            console.warn(`[Anime] v2 intento falló para ${cmd} (${v2Endpoint}): ${e.message}`)
          }
        }

        // 2️⃣ Fallback a PurrBot v1: comando real -> mapeo
        for (const v1Endpoint of v1Candidates) {
          try {
            const res = await fetch(`https://purrbot.site/api/img/sfw/${v1Endpoint}/gif`, { timeout: 5000 })
            if (!res.ok) continue
            const json = await res.json().catch(() => ({}))
            if (json?.link) {
              console.log(`[Anime] ${cmd} obtenido desde PurrBot v1 (${v1Endpoint})`)
              return json.link
            }
          } catch (e) {
            console.warn(`[Anime] v1 intento falló para ${cmd} (${v1Endpoint}): ${e.message}`)
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
      } else {
        // Modo estricto: solo contenido animado
        throw new Error(`Media no animada detectada (${type})`)
      }

      await client.sendMessage(m.chat, msgOptions, { quoted: m })

    } catch (e) {
      console.error(e)
      // Mensaje de error discreto
      await m.reply('🐲 No se pudo cargar la reacción. (╥﹏╥)')
    }
  },
}
