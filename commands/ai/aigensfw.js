import fetch from 'node-fetch'

export default {
  command: ['nsfwaigen', 'aigensfw', 'pornogen'],
  category: 'ia',
  run: async ({client, m, text, usedPrefix, command}) => {
    
    // 1. Verificación de seguridad NSFW (Usando global.db)
    const chat = global.db.data.chats[m.chat] || {}
    if (!chat.nsfw) {
      return m.reply('⛔ *ALERTA:* Los comandos *NSFW* (+18) están desactivados en este chat.\n\nUn administrador debe activarlos con:\n`#on nsfw`')
    }

    if (!text) {
      return m.reply(`🔥 *Generador NSFW*\n\nIngresa una descripción.\n📌 Ejemplo:\n${usedPrefix + command} Lucoa tomando un baño, steam, uncensored`)
    }

    // Reacción de espera
    await client.sendMessage(m.chat, { react: { text: '🔞', key: m.key } })
    await m.reply('😈 *Generando imagen...* (Esto puede tardar unos segundos)')

    // Función interna para probar versiones
    const fetchImage = async (version, prompt) => {
      const url = `https://api.nekolabs.web.id/image-generation/wai-nsfw-illustrous/v${version}?prompt=${encodeURIComponent(prompt)}&ratio=9:16` // Cambié a 9:16 para mejor vista en celular
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
      const data = await res.json()
      if (!data?.success || !data?.result) throw new Error(`API v${version} falló`)
      return data.result
    }

    try {
      let imageUrl
      // Lógica de reintento inteligente
      try {
        imageUrl = await fetchImage(12, text) // Intento 1: Versión 12
      } catch (e) {
        console.log('Fallo v12, intentando v11...')
        imageUrl = await fetchImage(11, text) // Intento 2: Versión 11
      }

      if (!imageUrl) throw new Error('No se pudo generar la imagen con ningún modelo.')

      await client.sendMessage(
        m.chat,
        { 
            image: { url: imageUrl }, 
            caption: `🔞 *IMAGEN GENERADA* 🔞\n\n📝 *Pedido:* ${text}\n\n> 🐲 Powered by MatheoDark` 
        },
        { quoted: m }
      )
      
      await client.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
      console.error(e)
      await client.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      m.reply(`❌ Error: La API no pudo generar esa imagen específica. Intenta cambiar el texto.`)
    }
  }
}
