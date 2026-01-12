// ==========================================
// VARIABLES DE CACHÉ
// ==========================================
const groupMetadataCache = new Map()
const lidCache = new Map()
const metadataTTL = 5000 // 5 segundos de frescura máxima

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

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

// ==========================================
// FUNCIÓN PRINCIPAL (Corregida y Segura)
// ==========================================

export async function resolveLidToRealJid(lid, client, groupChatId) {
  // Convertimos a string y limpiamos espacios por seguridad
  const input = lid?.toString().trim()

  // 1. Si no hay input o no es un grupo, devolvemos el input original
  if (!input || !groupChatId?.endsWith('@g.us')) return input

  // 2. Si ya es un número normal (@s.whatsapp.net), lo devolvemos
  if (input.endsWith('@s.whatsapp.net')) return input

  // 3. Revisamos caché
  if (lidCache.has(input)) return lidCache.get(input)

  const lidBase = input.split('@')[0]
  let metadata = getCachedMetadata(groupChatId)

  // 4. Si no hay metadatos en caché, los pedimos a WhatsApp
  if (!metadata) {
    try {
      metadata = await client.groupMetadata(groupChatId)
      groupMetadataCache.set(groupChatId, { metadata, timestamp: Date.now() })
    } catch (e) {
      // Si falla, guardamos el input tal cual para no bloquear y retornamos
      lidCache.set(input, input)
      return input 
    }
  }

  // 5. Buscamos en los participantes
  for (const p of metadata.participants || []) {
    const idBase = p?.id?.split('@')[0]?.trim()
    const phoneRaw = p?.phoneNumber // A veces esto viene undefined
    const phone = normalizeToJid(phoneRaw) // Usamos la función auxiliar

    if (!idBase || !phone) continue

    // Si encontramos coincidencia
    if (idBase === lidBase) {
      lidCache.set(input, phone)
      return phone // ¡IMPORTANTE! Retorno explícito del string
    }
  }

  // 6. Si no se encontró nada, guardamos y devolvemos el input original
  lidCache.set(input, input)
  return input
}
