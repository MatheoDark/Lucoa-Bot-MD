import fetch from 'node-fetch'

let enviando = false

// ===== VxTwitter API (reemplazo de tweeload que murió) =====
async function TwitterDL(url) {
  const idMatch = url.match(/\/status(?:es)?\/(\d+)/)
  if (!idMatch) throw new Error('No se pudo extraer el ID del tweet.')

  const tweetId = idMatch[1]
  const userMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status/)
  const user = userMatch?.[1] || 'i'

  const apiUrl = `https://api.vxtwitter.com/${user}/status/${tweetId}`
  const res = await fetch(apiUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
    timeout: 15000
  })

  if (!res.ok) throw new Error(`VxTwitter respondió ${res.status}`)
  const data = await res.json()

  if (!data.mediaURLs?.length && !data.media_extended?.length) {
    throw new Error('Este tweet no contiene media descargable.')
  }

  const caption = data.text || ''
  const mediaExtended = data.media_extended || []
  const hasVideo = mediaExtended.some(m => m.type === 'video' || m.type === 'gif')

  let media = []
  let type = 'photo'

  if (hasVideo) {
    type = 'video'
    for (const item of mediaExtended) {
      if (item.type === 'video' || item.type === 'gif') {
        media.push({ type: item.type, url: item.url, thumbnail: item.thumbnail_url || '' })
      }
    }
  } else {
    type = 'photo'
    const urls = data.mediaURLs || mediaExtended.map(m => m.url)
    media = urls.map(u => ({ url: u }))
  }

  return {
    status: 'success',
    result: { type, caption, media, likes: data.likes, retweets: data.retweets }
  }
}

export default {
  command: ['x', 'xtt', 'twitter', 'xtwitter'],
  category: 'downloader',
  run: async ({ client, m, text, usedPrefix, command }) => {
    if (!text) throw `🐲 Usa: *${usedPrefix + command}* <enlace> (◕ᴗ◕)\nEjemplo: *${usedPrefix + command}* https://twitter.com/auronplay/status/1586487664274206720`
    if (enviando) return
    enviando = true

    try {
      await m.react('⏳')
      const res = await TwitterDL(text)

      if (res?.result.type === 'video') {
        const caption = res.result.caption || '🐉 Aquí está tu video~ (◕ᴗ◕✿)'
        for (let i = 0; i < res.result.media.length; i++) {
          await client.sendMessage(m.chat, {
            document: { url: res.result.media[i].url },
            mimetype: 'video/mp4',
            fileName: `video_${i + 1}.mp4`,
            caption: i === 0 ? caption : ''
          }, { quoted: m })
        }
      } else if (res?.result.type === 'photo') {
        const caption = res.result.caption || '🐉 Aquí está tu imagen~ (◕ᴗ◕✿)'
        for (let i = 0; i < res.result.media.length; i++) {
          await client.sendMessage(m.chat, {
            image: { url: res.result.media[i].url },
            caption: i === 0 ? caption : ''
          }, { quoted: m })
        }
      }

      await m.react('✅')
      enviando = false
    } catch (e) {
      enviando = false
      console.error(e)
      await m.react('❌')
      throw `🐲 Error: ${e.message || 'Intenta más tarde'} (╥﹏╥)`
    }
  }
}