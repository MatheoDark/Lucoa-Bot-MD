import fetch from 'node-fetch'

export default {
  command: ['nsfwaigen', 'aigensfw', 'pornogen', 'ainsfw'], // Agregué ainsfw aquí también
  category: 'ia',
  run: async ({ client, m, text, usedPrefix, command }) => {
    
    // Verificación de seguridad
    const chat = global.db.data.chats[m.chat] || {}
    if (!chat.nsfw) {
      return m.reply('⛔ *ALERTA:* Activa el modo +18 primero con:\n`#on nsfw`')
    }

    if (!text) {
      return m.reply(`🔥 *Generador NSFW*\n\nIngresa una descripción.\n📌 Ejemplo:\n${usedPrefix + command} Lucoa bikini`)
    }

    await client.sendMessage(m.chat, { react: { text: '🍑', key: m.key } })
    await m.reply('😈 *Generando imagen...*')

    try {
      // Truco de Pollinations: Usamos un número aleatorio (seed) para que la imagen siempre cambie
      const seed = Math.floor(Math.random() * 1000000)
      
      // Construimos la URL Directa. 
      // Esta URL DEVUELVE UNA IMAGEN, no un JSON. Por eso usamos .buffer()
      const apiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(text + ", nsfw, anime style, high quality")}?width=1080&height=1920&seed=${seed}&nologo=true`

      const res = await fetch(apiUrl)
      
      // Obtenemos los datos binarios de la imagen directamente
      const buffer = await res.buffer()

      await client.sendMessage(
        m.chat,
        { 
            image: buffer, 
            caption: `🔞 *GENERADO* 🔞\n\n📝 *Pedido:* ${text}\n\n> 🐲 Powered by MatheoDark` 
        },
        { quoted: m }
      )
      
    } catch (e) {
      console.error(e)
      m.reply(`❌ Error de conexión. Intenta de nuevo.`)
    }
  }
}
