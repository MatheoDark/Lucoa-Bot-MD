import { resolveLidToRealJid } from '../../lib/utils.js'

export default {
  command: ['daily', 'diario'],
  category: 'rpg',
  run: async ({ client, m }) => {
    
    // 1. Validaciones de Grupo
    if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos.')

    const chatData = global.db.data.chats[m.chat] || {}
    if (chatData.adminonly || !chatData.rpg) {
      return m.reply(`✎ Los comandos de economía están desactivados en este grupo.`)
    }

    // 2. Configuración del Bot
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const monedas = settings.currency || 'monedas'

    // 3. Resolución de Usuario (CRÍTICO)
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    let user = global.db.data.users[userId]

    // Inicializamos si no existe
    if (!user) {
        global.db.data.users[userId] = { coins: 0, dailyStreak: 0, lastDaily: 0 }
        user = global.db.data.users[userId]
    }

    // Inicializar valores específicos si faltan
    user.dailyStreak = user.dailyStreak || 0
    user.lastDaily = user.lastDaily || 0
    user.coins = user.coins || 0

    // 4. Calcular Tiempos
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000 // 24 Horas
    const twoDays = oneDay * 2         // 48 Horas
    const timeSinceLast = now - user.lastDaily

    // CASO 1: Aún no pasan 24 horas (Cooldown activo)
    if (timeSinceLast < oneDay) {
      const restante = formatRemainingTime(oneDay - timeSinceLast)
      return m.reply(
        `⏱️ Ya reclamaste tu *Daily* de hoy.\n` +
        `> Vuelve en: *${restante}* para no perder tu racha.`
      ) 
    }

    // CASO 2: Pasaron más de 48 horas (Perdió la racha)
    if (timeSinceLast > twoDays && user.lastDaily !== 0) {
      const rachaAnterior = user.dailyStreak
      user.dailyStreak = 1
      user.lastDaily = now
      
      const recompensa = calcularRecompensa(1)
      const siguiente = calcularRecompensa(2)
      user.coins += recompensa

      return m.reply(
        `💔 *¡RACHA PERDIDA!*\nPasaron más de 48 horas y perdiste tu racha de ${rachaAnterior} días.\n\n` +
        `「✿」Recompensa (Día 1): *¥${recompensa.toLocaleString()} ${monedas}*\n` +
        `> Mañana (Día 2): *¥${siguiente.toLocaleString()}*`
      )
    }

    // CASO 3: Reclamo Normal (Mantiene o aumenta racha)
    user.dailyStreak += 1
    user.lastDaily = now
    
    const recompensa = calcularRecompensa(user.dailyStreak)
    const siguiente = calcularRecompensa(user.dailyStreak + 1)
    user.coins += recompensa

    const mensajeRacha = user.dailyStreak >= 5 
      ? `\n🔥 ¡Increíble! Racha de *${user.dailyStreak}* días.` 
      : ''

    await m.reply(
      `📅 *RECOMPENSA DIARIA*\n` +
      `「✿」Ganaste: *¥${recompensa.toLocaleString()} ${monedas}* (Día *${user.dailyStreak}*)\n` +
      `> Mañana (Día ${user.dailyStreak + 1}): *¥${siguiente.toLocaleString()}*${mensajeRacha}`
    )
  },
};

// Función de recompensa escalable
function calcularRecompensa(dia) {
  const base = 15000
  const incremento = 8000
  const maximo = 200000 // Tope de 200k diarios
  const recompensa = base + (dia - 1) * incremento
  return Math.min(recompensa, maximo)
}

// Formato de tiempo limpio
function formatRemainingTime(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const seg = s % 60
  
  const partes = []
  if (h > 0) partes.push(`${h}h`)
  if (m > 0) partes.push(`${m}m`)
  if (seg > 0 || partes.length === 0) partes.push(`${seg}s`)
  
  return partes.join(' ')
}
