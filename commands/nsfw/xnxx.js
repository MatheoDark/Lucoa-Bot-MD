import fetch from "node-fetch"

// 🛠️ FUNCIÓN DE RESPALDO MEJORADA (Con Headers y Regex Flexible)
async function xnxxScraper(url) {
    try {
        // Importante: Headers para parecer un navegador real
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        const res = await fetch(url, { headers })
        const text = await res.text()
        
        // Regex mejorado: Acepta comillas simples ' y dobles "
        const urlHigh = text.match(/html5player\.setVideoUrlHigh\s*\(\s*['"]([^'"]+)['"]\s*\)/)
        const urlLow = text.match(/html5player\.setVideoUrlLow\s*\(\s*['"]([^'"]+)['"]\s*\)/)
        const urlHLS = text.match(/html5player\.setVideoHLS\s*\(\s*['"]([^'"]+)['"]\s*\)/)
        
        if (urlHigh) return urlHigh[1]
        if (urlLow) return urlLow[1]
        if (urlHLS) return urlHLS[1]
        
        return null
    } catch (e) {
        console.error("Error en scraping XNXX:", e)
        return null
    }
}

export default {
  command: ["xnxx"],
  run: async ({ client, m, args }) => {

    // 1. Verificación NSFW
    if (!global.db.data.chats[m.chat].nsfw) {
        return m.reply('🚫 Los comandos *NSFW* están desactivados en este Grupo.')
    }

    // 2. Validar Argumentos
    const query = args.join(" ")
    if (!query) return m.reply("🔞 Ingresa el nombre de un video o una URL de XNXX.")

    m.react('🔥')

    try {
      const apikey = global.api?.key || 'tu_api_key'
      const apiurl = global.api?.url || 'https://delirius-apii.vercel.app'

      let videoUrl = ''
      let titulo = ''
      let imagen = ''
      let duracion = ''
      let pageInfo = ''

      // ----------------------------------------------------
      // PASO 1: OBTENER DATOS (Link o Búsqueda)
      // ----------------------------------------------------
      if (query.startsWith("http") && query.includes("xnxx.com")) {
        // CASO A: Link Directo
        videoUrl = query
        titulo = "Video XNXX"
      } else {
        // CASO B: Búsqueda con PAGINACIÓN ALEATORIA (Anti-Repetidos)
        const randomPage = Math.floor(Math.random() * 5) + 1 // Busca entre página 1 y 5
        
        const searchUrl = `${apiurl}/nsfw/search/xnxx?query=${query}&page=${randomPage}&key=${apikey}`
        const res = await fetch(searchUrl)
        const json = await res.json().catch(() => ({}))
        
        let resultados = json.data || json.resultados || []
        
        // Si la página aleatoria falla, volver a la 1
        if (!resultados || resultados.length === 0) {
             if (randomPage > 1) {
                 const fallbackUrl = `${apiurl}/nsfw/search/xnxx?query=${query}&key=${apikey}`
                 const res2 = await fetch(fallbackUrl)
                 const json2 = await res2.json().catch(() => ({}))
                 resultados = json2.data || json2.resultados || []
                 pageInfo = '(Pag 1)'
             }
        } else {
             pageInfo = `(Pag ${randomPage})`
        }

        if (!resultados || resultados.length === 0) {
            return m.reply("❌ No se encontró el video.")
        }

        const randomPost = resultados[Math.floor(Math.random() * resultados.length)]
        
        videoUrl = randomPost.url
        titulo = randomPost.title
        imagen = randomPost.image || randomPost.cover
        duracion = randomPost.duration

        // Enviamos portada (Con protección anti-crash por 404)
        if (imagen) {
            try {
                await client.sendMessage(m.chat, { 
                    image: { url: imagen }, 
                    caption: `🔍 *Encontrado:* ${titulo}\n⏱️ *Duración:* ${duracion || '?'} ${pageInfo}\n⏳ *Procesando video...*` 
                }, { quoted: m })
            } catch (e) {
                // Si la imagen falla, enviamos texto
                await m.reply(`🔍 *Encontrado:* ${titulo}\n⏳ *Procesando video...*`)
            }
        } else {
             await m.reply(`🔍 *Encontrado:* ${titulo}\n⏳ *Procesando video...*`)
        }
      }

      // ----------------------------------------------------
      // PASO 2: OBTENER ENLACE MP4 (Descarga)
      // ----------------------------------------------------
      let mp4Url = null
      
      // INTENTO 1: API
      try {
          const downloadApi = `${apiurl}/nsfw/dl/xnxx?url=${encodeURIComponent(videoUrl)}&key=${apikey}`
          const downloadRes = await fetch(downloadApi)
          const downloadJson = await downloadRes.json().catch(() => ({}))
          const data = downloadJson.data || downloadJson.resultado
          
          if (data) {
             mp4Url = data.files?.low || data.files?.high || data.url
             if (data.title) titulo = data.title
          }
      } catch (e) {
          console.log("Fallo API descarga, pasando a scraping...")
      }

      // INTENTO 2: Scraping Manual (Si la API falló)
      if (!mp4Url) {
          console.log("⚠️ Usando Scraping manual para:", videoUrl)
          mp4Url = await xnxxScraper(videoUrl)
      }

      if (!mp4Url) return m.reply("❌ No se pudo extraer el video (ni por API ni por Scraping).")

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
      return m.reply(`❌ Error interno: ${err.message}`)
    }
  },
}
