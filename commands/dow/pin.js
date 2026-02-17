import fetch from 'node-fetch'
import { pinterest } from 'ruhend-scraper' // Usamos tu librería instalada para descargar links

// 🐲 LUCOA • Pinterest (Anabot Search + Ruhend DL)
// Versión optimizada para VPS: Evita bloqueos de IP usando librerías y APIs externas.

// Cache global para paginación (#pin 2)
global.__lucoaPinCache = global.__lucoaPinCache || Object.create(null)

// Detección de Links
const isPinterestUrl = (s = '') => /(https?:\/\/)?(www\.)?pinterest\.(com|cl|es)\/.+/i.test(s) || /pin\.it\//i.test(s)

// ===== 1. MOTOR DE BÚSQUEDA (API EXTERNA) =====
async function searchPinterest(query) {
  // Usamos Anabot como pediste, que devuelve metadatos ricos
  const apiUrl = `https://anabot.my.id/api/search/pinterest?query=${encodeURIComponent(query)}&apikey=freeApikey`
  
  const res = await fetch(apiUrl)
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  
  const json = await res.json()
  if (!json.success || !json.data?.result?.length) {
    throw new Error('No encontré resultados en Pinterest.')
  }

  // Limpiamos y estandarizamos la respuesta
  return json.data.result.map(pin => ({
    url: pin.images?.['736x']?.url || pin.images?.['orig']?.url || pin.images?.['236x']?.url,
    desc: pin.description || 'Sin descripción',
    author: pin.native_creator?.full_name || 'Desconocido',
    saves: pin.aggregated_pin_data?.aggregated_stats?.saves || 0,
    created: pin.created_at || '',
    isVideo: false // La búsqueda de imágenes suele ser estática
  })).filter(item => item.url)
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
          await client.sendMessage(chatId, { video: { url: result.url }, caption }, { quoted: m })
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
