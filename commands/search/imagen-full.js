import fetch from 'node-fetch'
import sharp from 'sharp'
import { URL } from 'url'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

// Proveedores de imágenes con acceso directo
const PROVIDERS = [
  {
    name: '🌐 Unsplash',
    search: (q) => `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&count=12&client_id=oW-dH-Ydr-jN3qUJpP9H-sKLV0U1UWdVMrSJzjSwmQo`,
    extract: (data) => {
      try {
        const json = typeof data === 'string' ? JSON.parse(data) : data
        return json.results?.map(r => ({
          url: r.urls.regular,
          author: r.user?.name || 'Unknown',
          desc: r.description || r.alt_description || 'Unsplash Photo'
        })) || []
      } catch { return [] }
    }
  },

  {
    name: '📸 Pexels',
    search: (q) => `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=12`,
    headers: { 'Authorization': 'PZ11UKc14JrMVDJLVYUF9VVJZKvn6agDC5aNHvMY2ywVkZUqVx8O9xQ5' },
    extract: (data) => {
      try {
        const json = typeof data === 'string' ? JSON.parse(data) : data
        return json.photos?.map(p => ({
          url: p.src.large,
          author: p.photographer,
          desc: p.alt || 'Pexels Photo'
        })) || []
      } catch { return [] }
    }
  },

  {
    name: '🎨 Pixabay',
    search: (q) => `https://pixabay.com/api/?key=44062267-4e6dc48e8fb7b3f0f9e35&q=${encodeURIComponent(q)}&per_page=12&image_type=photo&safesearch=true`,
    extract: (data) => {
      try {
        const json = typeof data === 'string' ? JSON.parse(data) : data
        return json.hits?.map(h => ({
          url: h.largeImageURL,
          author: h.user,
          desc: `${h.views} vistas • ${h.likes} likes`
        })) || []
      } catch { return [] }
    }
  }
]

// Cache global
global.__lucoaImagenFullCache = global.__lucoaImagenFullCache || {}

async function searchAllProviders(query) {
  console.log(`[IMG-FULL] Buscando: "${query}" en todos los proveedores...`)
  
  const results = await Promise.allSettled(
    PROVIDERS.map(async (provider) => {
      try {
        console.log(`[IMG-FULL] Consultando ${provider.name}...`)
        const url = provider.search(query)
        const headers = { 'User-Agent': UA, ...provider.headers }
        const res = await fetch(url, { headers, timeout: 10000 })
        
        if (!res.ok) {
          console.log(`[IMG-FULL] ⚠️ ${provider.name}: HTTP ${res.status}`)
          return []
        }

        const data = await res.text()
        const items = provider.extract(data)
        console.log(`[IMG-FULL] ✅ ${provider.name}: ${items.length} resultados`)
        return items
      } catch (e) {
        console.log(`[IMG-FULL] ❌ ${provider.name}: ${e.message}`)
        return []
      }
    })
  )

  // Combinar y deduplicar
  const allItems = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value || [])

  const seen = new Set()
  return allItems.filter(item => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  }).slice(0, 30)
}

async function downloadImage(url, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Accept': 'image/*,*/*;q=0.8'
        },
        timeout: 12000,
        redirect: 'follow'
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const buffer = Buffer.from(await res.arrayBuffer())
      if (!buffer.length) throw new Error('Buffer vacío')

      return buffer
    } catch (e) {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 500))
      } else {
        throw e
      }
    }
  }
}

async function normalizeImage(buffer) {
  try {
    return await sharp(buffer, { failOnError: false })
      .rotate()
      .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
  } catch {
    return buffer
  }
}

export default {
  command: ['imagen2', 'img2', 'image2', 'buscarimg'],
  category: 'search',
  run: async ({ client, m, args, text }) => {
    const input = (String(text || '').trim() || args.join(' ').trim())
    const chatId = m.chat

    if (!input) {
      return m.reply(
        `🖼️ *Búsqueda de Imágenes (Independiente)*\n\n` +
        `#img2 anime\n` +
        `#img2 gatos bonitos\n` +
        `#img2 naturaleza\n\n` +
        `⚡ Sin dependencias externas de APIs`
      )
    }

    await m.react('🔍')

    try {
      const items = await searchAllProviders(input)

      if (!items.length) {
        await m.react('❌')
        return m.reply(`🖼️ Sin resultados para "${input}". Intenta otro término.`)
      }

      // Guardar cache
      global.__lucoaImagenFullCache[chatId] = { query: input, items, idx: 0 }

      // Enviar primera imagen
      const first = items[0]
      console.log(`[IMG-FULL] Descargando imagen ${first.url.substring(0, 60)}...`)
      const buffer = await downloadImage(first.url)
      const normalized = await normalizeImage(buffer)

      const caption =
        `╭━━━〔 🖼️ 𝗜𝗠𝗔𝗚𝗘𝗡𝗲𝘀 〕━━━⬣\n` +
        `🔎 *Búsqueda:* ${input}\n` +
        `📊 *Resultados:* ${items.length}\n` +
        `👤 *Por:* ${first.author || 'Unknown'}\n` +
        `💬 *Info:* ${first.desc}\n` +
        `╰━━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `👉 *#img2 2* para la siguiente imagen`

      await client.sendMessage(chatId, { image: normalized, caption }, { quoted: m })
      await m.react('✅')

    } catch (e) {
      console.error(`[IMG-FULL] Error:`, e)
      await m.react('❌')
      m.reply(`🖼️ *Error:*\n${e.message}\n\n💡 Intenta con otro término.`)
    }
  }
}
