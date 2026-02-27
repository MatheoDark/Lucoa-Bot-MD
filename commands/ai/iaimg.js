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
      // Mapeamos ratios a dimensiones
      const dims = { '1:1': [1024, 1024], '16:9': [1280, 720], '9:16': [720, 1280] }
      const [w, h] = dims[ratio] || [1024, 1024]
      const seed = Math.floor(Math.random() * 999999)

      // Generamos URL directa de Pollinations (imagen como respuesta)
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`

      // Intentamos descargar la imagen
      const res = await fetch(imageUrl, { timeout: 60000 })
      if (!res.ok) throw new Error(`API respondió ${res.status}`)

      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('image')) throw new Error('La API no devolvió una imagen válida.')

      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 1000) throw new Error('La imagen generada está vacía o corrupta.')

      await client.sendMessage(
        m.chat,
        {
          image: buffer,
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
