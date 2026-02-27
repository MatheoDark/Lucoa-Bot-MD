import fetch from 'node-fetch'
import ruhend from 'ruhend-scraper' // 👈 CAMBIO AQUÍ: Importamos todo el paquete
const { pinterest } = ruhend        // 👈 Y aquí extraemos la función

// 🐲 LUCOA • Pinterest (Anabot Search + Ruhend DL)
// Versión optimizada para VPS: Evita bloqueos de IP usando librerías y APIs externas.

// Cache global para paginación (#pin 2)
global.__lucoaPinCache = global.__lucoaPinCache || Object.create(null)

// Detección de Links
const isPinterestUrl = (s = '') => /(https?:\/\/)?(www\.)?pinterest\.(com|cl|es)\/.+/i.test(s) || /pin\.it\//i.test(s)

// ===== 1. MOTOR DE BÚSQUEDA (API EXTERNA) =====
async function searchPinterest(query) {
  // Intentamos múltiples APIs por si una falla o cambia el formato
  const apis = [
    `https://anabot.my.id/api/search/pinterest?query=${encodeURIComponent(query)}&apikey=freeApikey`,
    `https://api.lolhuman.xyz/api/pinterest?apikey=GataDios&query=${encodeURIComponent(query)}`,
  ]

  let lastError = null

  for (const apiUrl of apis) {
    try {
      const res = await fetch(apiUrl, { timeout: 10000 })
      if (!res.ok) continue

      const json = await res.json()

      // Extraer array de resultados (la estructura varía según la API)
      let rawResults = null
      if (Array.isArray(json?.data?.result)) rawResults = json.data.result
      else if (Array.isArray(json?.data)) rawResults = json.data
      else if (Array.isArray(json?.result)) rawResults = json.result
      else if (Array.isArray(json)) rawResults = json

      // Si la respuesta es un array de strings (URLs directas)
      if (rawResults?.length && typeof rawResults[0] === 'string') {
        return rawResults.filter(u => u.startsWith('http')).map(url => ({
          url, desc: 'Pinterest', author: 'Desconocido', saves: 0, created: '', isVideo: false
        }))
      }

      // Si la respuesta es un array de objetos
      if (rawResults?.length && typeof rawResults[0] === 'object') {
        const mapped = rawResults.map(pin => ({
          url: pin.images?.['736x']?.url || pin.images?.['orig']?.url || pin.images?.['236x']?.url || pin.image || pin.url || pin.media || pin.link || '',
          desc: pin.description || pin.title || pin.desc || 'Sin descripción',
          author: pin.native_creator?.full_name || pin.author || pin.creator || 'Desconocido',
          saves: pin.aggregated_pin_data?.aggregated_stats?.saves || pin.saves || 0,
          created: pin.created_at || '',
          isVideo: false
        })).filter(item => item.url && item.url.startsWith('http'))

        if (mapped.length) return mapped
      }
    } catch (e) {
      lastError = e
    }
  }

  throw new Error(lastError?.message || 'No encontré resultados en Pinterest.')
}

// ===== 2. MOTOR DE DESCARGA (LIBRERÍA LOCAL) =====
async function downloadPinterestLink(url) {
  // Ruhend Scraper maneja la lógica compleja de extracción (videos/gifs/img)
  const data = await pinterest(url)
  
  // Ruhend a veces devuelve url de video o imagen, detectamos cual es
  if (!data) throw new Error('El enlace no devolvió datos válidos.')
  
  return {
    url: data.video || data.image || data.url, // Prioridad al video si existe
    desc: data.title || 'Pinterest Media',
    isVideo: !!data.video // Si hay campo video, es true
  }
}

// ===== COMANDO PRINCIPAL =====
export default {
  command: ['pin', 'pinterest'],
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
