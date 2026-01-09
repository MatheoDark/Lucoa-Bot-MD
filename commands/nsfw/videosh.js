import fetch from 'node-fetch'

export default {
    command: ['hentaivideo', 'hentaivid', 'hentai'],
    category: 'nsfw',
    run: async ({ client, m }) => {
        try {
            // 🔒 1. SEGURIDAD: Verificar si NSFW está activo
            if (m.isGroup && global.db.data.chats[m.chat]?.nsfw === false) {
                return m.reply('🚫 *NSFW desactivado.*\n> Un admin debe usar: *#enable nsfw*')
            }
            
            await m.reply('⏳ *Buscando video...* (Probando servidores)')
            
            // 📡 2. LISTA DE APIS (Más opciones = Más éxito)
            const apis = [
                'https://api.agatz.xyz/api/hentaivid',                   // Opción 1
                'https://shizoapi.onrender.com/api/nsfw/hentai',         // Opción 2
                'https://api.siputzx.my.id/api/nsfw/hentai',             // Opción 3
                'https://api.yanzbotz.my.id/api/nsfw/hentai',            // Opción 4
                'https://sfm-api.onrender.com/api/hentai'                // Opción 5
            ]

            let videoUrl = null
            let title = 'Hentai Video'

            // 🔄 3. BUCLE DE BÚSQUEDA INTELIGENTE
            for (let url of apis) {
                try {
                    // Timeout corto (3s) para no esperar eternamente a una API muerta
                    const controller = new AbortController()
                    const timeout = setTimeout(() => controller.abort(), 3000)
                    
                    const res = await fetch(url, { signal: controller.signal })
                    clearTimeout(timeout)

                    if (!res.ok) continue
                    const json = await res.json()

                    // 🕵️ DETECTIVE DE LINKS (Busca el video donde sea)
                    // Las APIs guardan el link en lugares distintos, aquí buscamos en todos
                    const possibleUrl = 
                        json.result || 
                        json.url || 
                        json.data?.url || 
                        json.data?.video_1 || 
                        json.video || 
                        json.link

                    // Si encontramos algo que parece un link, lo guardamos y salimos
                    if (possibleUrl && typeof possibleUrl === 'string' && possibleUrl.startsWith('http')) {
                        videoUrl = possibleUrl
                        title = json.title || json.data?.title || title
                        break // ¡Éxito! Salimos del bucle
                    }

                } catch (e) {
                    continue // Si falla, prueba la siguiente en silencio
                }
            }

            // ❌ 4. SI TODO FALLA
            if (!videoUrl) throw new Error('Todas las APIs fallaron.')

            // ✅ 5. ENVIAR VIDEO
            await client.sendMessage(m.chat, { 
                video: { url: videoUrl }, 
                caption: `🔞 *${title}*\n📂 *Premium Content*`,
                gifPlayback: false 
            }, { quoted: m })

        } catch (e) {
            console.error("Error NSFW:", e)
            m.reply('❌ *Servidores ocupados.* Intenta de nuevo en 1 minuto.')
        }
    }
}
