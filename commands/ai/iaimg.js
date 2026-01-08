import fetch from 'node-fetch';

export default {
  // Más nombres para el mismo comando
  command: ['iaimg', 'dalle', 'aiimage', 'genimg'],
  category: 'ia',

  run: async ({ client, m, text, command, usedPrefix }) => {
    // Mensaje de ayuda si no escriben nada
    if (!text) {
      return m.reply(
        `🎨 *Generador de Imágenes IA (General)*\n\n` +
        `Uso:\n` +
        `\`${usedPrefix + command} descripción | resolución\`\n\n` +
        `Ejemplos:\n` +
        `• ${usedPrefix + command} un gato astronauta en el espacio | 1\n` +
        `• ${usedPrefix + command} paisaje cyberpunk futurista | 2\n\n` +
        `Resoluciones disponibles:\n` +
        `1️⃣ = 1:1 (Cuadrado)\n` +
        `2️⃣ = 16:9 (Horizontal/PC)\n` +
        `3️⃣ = 9:16 (Vertical/Celular)`
      )
    }

    // Separar el texto del número de resolución
    let [prompt, resInput] = text.split('|').map(v => v.trim())

    const ratios = {
      '1': '1:1',
      '2': '16:9',
      '3': '9:16'
    }

    let ratio
    // Si puso un número válido, úsalo. Si no, elige uno al azar.
    if (resInput && ratios[resInput]) {
      ratio = ratios[resInput]
    } else {
      const random = Object.values(ratios)
      ratio = random[Math.floor(Math.random() * random.length)]
    }

    await m.reply('🧠 *Imaginando...*\nEspera unos segundos mientras dibujo tu petición. 🎨')

    try {
      // Usamos un modelo general (no NSFW)
      const apiUrl =
        `https://api.nekolabs.web.id/image-generation/illustrious/me-v6` +
        `?prompt=${encodeURIComponent(prompt)}` +
        `&ratio=${encodeURIComponent(ratio)}`

      const res = await fetch(apiUrl)
      const json = await res.json()

      // Validar respuesta de la API
      if (!json.success || !json.result) throw new Error('La API no devolvió una imagen válida.')

      await client.sendMessage(
        m.chat,
        {
          image: { url: json.result },
          caption: 
            `✨ *IMAGEN GENERADA* ✨\n\n` +
            `📝 *Pedido:* ${prompt}\n` +
            `📐 *Ratio:* ${ratio}\n\n` +
            `> 🐲 Powered by MatheoDark`
        },
        { quoted: m }
      )

    } catch (err) {
      console.error(err)
      m.reply('❌ *Error:* No se pudo generar la imagen. Puede que la API esté saturada o el texto sea muy complejo. Intenta de nuevo.')
    }
  }
}
