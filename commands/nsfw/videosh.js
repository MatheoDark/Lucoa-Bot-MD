import fetch from 'node-fetch'

export default {
    command: ['hentaivideo', 'hentaivid', 'hentai'],
    category: 'nsfw',
    run: async ({ client, m }) => {
        try {
            // 1. SEGURIDAD: Solo grupos permitidos
            if (m.isGroup && global.db.data.chats[m.chat]?.nsfw === false) {
                return m.reply('🚫 *NSFW desactivado.*')
            }
            
            await m.reply('⏳ *Buscando animación 3D en XNXX...*')
            
            let videoData = null

            // ───────────────────────────────────────────────
            // 🔍 ESTRATEGIA: BUSCAR EN XNXX (Puros Videos)
            // ───────────────────────────────────────────────
            
            // Lista de términos para variar los resultados
            const queries = ['3d hentai', 'overwatch hentai', 'sfm hentai', 'blender hentai', 'uncensored hentai']
            const randomQuery = queries[Math.floor(Math.random() * queries.length)]

            // API 1: AGATZ (Búsqueda + Descarga)
            try {
                console.log(`Buscando: ${randomQuery}...`)
                // Paso A: Buscar
                const searchRes = await fetch(`https://api.agatz.xyz/api/xnxx?message=${encodeURIComponent(randomQuery)}`)
                const searchJson = await searchRes.json()

                if (searchJson.status === 200 && searchJson.data && searchJson.data.length > 0) {
                    // Paso B: Elegir uno al azar
                    const randomVideo = searchJson.data[Math.floor(Math.random() * searchJson.data.length)]
                    
                    // Paso C: Obtener link de descarga directo
                    const dlRes = await fetch(`https://api.agatz.xyz/api/xnxxdl?url=${randomVideo.link}`)
                    const dlJson = await dlRes.json()

                    if (dlJson.status === 200 && dlJson.data) {
                        videoData = {
                            url: dlJson.data.high || dlJson.data.low, // Preferir calidad alta
                            title: randomVideo.title,
                            source: 'XNXX'
                        }
                    }
                }
            } catch (e) {
                console.log("Falló API Agatz")
            }

            // ───────────────────────────────────────────────
            // 🛡️ RESPALDO: API DIRECTA DE HENTAI (Si XNXX falla)
            // ───────────────────────────────────────────────
            if (!videoData) {
                try {
                    const res = await fetch('https://api.siputzx.my.id/api/nsfw/hentai')
                    const json = await res.json()
                    if (json.result) {
                        videoData = {
                            url: json.result,
                            title: 'Hentai Random',
                            source: 'API Backup'
                        }
                    }
                } catch (e) { console.log("Falló Backup") }
            }

            // ❌ SI TODO FALLA
            if (!videoData || !videoData.url) return m.reply('❌ *Error:* No pude obtener el video de XNXX. Intenta de nuevo.')

            // ✅ ENVIAR
            await client.sendMessage(m.chat, { 
                video: { url: videoData.url }, 
                caption: `🔞 *${videoData.title}*\n📂 Fuente: ${videoData.source}\n🔥 *Animación/Video Completo*`,
                gifPlayback: false 
            }, { quoted: m })

        } catch (e) {
            console.error(e)
            m.reply('❌ Error fatal al procesar.')
        }
    }
}
