import fetch from 'node-fetch'

/**
 * ✅ Estilo Megumin Mejorado:
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
  shy: (from, to) => from === to ? 'es timido/a.' : 'es timido/a con'
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
  caminar: 'walk', embarazar: 'impregnate', timido: 'shy', seducir: 'seduce'
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

    // 5. Obtener Video/GIF
    try {
      let mediaUrl = null

      // Opción A: API del Bot (si existe)
      if (typeof api !== 'undefined' && api?.url) {
        const response = await fetch(
          `${api.url}/sfw/interaction?type=${currentCommand}${api.key ? `&key=${api.key}` : ''}`
        )
        const json = await response.json().catch(() => ({}))
        mediaUrl = json?.result || json?.url
      }

      // Opción B: Fallback a Waifu.pics (Si la A falla)
      if (!mediaUrl) {
        // Mapeo manual para waifu.pics si el nombre no coincide exacto
        let apiCmd = currentCommand
        if (apiCmd === 'eat') apiCmd = 'nom' // waifu.pics usa 'nom' para comer
        
        let res = await fetch(`https://api.waifu.pics/sfw/${apiCmd}`)
        
        // Si no existe la categoría, usamos 'neko' de comodín
        if (!res.ok) res = await fetch(`https://api.waifu.pics/sfw/neko`)
        
        const json = await res.json().catch(() => ({}))
        mediaUrl = json?.url
      }

      if (!mediaUrl) throw new Error('No media url')

      // 6. Enviar
      const mediaRes = await fetch(mediaUrl)
      const buffer = await mediaRes.buffer()
      
      const mentions = [...new Set([who, m.sender])].filter(Boolean)

      await client.sendMessage(m.chat, {
          video: buffer,
          gifPlayback: true, // Esto lo convierte en "GIF" en WhatsApp
          caption: caption,
          mentions: mentions
      }, { quoted: m })

    } catch (e) {
      console.error(e)
      // Mensaje de error discreto
      await m.reply('❌ No se pudo cargar la reacción.')
    }
  },
}
