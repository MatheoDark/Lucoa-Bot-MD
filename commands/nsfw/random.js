import fetch from 'node-fetch';

// Mapeo de comandos a endpoints de waifu.pics
const waifuPicsMap = {
  nsfwloli: 'waifu',
  nsfwfoot: 'waifu',
  yuri: 'waifu',
  panties: 'waifu',
  tetas: 'neko',
  ecchi: 'waifu',
  hentai: 'waifu',
  imagenlesbians: 'waifu',
  pene: 'waifu'
};

const comandos = Object.keys(waifuPicsMap);

export default {
  command: comandos,
  category: 'nsfw',
  group: true,

  run: async ({ client, m, command }) => {
    try {
      if (m.isGroup && !db.data.chats[m.chat]?.nsfw) {
        return m.reply('� Estos comandos están desactivados. (◕︿◕)');
      }

      const type = waifuPicsMap[command] || 'waifu'
      let imageUrl = null

      // 1. waifu.pics NSFW
      try {
        const res = await fetch(`https://api.waifu.pics/nsfw/${type}`)
        const json = await res.json()
        if (json.url) imageUrl = json.url
      } catch {}

      // 2. Fallback: waifu.im
      if (!imageUrl) {
        try {
          const res = await fetch(`https://api.waifu.im/search?is_nsfw=true`)
          const json = await res.json()
          if (json.images?.[0]?.url) imageUrl = json.images[0].url
        } catch {}
      }

      if (!imageUrl) {
        return m.reply('🐲 No hay imágenes disponibles. (╥﹏╥)');
      }

      await client.sendMessage(
        m.chat,
        {
          image: { url: imageUrl },
          caption: `🔥 *${command}*`
        },
        { quoted: m }
      );

    } catch (err) {
      console.error(err);
      m.reply('🐲 Error al obtener la imagen. (╥﹏╥)');
    }
  }
};