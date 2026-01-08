import fetch from 'node-fetch'

export default {
  command: ['danbooru', 'dbooru'],
  category: 'nsfw',
  desc: 'Busca imágenes de anime en Danbooru (Conexión Directa).',

  run: async ({ client, m, args }) => {
    const chatId = m.chat
    const db = global.db

    // 1. Verificar Modo NSFW
    if (m.isGroup && !db.data.chats[chatId]?.nsfw) {
        return m.reply('🚫 Los comandos *NSFW* están desactivados en este grupo.\nUsa `#enable nsfw` para activarlos.')
    }

    // 2. Validar Texto
    if (!args[0]) return m.reply('📝 Ingresa un personaje o etiqueta para buscar.\nEjemplo: #danbooru lucoa')

    // --- CORRECCIÓN DEL ERROR ---
    // Antes decía: await m.reply(mess.wait) -> Esto daba error.
    // Ahora dice:
    await m.reply('🔍 *Buscando en Danbooru...*')

    const tag = args.join('_') // Danbooru usa guiones bajos
    
    try {
      // Usamos la API OFICIAL de Danbooru (Directa)
      const url = `https://danbooru.donmai.us/posts.json?tags=${tag}&limit=20`
      
      const res = await fetch(url)
      const data = await res.json()

      // Validar si hay resultados
      if (!Array.isArray(data) || data.length === 0) {
        return m.reply(`❌ No encontré nada sobre *${args.join(' ')}*.\nIntenta usar el nombre en inglés (ej: cat_girl).`)
      }

      // Filtrar posts que tengan imagen url válida
      const validPosts = data.filter(post => post.file_url || post.large_file_url)

      if (validPosts.length === 0) {
        return m.reply('❌ Encontré posts, pero no tienen imagen accesible (posiblemente contenido Premium).')
      }

      // 3. Seleccionar al azar
      const randomPost = validPosts[Math.floor(Math.random() * validPosts.length)]
      const imageUrl = randomPost.file_url || randomPost.large_file_url

      // 4. Enviar
      await client.sendMessage(chatId, { 
          image: { url: imageUrl }, 
          caption: `🔥 *Danbooru ID:* ${randomPost.id}\n👤 *Autor:* ${randomPost.tag_string_artist || 'Desconocido'}`
      }, { quoted: m })

    } catch (err) {
      console.error('[Danbooru Error]', err)
      m.reply('❌ Ocurrió un error al conectar con Danbooru. Intenta más tarde.')
    }
  },
}
