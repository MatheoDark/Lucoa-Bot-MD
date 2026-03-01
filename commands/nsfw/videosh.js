import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

// ───────────────────────────────────────────────
// 🕵️ MOTOR DE BÚSQUEDA XNXX (Local)
// ───────────────────────────────────────────────

async function xnxxSearch(query) {
    try {
        const res = await fetch(`https://www.xnxx.com/search/${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        })
        const html = await res.text()
        const $ = cheerio.load(html)
        const results = []
        
        $('div.mozaique').find('div.thumb-block').each((i, element) => {
            const linkTag = $(element).find('div.thumb-under a')
            const link = linkTag.attr('href')
            const title = linkTag.attr('title')
            if (link && title) {
                results.push({ 
                    title: title, 
                    url: link.startsWith('http') ? link : 'https://www.xnxx.com' + link 
                })
            }
        })
        return results
    } catch (e) {
        return []
    }
}

async function xnxxDownload(url) {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        })
        const html = await res.text()
        const urlHigh = html.match(/html5player\.setVideoUrlHigh\('([^']+)'\)/)?.[1]
        const urlLow = html.match(/html5player\.setVideoUrlLow\('([^']+)'\)/)?.[1]
        return urlHigh || urlLow
    } catch (e) {
        return null
    }
}

// ───────────────────────────────────────────────
// 🚀 COMANDO PRINCIPAL
// ───────────────────────────────────────────────

export default {
    command: ['hentaivideo', 'hentaivid', 'hentai'],
    category: 'nsfw',
    run: async ({ client, m }) => {
        try {
            // 1. SEGURIDAD
            if (m.isGroup && global.db.data.chats[m.chat]?.nsfw === false) {
                return m.reply('� *NSFW desactivado.* (◕︿◕)')
            }
            
            await m.reply('🐲 *Preparando ráfaga de 4 videos...* (◕ᴗ◕✿)')
            
            // 2. LISTA DE BÚSQUEDA (Mucha Variedad)
            const queries = [
                '3d hentai animation', 'sfm hentai compilation', 'overwatch hentai 3d', 
                'uncensored hentai', 'blender hentai', 'anime sex hd', 
                'hentai compilation', 'rule34 3d video', 'hentai short', 
                'final fantasy hentai', 'nieR automata hentai', 'genshin impact hentai 3d',
                'league of legends hentai', 'hentai creampie animation', 'hentai full hd'
            ]
            
            // Elegimos un tema al azar
            const randomQuery = queries[Math.floor(Math.random() * queries.length)]
            console.log(`Buscando: ${randomQuery}`)
            
            const results = await xnxxSearch(randomQuery)
            
            if (!results || results.length === 0) {
                return m.reply('🐲 No encontré resultados. (╥﹏╥)')
            }

            // 3. SELECCIONAR 4 VIDEOS ALEATORIOS (Sin repetir)
            // Mezclamos el array de resultados
            const shuffled = results.sort(() => 0.5 - Math.random())
            // Tomamos los primeros 4
            const selectedVideos = shuffled.slice(0, 4)

            // 4. BUCLE DE ENVÍO
            let sentCount = 0
            
            for (const video of selectedVideos) {
                try {
                    // Extraemos link MP4
                    const dlUrl = await xnxxDownload(video.url)
                    if (!dlUrl) continue // Si falla uno, pasamos al siguiente

                    // Enviamos
                    await client.sendMessage(m.chat, { 
                        video: { url: dlUrl }, 
                        caption: `🔞 *${video.title}*\n📂 *Tema:* ${randomQuery}`,
                        gifPlayback: false 
                    }, { quoted: m })
                    
                    sentCount++
                    
                    // Pequeña pausa para no saturar
                    await new Promise(r => setTimeout(r, 1000))
                    
                } catch (e) {
                    console.log(`Error enviando un video: ${e.message}`)
                }
            }

            if (sentCount === 0) m.reply('🐲 No pude descargar ninguno de los videos. (╥﹏╥)')

        } catch (e) {
            console.error(e)
            m.reply('🐲 Error fatal interno. (╥﹏╥)')
        }
    }
}
