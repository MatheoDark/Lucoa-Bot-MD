import fetch from 'node-fetch'
import sharp from 'sharp'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

// Búsqueda en múltiples proveedores
const APIS = {
  bing: {
    search: (q) => `https://www.bing.com/images/search?q=${encodeURIComponent(q)}`,
    parse: async (html) => {
      // Extraer URLs de imágenes desde el HTML de Bing
      const matches = html.match(/"murl":"([^"]+)"/g) || []
      return matches
        .map(m => m.match(/"murl":"([^"]+)"/)?.[1])
        .filter(Boolean)
        .map(url => url.replace(/\\\//g, '/'))
        .slice(0, 10)
    }
  },
  
  unsplash: {
    search: (q) => `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=10&client_id=oW-dH-Ydr-jN3qUJpP9H-sKLV0U1UWdVMrSJzjSwmQo`,
    parse: async (data) => {
      const json = typeof data === 'string' ? JSON.parse(data) : data
      return json.results?.map(r => r.urls.regular) || []
    }
  },
  
  pexels: {
    search: (q) => `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=10`,
    headers: { 'Authorization': 'PZ11UKc14JrMVDJLVYUF9VVJZKvn6agDC5aNHvMY2ywVkZUqVx8O9xQ5' },
    parse: async (data) => {
      const json = typeof data === 'string' ? JSON.parse(data) : data
      return json.photos?.map(p => p.src.large) || []
    }
  },

  pixabay: {
    search: (q) => `https://pixabay.com/api/?key=44062267-4e6dc48e8fb7b3f0f9e35&q=${encodeURIComponent(q)}&per_page=10&image_type=photo`,
    parse: async (data) => {
      const json = typeof data === 'string' ? JSON.parse(data) : data
      return json.hits?.map(h => h.largeImageURL) || []
    }
  }
}

// Cache de resultados
global.__lucoaImagenCache = global.__lucoaImagenCache || Object.create(null)

async function searchImages(query, provider = 'bing') {
  console.log(`[IMAGEN] Buscando "${query}" en ${provider}...`)
  const api = APIS[provider]
  if (!api) throw new Error(`Proveedor no soportado: ${provider}`)

  try {
    const url = api.search(query)
    const headers = { 'User-Agent': UA, ...api.headers }
    const res = await fetch(url, { headers, timeout: 15000 })
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    
    const data = await res.text()
    const urls = await api.parse(data)
    
    if (!urls.length) throw new Error('No se encontraron imágenes')
    console.log(`[IMAGEN] ✅ ${provider}: ${urls.length} resultados`)
    return urls
  } catch (e) {
    console.log(`[IMAGEN] ❌ ${provider} falló: ${e.message}`)
    return []
  }
}

async function downloadImage(url, maxRetries = 2) {
  let lastError
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`[IMAGEN] Descargando: ${url.substring(0, 60)}...`)
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Referer': 'https://www.google.com/',
          'Accept': 'image/*,*/*;q=0.8'
        },
        timeout: 15000,
        redirect: 'follow'
      })

      if (!res.ok) {
        lastError = `HTTP ${res.status}`
        if (i < maxRetries - 1) await new Promise(r => setTimeout(r, 500))
        continue
      }

      const buffer = Buffer.from(await res.arrayBuffer())
      if (!buffer.length) {
        lastError = 'Buffer vacío'
        if (i < maxRetries - 1) await new Promise(r => setTimeout(r, 500))
        continue
      }

      return buffer
    } catch (e) {
      lastError = e.message
      if (i < maxRetries - 1) await new Promise(r => setTimeout(r, 500))
    }
  }

  throw new Error(`Descarga falló: ${lastError}`)
}

async function normalizeImage(buffer) {
  try {
    return await sharp(buffer, { failOnError: false })
      .rotate()
      .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()
  } catch (e) {
    console.log(`[IMAGEN] Normalización fallida, devolviendo original`)
    return buffer
  }
}

export default {
  command: ['imagen', 'image', 'img'],
  category: 'search',
  run: async ({ client, m, args, text }) => {
    const input = (String(text || '').trim() || args.join(' ').trim())
    const chatId = m.chat

    if (!input) {
      return m.reply(
        `🖼️ *Lucoa Imágenes*\n\n` +
        `#img anime\n` +
        `#img gatos\n` +
        `#img paisajes\n\n` +
        `📌 Prueba múltiples fuentes automáticamente`
      )
    }

    await m.react('🔍')

    try {
      // Buscar en múltiples APIs en paralelo
      const [bingResults, unsplashResults] = await Promise.allSettled([
        searchImages(input, 'bing'),
        searchImages(input, 'unsplash')
      ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []))

      const allResults = [...bingResults, ...unsplashResults].filter(Boolean)

      if (!allResults.length) {
        await m.react('❌')
        return m.reply(`🖼️ No encontré imágenes para "${input}". Intenta otro término.`)
      }

      // Guardar en caché
      global.__lucoaImagenCache[chatId] = { query: input, urls: allResults, idx: 0 }

      // Descargar la primera
      const firstUrl = allResults[0]
      const imageBuffer = await downloadImage(firstUrl)
      const normalized = await normalizeImage(imageBuffer)

      const caption = 
        `╭━━━〔 🖼️ 𝗜𝗠𝗔𝗚𝗘𝗡 〕━━━⬣\n` +
        `🔎 *Búsqueda:* ${input}\n` +
        `📊 *Encontradas:* ${allResults.length}\n` +
        `╰━━━━━━━━━━━━━━━━━━━⬣\n` +
        `👉 Responde con *#img 2* para la siguiente.`

      await client.sendMessage(chatId, { image: normalized, caption }, { quoted: m })
      await m.react('✅')

    } catch (e) {
      console.error(`[IMAGEN] Error:`, e)
      await m.react('❌')
      m.reply(`🖼️ *Error:* ${e.message}`)
    }
  }
}
