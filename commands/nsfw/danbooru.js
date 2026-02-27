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

    const tag = args.join('_')
    
    try {
      let url = null
      let source = ''
      let postId = ''
      let artist = ''

      // 1. SafeBooru (funcional sin auth)
      try {
        const res = await fetch(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
        const data = await res.json()
        const posts = Array.isArray(data) ? data : (data?.post || [])
        const valid = posts.filter(p => p.file_url || p.image)
        if (valid.length > 0) {
          const post = valid[Math.floor(Math.random() * valid.length)]
          url = post.file_url || `https://safebooru.org/images/${post.directory}/${post.image}`
          if (url && !url.startsWith('http')) url = `https://safebooru.org${url}`
          source = 'SafeBooru'
          postId = post.id
        }
      } catch {}

      // 2. Rule34 fallback
      if (!url) {
        try {
          const res = await fetch(`https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
          const data = await res.json()
          const posts = Array.isArray(data) ? data : (data?.post || [])
          const valid = posts.filter(p => p.file_url)
          if (valid.length > 0) {
            const post = valid[Math.floor(Math.random() * valid.length)]
            url = post.file_url
            source = 'Rule34'
            postId = post.id
          }
        } catch {}
      }

      // 3. Danbooru fallback
      if (!url) {
        try {
          const res = await fetch(`https://danbooru.donmai.us/posts.json?tags=${tag}&limit=20`)
          const data = await res.json()
          const valid = data.filter(p => p.file_url || p.large_file_url)
          if (valid.length > 0) {
            const post = valid[Math.floor(Math.random() * valid.length)]
            url = post.file_url || post.large_file_url
            source = 'Danbooru'
            postId = post.id
            artist = post.tag_string_artist || ''
          }
        } catch {}
      }

      if (!url) {
        return m.reply(`❌ No encontré nada sobre *${args.join(' ')}*.\nIntenta usar el nombre en inglés (ej: cat_girl).`)
      }

      await client.sendMessage(chatId, { 
          image: { url }, 
          caption: `🔥 *${source} ID:* ${postId}${artist ? `\n👤 *Autor:* ${artist}` : ''}`
      }, { quoted: m })

    } catch (err) {
      console.error('[Danbooru Error]', err)
      m.reply('❌ Ocurrió un error al conectar con Danbooru. Intenta más tarde.')
    }
  },
}
