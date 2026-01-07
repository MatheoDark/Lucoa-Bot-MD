import fetch from 'node-fetch'

export default {
    command: ['hentaivideo', 'hentaivid'],
    category: 'nsfw',
    run: async ({ client, m }) => {
        try {
            if (m.isGroup && global.db.data.chats[m.chat]?.nsfw === false) {
                return m.reply('🚫 NSFW desactivado.')
            }
            
            m.reply('⏳ *Descargando...*')
            
            let res = await fetch('https://delirius-apiofc.vercel.app/anime/hentaivid')
            let json = await res.json()
            // Protección por si la API cambia formato
            let data = Array.isArray(json) ? json[Math.floor(Math.random() * json.length)] : json
            
            if (!data || !data.video_1) throw 'API Error'

            let txt = `🔞 *HENTAI RANDOM* 🔥\n🎬 ${data.title || 'Sin título'}\n📂 ${data.category || 'Hentai'}`

            await client.sendMessage(m.chat, { 
                video: { url: data.video_1 }, 
                caption: txt,
                gifPlayback: false 
            }, { quoted: m })

        } catch (e) {
            m.reply('❌ Error de API o Video.')
        }
    }
}
