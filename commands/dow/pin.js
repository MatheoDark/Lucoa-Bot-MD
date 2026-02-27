import fetch from 'node-fetch'

// 🐲 LUCOA • Pinterest (DuckDuckGo Image Search)
// Busca imágenes de Pinterest via DuckDuckGo para evitar APIs muertas.

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// Cache global para paginación (#pin 2)
global.__lucoaPinCache = global.__lucoaPinCache || Object.create(null)

// Detección de Links
const isPinterestUrl = (s = '') => /(https?:\/\/)?(www\.)?pinterest\.(com|cl|es)\/.+/i.test(s) || /pin\.it\//i.test(s)

// ===== 1. MOTOR DE BÚSQUEDA (DUCKDUCKGO) =====
async function searchPinterest(query) {
  const searchQuery = `site:pinterest.com ${query}`
  const headers = { 'User-Agent': UA }

  // Paso 1: Obtener token VQD desde la página de DuckDuckGo
  const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images`
  const tokenRes = await fetch(tokenUrl, { headers, timeout: 15000 })
  if (!tokenRes.ok) throw new Error('No se pudo conectar a DuckDuckGo.')

  const tokenHtml = await tokenRes.text()
  const vqdMatch = tokenHtml.match(/vqd=['"]([^'"]+)['"]/)
  if (!vqdMatch) throw new Error('No se pudo obtener token de búsqueda.')
  const vqd = vqdMatch[1]

  // Paso 2: Buscar imágenes con el token
  const imgUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(searchQuery)}&o=json&p=1&s=0&u=bing&f=,,,,,&l=wt-wt&vqd=${vqd}`
  const imgRes = await fetch(imgUrl, {
    headers: { 'User-Agent': UA, 'Referer': 'https://duckduckgo.com/' },
    timeout: 15000
  })
  if (!imgRes.ok) throw new Error('Error al buscar imágenes.')

  const data = await imgRes.json()
  if (!data.results?.length) throw new Error('No encontré resultados en Pinterest.')

  // Filtrar solo URLs de pinimg.com (imágenes reales de Pinterest)
  const pinResults = data.results
    .filter(r => r.image && /pinimg\.com/i.test(r.image))
    .map(r => ({
      url: r.image,
      thumbnail: r.thumbnail,
      desc: r.title || 'Pinterest',
      author: 'Pinterest',
      saves: 0,
      isVideo: false
    }))

  // Si no hay pinimg, usar todos los resultados igualmente
  const finalResults = pinResults.length ? pinResults : data.results.filter(r => r.image).map(r => ({
    url: r.image,
    thumbnail: r.thumbnail,
    desc: r.title || 'Pinterest',
    author: 'Pinterest',
    saves: 0,
    isVideo: false
  }))

  if (!finalResults.length) throw new Error('No encontré imágenes válidas.')
  return finalResults
}

// ===== 2. DESCARGA DIRECTA POR LINK =====
async function downloadPinterestLink(url) {
  // Intentar resolver el link de Pinterest y extraer la imagen OG
  const headers = { 'User-Agent': UA }
  const res = await fetch(url, { headers, timeout: 15000, redirect: 'follow' })
  if (!res.ok) throw new Error('No se pudo acceder al enlace de Pinterest.')

  const html = await res.text()

  // Buscar og:image o og:video en el HTML
  const ogVideo = html.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i)
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)

  const mediaUrl = ogVideo?.[1] || ogImage?.[1]
  if (!mediaUrl) throw new Error('No se pudo extraer la imagen/video del enlace.')

  return {
    url: mediaUrl,
    desc: ogTitle?.[1] || 'Pinterest Media',
    isVideo: !!ogVideo
  }
}

// ===== COMANDO PRINCIPAL =====
export default {
  command: ['pin', 'pinterest', 'pinvideo', 'pindl', 'pinterestdl'],
  category: 'downloader',
  run: async ({ client, m, args }) => {
    const input = args.join(' ').trim()
    const chatId = m.chat

    if (!input) {
      return m.reply(
        `🐲 *Lucoa Pinterest*\n\n` +
        `🔎 *Buscar:* #pin goku\n` +
        `🔗 *Link:* #pin https://pin.it/...\n` +
        `➡️ *Siguiente:* #pin 2`
      )
    }

    await m.react('🔍')

    try {
      // CASO A: El usuario pide el siguiente resultado (#pin 2)
      if (/^\d+$/.test(input)) {
        const idx = parseInt(input, 10) - 1
        const cache = global.__lucoaPinCache[chatId]

        if (!cache?.results?.length) return m.reply(`🐲 *Primero haz una búsqueda.* (Ej: #pin autos)`)
        if (idx < 0 || idx >= cache.results.length) return m.reply(`🐲 *Solo tengo ${cache.results.length} resultados.*`)

        const item = cache.results[idx]
        const caption = `🐲 *${idx + 1}/${cache.results.length}* • ${item.desc.substring(0, 50)}...`
        
        await client.sendMessage(chatId, { image: { url: item.url }, caption }, { quoted: m })
        return m.react('✅')
      }

      // CASO B: El usuario envía un LINK (Descarga directa)
      if (isPinterestUrl(input)) {
        const result = await downloadPinterestLink(input)
        const caption = `🐲 *Descarga completada*\n📝 ${result.desc}`

        if (result.isVideo) {
          // ✅ Usar document en lugar de video para mejor compatibilidad móvil
          await client.sendMessage(chatId, { document: { url: result.url }, mimetype: 'video/mp4', fileName: 'pinterest_video.mp4', caption }, { quoted: m })
        } else {
          await client.sendMessage(chatId, { image: { url: result.url }, caption }, { quoted: m })
        }
        return m.react('✅')
      }

      // CASO C: Búsqueda de Texto (Search)
      const results = await searchPinterest(input)
      
      // Guardamos en caché
      global.__lucoaPinCache[chatId] = { query: input, results, ts: Date.now() }
      
      const first = results[0]
      const caption = 
        `╭━━━〔 🐲 𝗟𝗨𝗖𝗢𝗔 • Pinterest 〕━━━⬣\n` +
        `🔎 *Búsqueda:* ${input}\n` +
        `📝 *Desc:* ${first.desc}\n` +
        `👤 *Autor:* ${first.author}\n` +
        `💾 *Guardados:* ${first.saves}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━⬣\n` +
        `👉 Responde con *#pin 2* para ver el siguiente.`

      await client.sendMessage(chatId, { image: { url: first.url }, caption }, { quoted: m })
      await m.react('✅')

    } catch (e) {
      console.error(e)
      await m.react('❌')
      m.reply(`🐲 *Error:* ${e.message}`)
    }
  }
}
