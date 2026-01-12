import fetch from "node-fetch"
import { getBuffer } from '../../lib/message.js'
// import sharp from 'sharp' // No es estrictamente necesario si usamos la imagen original

export default {
  command: ["xvideos", "xv"],
  run: async ({ client, m, args }) => {

    // 1. Verificación NSFW
    if (!global.db.data.chats[m.chat].nsfw) {
        return m.reply('🚫 Los comandos *NSFW* están desactivados en este Grupo.')
    }

    // 2. Verificación de argumentos
    const query = args.join(" ")
    if (!query) return m.reply("🔞 Ingresa el nombre de un video o una URL de XVideos.")

    m.react('🔥')

    try {
      // API KEY y URL (Asegúrate de que estas variables globales existan en tu bot, si no, usa una pública)
      const apikey = global.api?.key || 'tu_api_key' 
      const apiurl = global.api?.url || 'https://delirius-apii.vercel.app' // URL de respaldo por si acaso

      let videoUrl = ''
      let titulo = ''
      let imagen = ''
      let duracion = ''

      // ----------------------------------------------------
      // CASO A: El usuario envió un LINK
      // ----------------------------------------------------
      if (query.startsWith("http") && query.includes("xvideos.com")) {
        videoUrl = query
        // Intentamos sacar info básica del link (o dejar genérico)
        titulo = "Video XVideos"
      } 
      // ----------------------------------------------------
      // CASO B: El usuario envió una BÚSQUEDA
      // ----------------------------------------------------
      else {
        const searchApi = `${apiurl}/nsfw/search/xvideos?query=${query}&key=${apikey}`
        const res = await fetch(searchApi)
        if (!res.ok) return m.reply("❌ Error al buscar en XVideos.")

        const json = await res.json()
        if (!json.status || !json.data || json.data.length === 0) {
            // Nota: Algunas APIs devuelven 'data', otras 'resultados'. Ajusta según tu API.
            // Si tu API usa json.resultados, cámbialo aquí.
            if (json.resultados && json.resultados.length > 0) {
                 // Soporte para estructura alternativa
                 const randomPost = json.resultados[Math.floor(Math.random() * json.resultados.length)]
                 videoUrl = randomPost.url
                 titulo = randomPost.title
                 imagen = randomPost.image || randomPost.cover
                 duracion = randomPost.duration
            } else {
                 return m.reply("❌ No se encontró ningún video con ese nombre.")
            }
        } else {
             // Estructura estándar delirius/otros
             const randomPost = json.data[Math.floor(Math.random() * json.data.length)]
             videoUrl = randomPost.url
             titulo = randomPost.title
             imagen = randomPost.image
             duracion = randomPost.duration
        }

        // Enviamos la portada primero para que sepa que lo encontramos
        if (imagen) {
            await client.sendMessage(m.chat, { 
                image: { url: imagen }, 
                caption: `🔍 *Encontrado:* ${titulo}\n⏳ *Descargando video...*` 
            }, { quoted: m })
        }
      }

      // ----------------------------------------------------
      // DESCARGA
      // ----------------------------------------------------
      // Usamos la API de descarga
      const downloadUrl = `${apiurl}/nsfw/dl/xvideos?url=${videoUrl}&key=${apikey}`
      const downloadRes = await fetch(downloadUrl)
      
      if (!downloadRes.ok) return m.reply("❌ Error en la API de descarga.")
      
      const downloadJson = await downloadRes.json()
      
      // Verificamos si la API dio error
      if (!downloadJson.status || (!downloadJson.data && !downloadJson.resultado)) {
          return m.reply("❌ No se pudo obtener el link de descarga.")
      }

      // Extraemos el link MP4 y el título final
      // Ajuste: Algunas APIs devuelven .data.urls.low, otras .resultado.videos.low
      const data = downloadJson.data || downloadJson.resultado
      const mp4Url = data.urls?.low || data.urls?.high || data.videos?.low || data.videos?.high || data.url
      
      // Actualizamos el título con la info real del descargador si es posible
      const finalTitle = data.title || titulo || "XVideos MP4"

      if (!mp4Url) return m.reply("❌ No se encontró enlace MP4.")

      // ----------------------------------------------------
      // ENVÍO OPTIMIZADO (Sin colapsar RAM)
      // ----------------------------------------------------
      // IMPORTANTE: Usamos { url: ... } en lugar de descargar el buffer
      // Enviamos como 'video' normal para que se pueda ver en WhatsApp
      // Si prefieres documento, cambia 'video:' por 'document:' y agrega 'mimetype' y 'fileName'
      
      await client.sendMessage(m.chat, {
          document: { url: mp4Url }, // Stream directo desde la URL
          mimetype: 'video/mp4',     // CORREGIDO: mp3 es audio, mp4 es video
          fileName: `${finalTitle}.mp4`,
          caption: `🔥 *${finalTitle}*`,
          // Si tienes la imagen, la usamos de miniatura (jpegThumbnail requiere buffer pequeño)
          // Si da error de sharp, comenta la línea de jpegThumbnail
          // jpegThumbnail: imagen ? await getBuffer(imagen) : null 
      }, { quoted: m })

    } catch (err) {
      console.error(err)
      return m.reply(`❌ Ocurrió un error inesperado: ${err.message}`)
    }
  },
}
