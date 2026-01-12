import fetch from "node-fetch"
// import sharp from 'sharp' // Desactivado para ahorrar RAM y evitar errores de dependencias

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
      // Configuración de API (Usa variables globales o valores por defecto)
      const apikey = global.api?.key || 'tu_api_key'
      const apiurl = global.api?.url || 'https://delirius-apii.vercel.app'

      let videoUrl = ''
      let titulo = ''
      let imagen = ''
      let duracion = ''

      // ----------------------------------------------------
      // CASO A: Link Directo
      // ----------------------------------------------------
      if (query.startsWith("http") && query.includes("xnxx.com")) {
        videoUrl = query
        titulo = "Video XNXX" // Título temporal
      } 
      // ----------------------------------------------------
      // CASO B: Búsqueda
      // ----------------------------------------------------
      else {
        const searchUrl = `${apiurl}/nsfw/search/xnxx?query=${query}&key=${apikey}`
        const res = await fetch(searchUrl)
        if (!res.ok) return m.reply("❌ Error al conectar con XNXX API")

        const json = await res.json()
        
        // Verificamos estructura (data o resultados)
        const resultados = json.data || json.resultados || []
        
        if (!json.status || resultados.length === 0) {
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
                caption: `🔍 *XNXX Encontrado*\n\n📝 *Titulo:* ${titulo}\n⏱️ *Duración:* ${duracion || '?'}\n⏳ *Descargando...*` 
            }, { quoted: m })
        }
      }

      // ----------------------------------------------------
      // DESCARGA
      // ----------------------------------------------------
      const downloadApi = `${apiurl}/nsfw/dl/xnxx?url=${encodeURIComponent(videoUrl)}&key=${apikey}`
      const downloadRes = await fetch(downloadApi)
      
      if (!downloadRes.ok) return m.reply("❌ Error en la API de descarga.")
      
      const downloadJson = await downloadRes.json()

      // Verificar si la descarga fue exitosa
      // XNXX API suele devolver files.low / files.high
      const data = downloadJson.data || downloadJson.resultado
      
      if (!downloadJson.status || !data) {
          return m.reply("❌ No se pudo obtener el enlace de descarga.")
      }

      // Intentamos obtener la URL del video (Low o High)
      const mp4Url = data.files?.low || data.files?.high || data.url
      
      // Actualizamos título si la API de descarga nos da uno mejor
      const finalTitle = data.title || titulo || "XNXX Video"

      if (!mp4Url) return m.reply("❌ No se encontró el archivo MP4.")

      // ----------------------------------------------------
      // ENVÍO SEGURO (Sin Buffer en RAM)
      // ----------------------------------------------------
      // Usamos { url: ... } para que WhatsApp lo descargue directamente
      
      let mensaje = {
        document: { url: mp4Url }, // Stream directo
        mimetype: 'video/mp4',     // CORREGIDO: Es video, no audio (mp3)
        fileName: `${finalTitle}.mp4`,
        caption: `🔥 *${finalTitle}*`
      }

      await client.sendMessage(m.chat, mensaje, { quoted: m })

    } catch (err) {
      console.error(err)
      return m.reply(`❌ Error interno: ${err.message}`)
    }
  },
}
