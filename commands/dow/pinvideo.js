import fetch from 'node-fetch'

// 🐲 LUCOA • Pinterest Video Downloader
// Descarga videos de Pinterest usando og:video del HTML

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const isPinterestUrl = (s = '') =>
  /(https?:\/\/)?(www\.)?pinterest\.(com|cl|es|com\.mx)\/.+/i.test(s) || /pin\.it\//i.test(s)

async function downloadPinterest(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    timeout: 15000,
    redirect: 'follow'
  })
  if (!res.ok) throw new Error('No se pudo acceder al enlace de Pinterest.')

  const html = await res.text()

  const ogVideo = html.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i)
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)

  return {
    video: ogVideo?.[1] || null,
    image: ogImage?.[1] || null,
    title: ogTitle?.[1]?.replace(/&amp;/g, '&')?.replace(/&quot;/g, '"') || 'Pinterest Media',
    isVideo: !!ogVideo
  }
}

export default {
  command: ['pinvideo', 'pindl', 'pinterestdl'],
  category: 'downloader',

  run: async ({ client, m, args, usedPrefix, command }) => {
    const url = args[0]?.trim()

    if (!url || !isPinterestUrl(url)) {
      return m.reply(
        `📌 Ingresa un enlace de *Pinterest* válido.\n` +
        `Ejemplo: ${usedPrefix + command} https://www.pinterest.com/pin/862439397377053654`
      )
    }

    await m.react('⏳')

    try {
      const result = await downloadPinterest(url)

      if (result.video) {
        await client.sendMessage(m.chat, {
          document: { url: result.video },
          mimetype: 'video/mp4',
          fileName: 'pinterest_video.mp4',
          caption: `📌 *Video descargado desde Pinterest*\n📝 ${result.title}`
        }, { quoted: m })
      } else if (result.image) {
        await client.sendMessage(m.chat, {
          image: { url: result.image },
          caption: `📌 *Imagen descargada desde Pinterest*\n📝 ${result.title}`
        }, { quoted: m })
      } else {
        return m.reply('❌ No se pudo extraer media de este enlace.')
      }

      await m.react('✅')
    } catch (e) {
      console.error(e)
      await m.react('❌')
      m.reply(`❌ Error: ${e.message}`)
    }
  }
}
