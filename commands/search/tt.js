import fetch from 'node-fetch';

export default {
  command: ['tiktoksearch', 'ttsearch'],
  category: 'search',
  run: async ({client, m, args, usedPrefix, command}) => {
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId]
    const banner = botSettings.icon

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

      let message = ``
      videos.forEach((v, index) => {
        const duration = v.duration ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, '0')}` : 'N/A'
        message += `➩ *Título ›* ${v.title || 'Sin título'}

✎ *Autor ›* ${v.author?.nickname || 'Desconocido'} (@${v.author?.unique_id || '???'})
ꕥ *Reproducciones ›* ${v.play_count?.toLocaleString() || 0}
❖ *Comentarios ›* ${v.comment_count?.toLocaleString() || 0}
❒ *Compartidos ›* ${v.share_count?.toLocaleString() || 0}
♡ *Me gusta ›* ${v.digg_count?.toLocaleString() || 0}
★ *Descargas ›* ${v.download_count?.toLocaleString() || 0}
❀ *Duración ›* ${duration}
✧ *URL ›* https://www.tiktok.com/@${v.author?.unique_id}/video/${v.video_id}

${index < videos.length - 1 ? '╾۪〬─ ┄۫╌ ׄ┄┈۪ ─〬 ׅ┄╌ ۫┈ ─ׄ─۪〬 ┈ ┄۫╌ ┈┄۪ ─ׄ〬╼' : ''}
`
      })

      await client.sendMessage(
        m.chat,
        {
          image: { url: banner },
          caption: message.trim(),
        },
        { quoted: m },
      )
    } catch (e) {
      console.error('Error TikTok Search:', e)
      await m.reply(msgglobal)
    }
  },
};
