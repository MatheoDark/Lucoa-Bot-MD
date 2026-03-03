/**
 * ═══════════════════════════════════════════════════════════════════════
 *  🖼️ RPG Images — Obtiene imágenes anime para el sistema RPG
 *  Usa SafeBooru → Danbooru → Pinterest (vía DuckDuckGo) como fuentes.
 *  Cada monstruo tiene tags específicos para buscar imágenes acorde.
 *  Cache en memoria para evitar spam a las APIs.
 * ═══════════════════════════════════════════════════════════════════════
 */

// Cache para evitar requests repetitivos (TTL: 10 minutos)
const imageCache = new Map()
const CACHE_TTL = 10 * 60 * 1000

// ═══════════════════════════════════════════════════════════════════════
//  TAGS DE BÚSQUEDA — Mapeo de nombre de monstruo/contexto → tags booru
// ═══════════════════════════════════════════════════════════════════════

const MONSTER_TAGS = {
  // ── Fácil ──
  'Slime Verde':        ['slime_(monster)', 'slime+monster+green', 'slime+fantasy'],
  'Goblin Ladrón':      ['goblin', 'goblin+knife', 'goblin+thief'],
  'Esqueleto Errante':  ['skeleton+sword', 'skeleton+warrior', 'undead+skeleton'],
  'Lobo Sombra':        ['wolf+glowing_eyes', 'wolf+dark+fantasy', 'fenrir'],
  'Araña Venenosa':     ['spider+monster', 'giant_spider', 'arachne'],

  // ── Medio ──
  'Minotauro':          ['minotaur', 'minotaur+axe', 'minotaur+labyrinth'],
  'Liche Oscuro':       ['lich', 'necromancer+undead', 'dark_mage+skeleton'],
  'Gárgola de Piedra':  ['gargoyle', 'golem+stone', 'gargoyle+wings'],
  'Hidra Menor':        ['hydra', 'hydra+monster', 'multi-headed_serpent'],
  'Caballero Fantasma': ['ghost+knight', 'spectral_knight', 'ghost+armor+sword'],

  // ── Difícil ──
  'Dragón Rojo':        ['dragon+fire', 'red_dragon', 'dragon+breathing_fire'],
  'Demonio Ancestral':  ['demon+horns+fire', 'demon_lord', 'demon+dark+fantasy'],
  'Titán de Hielo':     ['ice+giant', 'frost_giant', 'ice+golem+fantasy'],
  'Fénix Corrupto':     ['phoenix+dark', 'phoenix+fire', 'dark_phoenix'],
  'Kraken Abismal':     ['kraken', 'kraken+tentacles', 'sea_monster+tentacles'],

  // ── Legendario ──
  'Rey Demonio Azgaroth': ['demon_king', 'demon_lord+throne', 'demon+king+dark'],
  'Dragón Celestial Lunaris': ['dragon+moon', 'celestial_dragon', 'dragon+night_sky+stars'],
  'Leviatán del Vacío': ['leviathan', 'cosmic_horror', 'eldritch+void+monster'],
}

// Tags para contextos que no son monstruos
const CONTEXT_TAGS = {
  // ── Victoria / Derrota ──
  victory:          ['victory', 'trophy', 'fist_pump', 'celebration', 'treasure_chest'],
  defeat:           ['injury', 'crying', 'broken_sword', 'blood+sword'],

  // ── Duelo PvP ──
  duel:             ['sword_clash', 'fighting_stance', 'confrontation', 'duel', 'sword_fight'],
  duel_result:      ['victory', 'fist_pump', 'battle'],

  // ── Skills / Habilidades ──
  skill:            ['magic_circle', 'runes', 'aura', 'spell'],
  skill_upgrade:    ['level_up', 'aura', 'magic_circle', 'energy'],

  // ── Misiones ──
  mission:          ['scroll', 'quest', 'map_(object)', 'compass'],
  mission_complete: ['treasure_chest', 'celebration', 'coin', 'trophy'],
  mega_reward:      ['treasure_chest', 'treasure', 'gold', 'sparkle'],

  // ── Trabajo / Economía ──
  work:             ['blacksmith', 'forge', 'hammer', 'crafting'],
  mine:             ['mining', 'pickaxe', 'cave', 'crystal'],
  fish:             ['fishing', 'fishing_rod', 'lake', 'fish'],
  explore:          ['forest', 'dungeon', 'adventure', 'ruins'],

  // ── Crimen / Robo ──
  crime:            ['thief', 'night', 'rogue', 'mask'],
  steal:            ['thief', 'stealing', 'ninja', 'shadow'],

  // ── Clases RPG ──
  class_guerrero:   ['knight', 'warrior', 'sword+armor', 'paladin'],
  class_mago:       ['witch', 'wizard', 'magic+staff', 'sorcerer'],
  class_explorador: ['explorer', 'compass+map_(object)', 'forest+adventure'],
  class_mercader:   ['merchant', 'coin+shop', 'market', 'trading'],
  class_asesino:    ['assassin', 'dagger', 'ninja', 'shadow+rogue'],
  class_apostador:  ['dice', 'cards', 'coin_flip', 'gambling'],
  class_select:     ['knight+witch', 'warrior', 'fantasy+group'],

  // ── Prestigio ──
  prestige:         ['aura', 'halo', 'awakening', 'rebirth'],

  // ── Ritual ──
  ritual:           ['magic_circle', 'ritual', 'summoning', 'dark_magic'],

  // ── Casino / Apuestas ──
  slots:            ['slot_machine', 'casino', 'coin', 'dice'],
  roulette:         ['roulette', 'casino', 'dice', 'coin'],
  coinflip:         ['coin', 'coin_flip', 'toss', 'flip'],
  lottery:          ['ticket', 'lottery', 'prize', 'jackpot'],
  jackpot:          ['treasure_chest', 'gold', 'celebration', 'sparkle'],

  // ── Daily / Recompensas ──
  daily:            ['gift', 'present', 'box', 'treasure_chest'],
}

// ═══════════════════════════════════════════════════════════════════════
//  FUENTES DE IMÁGENES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Busca imagen en SafeBooru por tags
 */
async function fetchSafeBooru(tags) {
  try {
    const tag = encodeURIComponent(tags)
    const res = await fetch(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=30`)
    if (!res.ok) return null
    const data = await res.json()
    const posts = Array.isArray(data) ? data : (data?.post || [])
    const valid = posts.filter(p => (p.file_url || p.image) && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url || p.image))
    if (!valid.length) return null
    const post = valid[Math.floor(Math.random() * valid.length)]
    const url = post.file_url || `https://safebooru.org/images/${post.directory}/${post.image}`
    return url.startsWith('http') ? url : `https://safebooru.org${url}`
  } catch {
    return null
  }
}

/**
 * Busca imagen en Danbooru por tags
 */
async function fetchDanbooru(tags) {
  try {
    const tag = encodeURIComponent(tags)
    const res = await fetch(`https://danbooru.donmai.us/posts.json?tags=${tag}+rating:general&limit=30`)
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data)) return null
    const valid = data.filter(p => (p.file_url || p.large_file_url) && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url || p.large_file_url || ''))
    if (!valid.length) return null
    const post = valid[Math.floor(Math.random() * valid.length)]
    return post.file_url || post.large_file_url
  } catch {
    return null
  }
}

/**
 * Busca imagen en Gelbooru por tags
 */
async function fetchGelbooru(tags) {
  try {
    const tag = encodeURIComponent(tags)
    const res = await fetch(`https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}+rating:general&limit=30`)
    if (!res.ok) return null
    const data = await res.json()
    const posts = data?.post || []
    const valid = posts.filter(p => p.file_url && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url))
    if (!valid.length) return null
    return valid[Math.floor(Math.random() * valid.length)].file_url
  } catch {
    return null
  }
}

/**
 * Busca imagen en Pinterest vía DuckDuckGo (último fallback)
 */
async function fetchPinterest(query) {
  try {
    const searchQuery = `site:pinterest.com ${query} anime fantasy`
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }

    // Obtener token VQD
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images`, { headers })
    if (!tokenRes.ok) return null
    const tokenHtml = await tokenRes.text()
    const vqdMatch = tokenHtml.match(/vqd=['"]([^'"]+)['"]/)
    if (!vqdMatch) return null

    // Buscar imágenes
    const imgRes = await fetch(`https://duckduckgo.com/i.js?q=${encodeURIComponent(searchQuery)}&o=json&p=1&s=0&u=bing&f=,,,,,&l=wt-wt&vqd=${vqdMatch[1]}`, { headers })
    if (!imgRes.ok) return null
    const imgData = await imgRes.json()

    const results = (imgData.results || []).filter(r => r.image && /\.(jpg|jpeg|png|webp)/i.test(r.image))
    if (!results.length) return null
    return results[Math.floor(Math.random() * results.length)].image
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════

/**
 * Obtiene una imagen RPG acorde al monstruo o contexto.
 * Busca en SafeBooru → Danbooru → Gelbooru → Pinterest con tags específicos.
 * @param {string} type - 'monster', 'victory', 'defeat', 'duel', etc.
 * @param {string} [seed] - Nombre del monstruo o contexto específico
 * @returns {Promise<string>} URL de la imagen
 */
export async function getRPGImage(type, seed = '') {
  // Revisar cache
  const cacheKey = `${type}:${seed}`
  const cached = imageCache.get(cacheKey)
  if (cached && (Date.now() - cached.time) < CACHE_TTL) {
    return cached.url
  }

  let url = null

  if (type === 'monster' && seed && MONSTER_TAGS[seed]) {
    // ── Buscar imagen específica del monstruo ──
    const tagOptions = MONSTER_TAGS[seed]

    for (const tags of tagOptions) {
      // Intentar SafeBooru primero
      url = await fetchSafeBooru(tags)
      if (url) break

      // Danbooru como fallback
      url = await fetchDanbooru(tags)
      if (url) break

      // Gelbooru como fallback
      url = await fetchGelbooru(tags)
      if (url) break
    }

    // Pinterest como último recurso para monstruos
    if (!url) {
      url = await fetchPinterest(seed + ' anime monster fantasy art')
    }

  } else {
    // ── Otros contextos (victoria, derrota, duelo, skills, misiones) ──
    const tagOptions = CONTEXT_TAGS[type] || ['fantasy+anime']

    for (const tags of tagOptions) {
      url = await fetchSafeBooru(tags)
      if (url) break
      url = await fetchDanbooru(tags)
      if (url) break
    }

    // Pinterest para contextos
    if (!url) {
      const pinterestQuery = seed || type.replace(/_/g, ' ')
      url = await fetchPinterest(pinterestQuery + ' anime rpg')
    }
  }

  // Fallback absoluto: waifu.pics (siempre funciona)
  if (!url) {
    try {
      const categories = ['waifu', 'neko']
      const cat = categories[Math.floor(Math.random() * categories.length)]
      const res = await fetch(`https://api.waifu.pics/sfw/${cat}`)
      if (res.ok) {
        const data = await res.json()
        url = data.url || null
      }
    } catch {}
  }

  // Fallback final: robohash
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
