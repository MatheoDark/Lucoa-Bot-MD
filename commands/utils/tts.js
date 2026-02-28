import fetch from 'node-fetch'

export default {
  command: ['tts', 'texttospeech'],
  category: 'utils',
  desc: 'Convierte texto a voz usando Google Translate TTS.',

  run: async ({ client, m, args, usedPrefix, command }) => {
    let lang = 'es'
    let text = ''

    if (!args || !args.length) {
      // Verificar si hay texto citado
      const quoted = m.quoted?.text
      if (!quoted) {
        return m.reply(
          `*⚠️ Escribe un texto para convertir a voz.*\n` +
          `Ejemplo: ${usedPrefix + command} Hola, soy Lucoa\n` +
          `Con idioma: ${usedPrefix + command} en Hello, I am Lucoa`
        )
      }
      text = quoted
    } else {
      // Verificar si el primer argumento es un código de idioma (2 letras)
      if (args[0].length === 2 && /^[a-z]{2}$/i.test(args[0])) {
        lang = args[0].toLowerCase()
        text = args.slice(1).join(' ')
      } else {
        text = args.join(' ')
      }

      // Si después de extraer el idioma no hay texto, verificar quoted
      if (!text) {
        const quoted = m.quoted?.text
        if (!quoted) {
          return m.reply(`*⚠️ Escribe un texto para convertir a voz.*`)
        }
        text = quoted
      }
    }

    if (text.length > 500) {
      return m.reply('*⚠️ El texto es demasiado largo. Máximo 500 caracteres.*')
    }

    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/'
        }
      })

      if (!res.ok) throw 'No se pudo generar el audio.'

      const buffer = Buffer.from(await res.arrayBuffer())

      await client.sendMessage(m.chat, {
        audio: buffer,
        ptt: true,
        mimetype: 'audio/mpeg'
      }, { quoted: m })

    } catch (e) {
      console.error('Error TTS:', e)
      await m.reply('*⚠️ Error al generar el audio de voz.*')
    }
  }
}
