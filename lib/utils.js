const groupMetadataCache = new Map()
const lidCache = new Map()
const metadataTTL = 5000 // 5 segundos de frescura máxima
const MAX_CACHE_SIZE = 2000 // Límite máximo de entradas en cache para evitar memory leaks

// Función para limpiar entradas antiguas del cache
function limitCacheSize(cache, maxSize) {
  if (cache.size > maxSize) {
    const keysToDelete = Array.from(cache.keys()).slice(0, cache.size - maxSize)
    for (const key of keysToDelete) {
      cache.delete(key)
    }
  }
}

function getCachedMetadata(groupChatId) {
  const cached = groupMetadataCache.get(groupChatId)
  if (!cached || Date.now() - cached.timestamp > metadataTTL) return null
  return cached.metadata
}

function normalizeToJid(phone) {
  if (!phone) return null
  const base = typeof phone === 'number' ? phone.toString() : phone.replace(/\D/g, '')
  return base ? `${base}@s.whatsapp.net` : null
}

export async function resolveLidToRealJid(lid, client, groupChatId) {
  const input = lid?.toString().trim()
  if (!input || !groupChatId?.endsWith('@g.us')) return input

  if (input.endsWith('@s.whatsapp.net')) return input

  if (lidCache.has(input)) return lidCache.get(input)

  const lidBase = input.split('@')[0]
  let metadata = getCachedMetadata(groupChatId)

  if (!metadata) {
    try {
      metadata = await client.groupMetadata(groupChatId)
      groupMetadataCache.set(groupChatId, { metadata, timestamp: Date.now() })
      limitCacheSize(groupMetadataCache, MAX_CACHE_SIZE)
    } catch {
      lidCache.set(input, input)
      limitCacheSize(lidCache, MAX_CACHE_SIZE)
      return input
    }
  }

  for (const p of metadata.participants || []) {
    const idBase = p?.id?.split('@')[0]?.trim()
    const phoneRaw = p?.phoneNumber
    const phone = normalizeToJid(phoneRaw)
    if (!idBase || !phone) continue
    if (idBase === lidBase) {
      lidCache.set(input, phone)
      limitCacheSize(lidCache, MAX_CACHE_SIZE)
      return phone
    }
  }

  lidCache.set(input, input)
  limitCacheSize(lidCache, MAX_CACHE_SIZE)
  return input
}