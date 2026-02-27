import fetch from 'node-fetch'

export default {
  command: ['nsfwaigen', 'aigensfw', 'pornogen', 'ainsfw'],
  category: 'ia',
  run: async ({ client, m, text, usedPrefix, command }) => {
    
    const chat = global.db.data.chats[m.chat] || {}
    if (!chat.nsfw) {
      return m.reply('⛔ *ALERTA:* Activa el modo +18 primero con:\n`#on nsfw`')
    }

    if (!text) {
      return m.reply(`🔥 *Generador NSFW*\n\nIngresa una descripción.\n📌 Ejemplo:\n${usedPrefix + command} Lucoa`)
    }

    await client.sendMessage(m.chat, { react: { text: '🍑', key: m.key } })
    await m.reply('😈 *Generando imagen...*')

    try {
      const seed = Math.floor(Math.random() * 1000000)
      
      // 🔥 AQUÍ ESTÁ EL TRUCO: Etiquetas agresivas para forzar el NSFW
      // Agregamos "nude, naked, uncensored, hentai" automáticamente.
      const tagsProhibidos = "nsfw, nude, naked, uncensored, explicit, hentai style, r18, sexual, 4k, detailed"
      const promptFinal = `${text}, ${tagsProhibidos}`
      
      // Usamos Pollinations (imagen directa)
      const apiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptFinal)}?width=1080&height=1920&seed=${seed}&nologo=true&model=flux`

      const res = await fetch(apiUrl, { timeout: 60000 })
      if (!res.ok) throw new Error(`API respondió ${res.status}`)
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('image')) throw new Error('La API no devolvió una imagen.')
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 1000) throw new Error('Imagen vacía o corrupta.')

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
      m.reply(`❌ Error de conexión.`)
    }
  }
}
