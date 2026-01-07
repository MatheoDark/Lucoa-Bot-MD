import fetch from 'node-fetch'

/**
 * - captions(from, to, genero)
 * - symbols random
 * - commandAliases (alias ES -> command EN)
 * - export.command incluye EN + aliases ES
 * - parsea prefijo con globalThis.prefix (como la base)
 * - menciones con @user
 * - usa api.url/api.key (fallback waifu.pics)
 */

const captions = {
  peek: (from, to) =>
    from === to ? 'está espiando detrás de una puerta por diversión.' : 'está espiando a',
  stare: (from, to) =>
    from === to ? 'se queda mirando al techo sin razón.' : 'se queda mirando fijamente a',
  trip: (from, to) =>
    from === to ? 'se tropezó consigo mismo, otra vez.' : 'tropezó accidentalmente con',
  sleep: (from, to) =>
    from === to ? 'está durmiendo plácidamente.' : 'está durmiendo con',
  sing: (from, to) =>
    from === to ? 'está cantando.' : 'le está cantando a',
  tickle: (from, to) =>
    from === to ? 'se está haciendo cosquillas.' : 'le está haciendo cosquillas a',
  slap: (from, to, genero) =>
    from === to
      ? `se dio una bofetada a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.`
      : 'le dio una bofetada a',
  kill: (from, to) =>
    from === to ? 'se autoeliminó en modo dramático.' : 'asesinó a',
  kiss: (from, to) =>
    from === to ? 'se mandó un beso al aire.' : 'le dio un beso a',
  hug: (from, to, genero) =>
    from === to
      ? `se abrazó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.`
      : 'le dio un abrazo a',
  pat: (from, to) =>
    from === to ? 'se acarició la cabeza con ternura.' : 'le dio una caricia a',
  lick: (from, to) =>
    from === to ? 'se lamió por curiosidad.' : 'lamió a',
  cry: (from, to) =>
    from === to ? 'está llorando.' : 'está llorando por',
  blush: (from, to) =>
    from === to ? 'se sonrojó.' : 'se sonrojó por',
  smile: (from, to) =>
    from === to ? 'está sonriendo.' : 'le sonrió a',
  wave: (from, to, genero) =>
    from === to
      ? `se saludó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} en el espejo.`
      : 'está saludando a',
  highfive: (from, to) =>
    from === to ? 'se chocó los cinco frente al espejo.' : 'chocó los 5 con',
  dance: (from, to) =>
    from === to ? 'está bailando.' : 'está bailando con',
  wink: (from, to, genero) =>
    from === to
      ? `se guiñó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} en el espejo.`
      : 'le guiñó a',
  happy: (from, to) =>
    from === to ? 'está feliz.' : 'está feliz con',
  cuddle: (from, to, genero) =>
    from === to
      ? `se acurrucó ${genero === 'Hombre' ? 'solo' : genero === 'Mujer' ? 'sola' : 'solx'}.`
      : 'se acurrucó con',
  poke: (from, to) =>
    from === to ? 'se picó la cara.' : 'le picó la cara a',
  bite: (from, to, genero) =>
    from === to
      ? `se mordió ${genero === 'Hombre' ? 'solito' : genero === 'Mujer' ? 'solita' : 'solitx'}.`
      : 'mordió a',
}

// símbolos (igual estilo base)
const symbols = [
  '(⁠◠⁠‿⁠◕⁠)',
  '˃͈◡˂͈',
  '૮(˶ᵔᵕᵔ˶)ა',
  '(づ｡◕‿‿◕｡)づ',
  '(✿◡‿◡)',
  '(꒪⌓꒪)',
  '(✿✪‿✪｡)',
  '(*≧ω≦)',
  '(✧ω◕)',
  '˃ 𖥦 ˂',
  '(⌒‿⌒)',
  '(¬‿¬)',
  '(✧ω✧)',
  '✿(◕ ‿◕)✿',
  'ʕ•́ᴥ•̀ʔっ',
  '(ㅇㅅㅇ❀)',
  '(∩︵∩)',
  '(✪ω✪)',
  '(✯◕‿◕✯)',
  '(•̀ᴗ•́)و ̑̑',
]
function getRandomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)]
}

// ✅ Alias ES -> Command EN (como la base)
const commandAliases = {
  mirar: 'stare',
  espiar: 'peek',
  tropezar: 'trip',
  dormir: 'sleep',
  cantar: 'sing',
  cosquillas: 'tickle',
  bofetada: 'slap',
  matar: 'kill',
  besar: 'kiss',
  abrazar: 'hug',
  acariciar: 'pat',
  lamer: 'lick',
  llorar: 'cry',
  sonrojar: 'blush',
  sonreir: 'smile',
  saludar: 'wave',
  chocar: 'highfive',
  bailar: 'dance',
  guiñar: 'wink',
  feliz: 'happy',
  acurrucar: 'cuddle',
  picar: 'poke',
  morder: 'bite',
}

// ✅ comandos exportados: EN + aliases ES
const englishCommands = Object.keys(captions)
const spanishAliases = Object.keys(commandAliases)

export default {
  command: [...englishCommands, ...spanishAliases],
  category: 'anime',
  run: async ({ client, m }) => {
    try {
      // ===== parse prefijo (igual base) =====
      if (!m.text || !globalThis.prefix || typeof globalThis.prefix.exec !== 'function') return
      const match = globalThis.prefix.exec(m.text)
      if (!match) return

      const usedPrefix = match[0]
      const command = m.text.slice(usedPrefix.length).trim().split(' ')[0].toLowerCase()
      const currentCommand = commandAliases[command] || command
      if (!captions[currentCommand]) return

      // ===== target =====
      let who
      const texto = m.mentionedJid || []
      if (m.isGroup) {
        who = texto.length > 0 ? texto[0] : m.quoted ? m.quoted.sender : m.sender
      } else {
        who = m.quoted ? m.quoted.sender : m.sender
      }

      // ===== nombres/género (igual base) =====
      const fromName = global.db?.data?.users?.[m.sender]?.name || m.pushName || 'Alguien'
      const toName = global.db?.data?.users?.[who]?.name || 'alguien'
      const genero = global.db?.data?.users?.[m.sender]?.genre || 'Oculto'

      const captionText = captions[currentCommand](fromName, toName, genero)
      const caption =
        who !== m.sender
          ? `@${m.sender.split('@')[0]} ${captionText} @${who.split('@')[0]} ${getRandomSymbol()}.`
          : `${fromName} ${captionText} ${getRandomSymbol()}.`

      // ===== obtener url media (api.megumin) + fallback waifu.pics =====
      let mediaUrl = null

      // 1) API de Megumin (si existe)
      // soporte: api.url / api.key (global var del proyecto)
      if (typeof api !== 'undefined' && api?.url) {
        const response = await fetch(
          `${api.url}/sfw/interaction?type=${currentCommand}${api.key ? `&key=${api.key}` : ''}`,
        )
        const json = await response.json().catch(() => ({}))
        mediaUrl = json?.result || json?.url || null
      }

      // 2) fallback waifu.pics
      if (!mediaUrl) {
        let res = await fetch(`https://api.waifu.pics/sfw/${currentCommand}`)
        if (!res.ok) res = await fetch(`https://api.waifu.pics/sfw/neko`)
        const json = await res.json().catch(() => ({}))
        mediaUrl = json?.url || null
      }

      if (!mediaUrl) throw new Error('No media url')

      // descargar buffer (más estable para gif/video)
      const mediaRes = await fetch(mediaUrl)
      const buffer = await mediaRes.buffer()

      // ===== enviar =====
      const mentions = [...new Set([who, m.sender])].filter(Boolean)

      await client.sendMessage(
        m.chat,
        {
          video: buffer,
          gifPlayback: true,
          caption,
          mentions,
        },
        { quoted: m },
      )
    } catch (e) {
      console.error('Error reacción:', e)
      await m.reply(typeof msgglobal !== 'undefined' ? msgglobal : '❌ Error API. Intenta de nuevo.')
    }
  },
}
