import fetch from 'node-fetch'

export default {
  command: ['gelbooru', 'gbooru', 'rule34', 'danbooru'],
  category: 'nsfw',
  run: async ({client, m, args}) => {
    const chatId = m.chat
    
    if (global.db.data.chats[chatId] && !global.db.data.chats[chatId].nsfw) {
        return m.reply('� Activa el NSFW con `.enable nsfw` (◕︿◕)')
    }
    
    if (!args[0]) return m.reply('� Ingresa un tag. (◕ᴗ◕✿)\n> Ejemplo: *#gelbooru girl*')

    const tag = args.join('_')
    m.reply(`🐲 *Buscando ${tag}...* (◕ᴗ◕✿)`)

    let url = null
    let source = ''

    // 1. SafeBooru (SFW pero funcional sin auth)
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
        }
    } catch (e) {}

    // 2. Rule34 (NSFW, API pública)
    if (!url) {
        try {
            const res = await fetch(`https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
            const data = await res.json()
            const posts = Array.isArray(data) ? data : (data?.post || [])
            const valid = posts.filter(p => p.file_url)
            if (valid.length > 0) {
                url = valid[Math.floor(Math.random() * valid.length)].file_url
                source = 'Rule34'
            }
        } catch (e) {}
    }

    // 3. Danbooru fallback
    if (!url) {
        try {
            const res = await fetch(`https://danbooru.donmai.us/posts.json?tags=${tag}&limit=50`)
            const data = await res.json()
            const valid = data.filter(p => p.file_url || p.large_file_url)
            if (valid.length > 0) {
                const post = valid[Math.floor(Math.random() * valid.length)]
                url = post.file_url || post.large_file_url
                source = 'Danbooru'
            }
        } catch (e) {}
    }

    if (!url) return m.reply(`🐲 No encontré nada para: *${tag}* (╥﹏╥)`)

    try {
        await client.sendMessage(chatId, { image: { url: url }, caption: `� *Result* (✿❛◡❛)\n❀ *Tag:* ${tag}\n❀ *Server:* ${source}` }, { quoted: m })
    } catch (e) {
        console.error(e)
        m.reply('🐲 Error al enviar la imagen. (╥﹏╥)')
    }
  }
}
