import fetch from 'node-fetch'

export default {
  command: ['tiktok', 'tt', 'tiktokdl', 'ttdl'],
  category: 'downloader',
  desc: 'Descarga videos de TikTok sin marca de agua.',
  
  run: async ({ client, m, args }) => {
    try {
      // 1. Validar si hay enlace
      const url = args[0]
      const tiktokRegex = /^(https?:\/\/)?(www\.|vm\.|vt\.|t\.)?tiktok\.com\/.+/i

      if (!url || !tiktokRegex.test(url)) {
        return m.reply(`🐲 Ingresa un enlace de TikTok (◕ᴗ◕)\n│ Ejemplo: /tiktok https://vm.tiktok.com/XYZ`)
      }

      // Reacción de "Buscando"
      await client.sendMessage(m.chat, { react: { text: "⏳", key: m.key } })

      // 2. Usar API de TikWM (Es la más estable y gratuita actualmente)
      const apiUrl = `https://www.tikwm.com/api/?url=${url}&hd=1`
      const res = await fetch(apiUrl)
      const json = await res.json()

      // Validar respuesta
      if (!json || json.code !== 0 || !json.data) {
        throw new Error('🐲 No se pudo obtener el video (╥﹏╥)')
      }

      const data = json.data
      
      // 3. Construir Caption (Información del video)
      const caption = `╭─── ⋆🐉⋆ ───
│ 🎬 *TIKTOK DOWNLOAD*
├───────────────
│ ❀ *Autor:* ${data.author?.nickname || data.author?.unique_id || 'Desconocido'}
│ ❀ *Descripción:* ${data.title || 'Sin descripción'}
│ ❀ *Likes:* ${(data.digg_count || 0).toLocaleString()}
│ ❀ *Comentarios:* ${(data.comment_count || 0).toLocaleString()}
│ ❀ *Compartidos:* ${(data.share_count || 0).toLocaleString()}
│ ❀ *Música:* ${data.music_info?.title || 'Original Sound'}
╰─── ⋆✨⋆ ───`.trim()

      // 4. Enviar Video (Prioridad HD, sino normal)
      const videoUrl = data.hdplay || data.play || data.wmplay
      
      await client.sendMessage(m.chat, { 
        video: { url: videoUrl }, 
        caption: caption,
        gifPlayback: false // Enviamos como video normal con audio
      }, { quoted: m })

      // Reacción de éxito
      await client.sendMessage(m.chat, { react: { text: "✅", key: m.key } })

      // Opcional: Enviar Audio si el usuario lo pide (puedes agregar lógica extra aquí)

    } catch (e) {
      console.error(e)
      // Reacción de error
      await client.sendMessage(m.chat, { react: { text: "❌", key: m.key } })
      m.reply(`🐲 Error al descargar (╥﹏╥)\n│ ${e.message || 'Intenta más tarde'}`)
    }
  }
}
