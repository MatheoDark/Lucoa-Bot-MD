import fetch from 'node-fetch'

export default {
    // 1. Definición de comandos y categoría (Formato V3)
    command: ['hentaivideo', 'hentaivid'],
    category: 'nsfw',
    
    // 2. Función principal
    run: async ({ client, m }) => {
        
        // Verificación de grupo (opcional, si tu bot maneja db global)
        if (m.isGroup && global.db.data.chats[m.chat]?.nsfw === false) {
            return m.reply('🚫 El contenido *NSFW* está desactivado en este grupo.\nUn admin debe activarlo.')
        }

        m.reply('⏳ *Descargando video Hentai...*')

        try {
            // Usamos fetch en lugar de axios
            let res = await fetch('https://delirius-apiofc.vercel.app/anime/hentaivid')
            let data = await res.json()

            // Si la API devuelve un array, elegimos uno al azar. 
            // Si devuelve un objeto directo, lo usamos.
            let random = Array.isArray(data) ? data[Math.floor(Math.random() * data.length)] : data

            if (!random || !random.video_1) {
                 throw 'La API no devolvió ningún video válido.'
            }

            const caption = `🔞 *HENTAI RANDOM VIDEO* 🔥

🎬 *Título:* ${random.title || 'Desconocido'}
📁 *Categoría:* ${random.category || 'Hentai'}
📊 *Vistas:* ${random.views_count || 'N/A'}
📤 *Link:* ${random.link || 'N/A'}

🔗 *Descargar:* ${random.video_1}`

            // Enviar usando el método moderno V3
            await client.sendMessage(m.chat, { 
                video: { url: random.video_1 }, 
                caption: caption,
                gifPlayback: false
            }, { quoted: m })

        } catch (err) {
            console.error('[ERROR HENTAI]', err)
            m.reply(`❌ Error al obtener el video.\nPosible caída de la API Delirius.`)
        }
    }
}
