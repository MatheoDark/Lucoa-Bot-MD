import fetch from 'node-fetch'

export default {
  command: ['gelbooru', 'gbooru', 'rule34', 'danbooru'],
  category: 'nsfw',
  run: async ({client, m, args}) => {
    const chatId = m.chat
    
    // FIX: Usar global.db
    if (global.db.data.chats[chatId] && !global.db.data.chats[chatId].nsfw) {
        return m.reply('🚫 Activa el NSFW con `.enable nsfw`')
    }
    
    if (!args[0]) return m.reply('🔍 Ingresa un tag. Ejemplo: `#gelbooru girl`')

    const tag = args.join('_')
    m.reply(`⌛ Buscando *${tag}* en servidores seguros...`)

    let url = null
    let source = ''

    // 1. DANBOORU (Más estable)
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

    // 2. YANDERE (Respaldo)
    if (!url) {
        try {
            const res = await fetch(`https://yande.re/post.json?tags=${tag}&limit=50`)
            const data = await res.json()
            const valid = data.filter(p => p.file_url)
            if (valid.length > 0) {
                url = valid[Math.floor(Math.random() * valid.length)].file_url
                source = 'Yandere'
            }
        } catch (e) {}
    }

    if (!url) return m.reply(`❌ No encontré nada para: ${tag}`)

    try {
        await client.sendMessage(chatId, { image: { url: url }, caption: `🔞 *Result*\n🏷️ *Tag:* ${tag}\n📡 *Server:* ${source}` }, { quoted: m })
    } catch (e) {
        console.error(e)
        m.reply('❌ Error al enviar la imagen.')
    }
  }
}
