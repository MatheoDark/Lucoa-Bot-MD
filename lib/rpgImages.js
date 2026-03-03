/**
 * ═══════════════════════════════════════════════════════════════════════
 *  🖼️ RPG Images — Obtiene imágenes anime para el sistema RPG
 *  Usa waifu.pics API + nekos.life como fuentes confiables.
 *  Cache en memoria para evitar spam a la API.
 * ═══════════════════════════════════════════════════════════════════════
 */

// Cache para evitar requests repetitivos (TTL: 5 minutos)
const imageCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

/**
 * Obtiene una imagen anime aleatoria de waifu.pics
 * @param {string} category - Categoría: 'waifu', 'neko', 'shinobu', 'megumin', 'awoo', 'pat', 'smug', 'bonk', 'kick', 'happy', 'wink', 'cry', 'kill', 'smile', 'dance', 'cringe', 'bite', 'slap'
 * @returns {Promise<string>} URL de la imagen
 */
async function fetchWaifuPic(category = 'waifu') {
  try {
    const res = await fetch(`https://api.waifu.pics/sfw/${category}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.url || null
  } catch {
    return null
  }
}

/**
 * Obtiene una imagen de nekos.life (fallback)
 * @param {string} category - 'wallpaper', 'neko', 'waifu', 'pat', 'hug', 'smug'
 * @returns {Promise<string>}
 */
async function fetchNekosLife(category = 'wallpaper') {
  try {
    const res = await fetch(`https://nekos.life/api/v2/img/${category}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.url || null
  } catch {
    return null
  }
}

/**
 * Obtiene una imagen RPG con cache y fallback
 * @param {string} type - Tipo de imagen: 'monster', 'victory', 'defeat', 'duel', 'duel_result', 'skill', 'mission', 'mission_complete', 'mega_reward'
 * @param {string} [seed] - Seed opcional para cache (ej: nombre del monstruo)
 * @returns {Promise<string>} URL de la imagen
 */
export async function getRPGImage(type, seed = '') {
  // Revisar cache
  const cacheKey = `${type}:${seed}`
  const cached = imageCache.get(cacheKey)
  if (cached && (Date.now() - cached.time) < CACHE_TTL) {
    return cached.url
  }

  // Mapeo de tipo RPG a categoría de API
  const categoryMap = {
    monster:          ['waifu', 'neko'],
    victory:          ['happy', 'smile', 'dance', 'smug', 'wink'],
    defeat:           ['cry', 'cringe'],
    duel:             ['kick', 'waifu'],
    duel_result:      ['happy', 'smile', 'smug'],
    skill:            ['waifu', 'neko'],
    skill_upgrade:    ['happy', 'wink', 'smile'],
    mission:          ['waifu', 'neko'],
    mission_complete: ['happy', 'smile', 'dance'],
    mega_reward:      ['happy', 'dance', 'smile'],
  }

  const categories = categoryMap[type] || ['waifu']
  const category = categories[Math.floor(Math.random() * categories.length)]

  // Intentar waifu.pics primero, luego nekos.life como fallback
  let url = await fetchWaifuPic(category)
  if (!url) {
    const nekosCategory = ['waifu', 'neko'].includes(category) ? category : 'wallpaper'
    url = await fetchNekosLife(nekosCategory)
  }

  // Fallback absoluto: robohash (siempre funciona, genera imagen única)
  if (!url) {
    const text = seed || type || 'rpg'
    url = `https://robohash.org/${encodeURIComponent(text)}?set=set2&size=512x512&bgset=bg1`
  }

  // Guardar en cache
  imageCache.set(cacheKey, { url, time: Date.now() })

  // Limpiar cache viejo
  if (imageCache.size > 100) {
    const now = Date.now()
    for (const [k, v] of imageCache) {
      if (now - v.time > CACHE_TTL) imageCache.delete(k)
    }
  }

  return url
}

/**
 * Pre-carga una imagen para tenerla lista en cache
 */
export async function preloadRPGImage(type, seed = '') {
  return getRPGImage(type, seed)
}
