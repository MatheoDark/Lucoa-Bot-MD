import fetch from 'node-fetch';

export default {
  command: ['tiktoksearch', 'ttsearch'],
  category: 'search',
  run: async ({client, m, args, usedPrefix, command}) => {
    if (!args || !args.length) {
      return m.reply(`*⚠️ Ingresa un término de búsqueda.*\nEjemplo: ${usedPrefix + command} gatos graciosos`)
    }

    const query = args.join(' ')
    await m.reply('🔍 *Buscando en TikTok...*')

    try {
      const url = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=5`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      const json = await res.json()

      if (!json || json.code !== 0 || !json.data?.videos?.length) {
        return m.reply(`*⚠️ No se encontraron resultados para "${query}".*`)
      }

      const videos = json.data.videos.slice(0, 5)

      for (const v of videos) {
        const duration = v.duration ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, '0')}` : 'N/A'
        const caption = `➩ *${v.title || 'Sin título'}*\n\n` +
          `✎ *Autor ›* ${v.author?.nickname || 'Desconocido'} (@${v.author?.unique_id || '???'})\n` +
          `ꕥ *Reproducciones ›* ${v.play_count?.toLocaleString() || 0}\n` +
          `♡ *Me gusta ›* ${v.digg_count?.toLocaleString() || 0}\n` +
          `❖ *Comentarios ›* ${v.comment_count?.toLocaleString() || 0}\n` +
          `❒ *Compartidos ›* ${v.share_count?.toLocaleString() || 0}\n` +
          `❀ *Duración ›* ${duration}`

        const videoUrl = v.play
        if (videoUrl) {
          try {
            await client.sendMessage(m.chat, {
              video: { url: videoUrl },
              caption,
              mimetype: 'video/mp4'
            }, { quoted: m })
          } catch {
            // Si falla enviar video, enviar como URL
            await client.sendMessage(m.chat, {
              image: { url: v.cover || v.origin_cover },
              caption: caption + `\n✧ *URL ›* https://www.tiktok.com/@${v.author?.unique_id}/video/${v.video_id}`
            }, { quoted: m })
          }
        }
      }
    } catch (e) {
      console.error('Error TikTok Search:', e)
      await m.reply(msgglobal)
    }
  },
};
