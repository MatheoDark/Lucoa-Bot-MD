import fetch from 'node-fetch'

export default {
    command: ['hentaivideo', 'hentaivid'],
    category: 'nsfw',
    run: async ({ client, m }) => {
        try {
            // 1. Verificación de seguridad (Solo grupos con NSFW activo)
            if (m.isGroup && global.db.data.chats[m.chat]?.nsfw === false) {
                return m.reply('🚫 *NSFW está desactivado en este grupo.*\n\n> Pide a un admin que use: *#enable nsfw*')
            }
            
            await m.reply('⏳ *Buscando video premium...*')
            
            // 2. LISTA DE APIS (Si una falla, prueba la otra)
            const apis = [
                'https://delirius-api-oficial.vercel.app/nsfw/hentaivid', // Opción A
                'https://api.agatz.xyz/api/hentaivid',                   // Opción B
                'https://shizoapi.onrender.com/api/nsfw/hentai'          // Opción C
            ]

            let videoUrl = null
            let title = 'Hentai Random'
            let category = 'Uncensored'

            // 3. Bucle de intentos
            for (let url of apis) {
                try {
                    let res = await fetch(url)
                    let json = await res.json()

                    // Normalizamos la respuesta (porque cada API responde distinto)
                    if (json.data && Array.isArray(json.data)) {
                        // Caso Delirius (A veces devuelve array)
                        let random = json.data[Math.floor(Math.random() * json.data.length)]
                        videoUrl = random.url || random.video_1
                        title = random.title || title
                    } 
                    else if (json.data && json.data.url) {
                        // Caso Delirius/Agatz (Objeto único)
                        videoUrl = json.data.url
                        title = json.data.title || title
                    } 
                    else if (json.result) {
                        // Caso Shizo
                        videoUrl = json.result
                    }

                    // Si encontramos link, rompemos el bucle
                    if (videoUrl) break 

                } catch (e) {
                    console.log(`Fallo API: ${url}`)
                    continue // Intenta con la siguiente
                }
            }

            // 4. Verificación final y envío
            if (!videoUrl) throw new Error('Ninguna API respondió.')

            await client.sendMessage(m.chat, { 
                video: { url: videoUrl }, 
                caption: `🔞 *${title}* 🔥\n📂 Categoría: ${category}`,
                gifPlayback: false 
            }, { quoted: m })

        } catch (e) {
            console.error(e)
            m.reply('❌ *Lo siento, no encontré videos disponibles ahora.* (Servidores caídos)')
        }
    }
}
