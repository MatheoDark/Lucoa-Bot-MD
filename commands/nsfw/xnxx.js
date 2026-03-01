import fetch from "node-fetch"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// Scraping: Extraer URL de video de una página XNXX
async function xnxxScraper(url) {
    try {
        const res = await fetch(url, { headers: { "User-Agent": UA }, timeout: 15000 })
        const text = await res.text()
        const urlHigh = text.match(/html5player\.setVideoUrlHigh\s*\(\s*['"]([^'"]+)['"]\s*\)/)
        const urlLow = text.match(/html5player\.setVideoUrlLow\s*\(\s*['"]([^'"]+)['"]\s*\)/)
        const urlHLS = text.match(/html5player\.setVideoHLS\s*\(\s*['"]([^'"]+)['"]\s*\)/)
        return urlHigh?.[1] || urlLow?.[1] || urlHLS?.[1] || null
    } catch (e) {
        console.error("Error en scraping XNXX:", e.message)
        return null
    }
}

// Scraping: Buscar videos en XNXX
async function xnxxSearch(query) {
    try {
        const searchUrl = `https://www.xnxx.com/search/${encodeURIComponent(query)}`
        const res = await fetch(searchUrl, { headers: { "User-Agent": UA }, timeout: 15000 })
        const html = await res.text()

        // Extraer videos del HTML de resultados
        const regex = /<div class="thumb-under">[\s\S]*?<a href="(\/video[^"]+)"[^>]*>[\s\S]*?title="([^"]*)"[\s\S]*?<span class="duration">([^<]*)<\/span>/gi
        const results = []
        let match
        while ((match = regex.exec(html)) !== null && results.length < 20) {
            results.push({
                url: 'https://www.xnxx.com' + match[1],
                title: match[2],
                duration: match[3].trim()
            })
        }

        // Fallback: regex más simple
        if (!results.length) {
            const linkRegex = /<a href="(\/video-[^"]+)"[^>]*title="([^"]*)"/gi
            while ((match = linkRegex.exec(html)) !== null && results.length < 20) {
                results.push({
                    url: 'https://www.xnxx.com' + match[1],
                    title: match[2],
                    duration: '?'
                })
            }
        }

        return results
    } catch (e) {
        console.error("Error buscando en XNXX:", e.message)
        return []
    }
}

export default {
  command: ["xnxx"],
  run: async ({ client, m, args }) => {

    // 1. Verificación NSFW
    if (!global.db.data.chats[m.chat].nsfw) {
        return m.reply('� Los comandos *NSFW* están desactivados. (◕︿◕)')
    }

    // 2. Validar Argumentos
    const query = args.join(" ")
    if (!query) return m.reply('🐲 Ingresa el nombre de un video o una URL. (◕ᴗ◕✿)')

    m.react('🔥')

    try {
      let videoUrl = ''
      let titulo = ''

      // ----------------------------------------------------
      // PASO 1: OBTENER DATOS (Link o Búsqueda)
      // ----------------------------------------------------
      if (query.startsWith("http") && query.includes("xnxx.com")) {
        videoUrl = query
        titulo = "Video XNXX"
      } else {
        // Búsqueda por scraping directo
        const resultados = await xnxxSearch(query)

        if (!resultados.length) {
            return m.reply('🐲 No se encontró el video. (╥﹏╥)')
        }

        const randomPost = resultados[Math.floor(Math.random() * resultados.length)]
        videoUrl = randomPost.url
        titulo = randomPost.title

        await m.reply(`🔍 *Encontrado:* ${titulo}\n⏱️ *Duración:* ${randomPost.duration}\n⏳ *Procesando video...*`)
      }

      // ----------------------------------------------------
      // PASO 2: OBTENER ENLACE MP4 (Scraping directo)
      // ----------------------------------------------------
      const mp4Url = await xnxxScraper(videoUrl)

      if (!mp4Url) return m.reply('🐲 No se pudo extraer el video. (╥﹏╥)')

      // ----------------------------------------------------
      // PASO 3: ENVIAR VIDEO
      // ----------------------------------------------------
      
      let mensaje = {
        document: { url: mp4Url }, 
        mimetype: 'video/mp4',     
        fileName: `${titulo}.mp4`,
        caption: `🔥 *${titulo}*`
      }

      await client.sendMessage(m.chat, mensaje, { quoted: m })

    } catch (err) {
      console.error(err)
      return m.reply(`🐲 Error: ${err.message} (╥﹏╥)`)
    }
  },
}
