import fetch from 'node-fetch';

export default {
  command: ['translate'],
  category: 'utils',
  run: async ({client, m, args}) => {
    const quoted = m.quoted ? m.quoted : m
    const txt = args.slice(1).join(' ')
    const text = txt || quoted.text?.split(' ').join(' ')
    const language = args[0] || 'es'

    if (!args[0] && !m.quoted)
      return m.reply(
        '《✧》 Ingresa el idioma seguido del texto que quieras traducir.'
      )

    const translateAPI = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(language)}&dt=t&q=${encodeURIComponent(text)}`

    try {
      const res = await fetch(translateAPI)
      const json = await res.json()

      // Google Translate devuelve [[["traducción","original",...],...],...] 
      const translated = json?.[0]?.map(s => s[0]).join('') || ''
      if (!translated) return m.reply('《✧》 No se pudo traducir el texto.')

      const detectedLang = json?.[2] || 'auto'
      await client.sendMessage(m.chat, { text: `🌐 *${detectedLang} → ${language}*\n\n${translated}` }, { quoted: m })
    } catch {
      await m.reply('《✧》 Error al traducir. Intenta de nuevo.')
    }
  },
};
