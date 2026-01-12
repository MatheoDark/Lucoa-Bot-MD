import fetch from "node-fetch"

// Función de respaldo: Escanear el HTML directamente si la API falla
async function xnxxScraper(url) {
    try {
        const res = await fetch(url)
        const text = await res.text()
        
        // Buscamos el enlace MP4 dentro del código de la página (Alta o Baja calidad)
        const urlHigh = text.match(/html5player\.setVideoUrlHigh\('([^']+)'\)/)
        const urlLow = text.match(/html5player\.setVideoUrlLow\('([^']+)'\)/)
        
        return urlHigh ? urlHigh[1] : (urlLow ? urlLow[1] : null)
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

      // ----------------------------------------------------
      // PASO 1: OBTENER URL DEL VIDEO (Link o Búsqueda)
      // ----------------------------------------------------
      if (query.startsWith("http") && query.includes("xnxx.com")) {
        // CASO A: Link Directo
        videoUrl = query
        titulo = "Video XNXX"
      } else {
        // CASO B: Búsqueda en API
        const searchUrl = `${apiurl}/nsfw/search/xnxx?query=${query}&key=${apikey}`
        const res = await fetch(searchUrl)
        const json = await res.json().catch(() => ({}))
        
        const resultados = json.data || json.resultados || []
        
        if (!resultados || resultados.length === 0) {
            return m.reply("❌ No se encontró el video.")
        }

        const randomPost = resultados[Math.floor(Math.random() * resultados.length)]
        
        videoUrl = randomPost.url
        titulo = randomPost.title
        imagen = randomPost.image || randomPost.cover
        duracion = randomPost.duration

        // Enviamos la portada primero
        if (imagen) {
            await client.sendMessage(m.chat, { 
                image: { url: imagen }, 
                caption: `🔍 *Encontrado:* ${titulo}\n⏱️ *Duración:* ${duracion || '?'}\n⏳ *Procesando video...*` 
            }, { quoted: m })
        }
      }

      // ----------------------------------------------------
      // PASO 2: OBTENER ENLACE MP4 (Descarga)
      // ----------------------------------------------------
      let mp4Url = null
      
      // INTENTO 1: Usar la API
      try {
          const downloadApi = `${apiurl}/nsfw/dl/xnxx?url=${encodeURIComponent(videoUrl)}&key=${apikey}`
          const downloadRes = await fetch(downloadApi)
          const downloadJson = await downloadRes.json().catch(() => ({}))
          const data = downloadJson.data || downloadJson.resultado
          
          if (data) {
             mp4Url = data.files?.low || data.files?.high || data.url
             // Actualizamos título si la API nos da uno mejor
             if (data.title) titulo = data.title
          }
      } catch (e) {
          console.log("Fallo API descarga, intentando scraping...")
      }

      // INTENTO 2: Scraping Manual (Si la API falló o devolvió null)
      if (!mp4Url) {
          console.log("⚠️ API falló. Usando Scraping manual para:", videoUrl)
          mp4Url = await xnxxScraper(videoUrl)
      }

      if (!mp4Url) return m.reply("❌ No se pudo extraer el video (ni por API ni por Scraping). Intenta con otro.")

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
