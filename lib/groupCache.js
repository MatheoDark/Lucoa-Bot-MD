/**
 * 🔧 Cache centralizado de groupMetadata
 * Evita llamadas API repetidas a WhatsApp que saturan el stream
 * y causan desconexiones 408/515.
 * 
 * TTL: 2 minutos (suficiente para evitar ráfagas, fresco para cambios)
 */

const cache = new Map()
const CACHE_TTL = 120_000 // 2 minutos

/**
 * Obtiene metadata de grupo con cache.
 * Si el dato está en cache y no expiró, lo devuelve sin llamar a la API.
 * @param {object} client - Socket de Baileys
 * @param {string} groupId - JID del grupo
 * @returns {Promise<object|null>} metadata del grupo o null si falla
 */
export async function getCachedGroupMetadata(client, groupId) {
  if (!groupId?.endsWith('@g.us')) return null

  const cached = cache.get(groupId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data
  }

  try {
    const metadata = await client.groupMetadata(groupId)
    cache.set(groupId, { data: metadata, ts: Date.now() })
    return metadata
  } catch {
    return cached?.data || null
  }
}

/**
 * Invalida el cache de un grupo específico (usar en group updates)
 */
export function invalidateGroupCache(groupId) {
  cache.delete(groupId)
}

/**
 * Limpia todo el cache
 */
export function clearGroupCache() {
  cache.clear()
}

// Limpieza periódica de entradas expiradas (cada 5 min)
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of cache) {
    if (now - val.ts > CACHE_TTL * 2) cache.delete(key)
  }
}, 300_000)
