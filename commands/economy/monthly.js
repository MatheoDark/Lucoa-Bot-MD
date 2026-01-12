import { resolveLidToRealJid } from '../../lib/utils.js'

export default {
  command: ['monthly', 'mensual'],
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

    // 3. Resolución de Usuario (ID Real)
    const userId = await resolveLidToRealJid(m.sender, client, m.chat)
    let user = global.db.data.users[userId]

    // Inicializamos si no existe
    if (!user) {
        global.db.data.users[userId] = { coins: 0, exp: 0, lastMonthly: 0 }
        user = global.db.data.users[userId]
    }

    // 4. Cooldown (30 Días)
    const monthlyCooldown = 30 * 24 * 60 * 60 * 1000 // 30 días en milisegundos
    const lastMonthly = user.lastMonthly || 0
    const tiempoRestante = lastMonthly + monthlyCooldown - Date.now()

    if (tiempoRestante > 0) {
      return m.reply(`✎ Ya reclamaste tu recompensa de este mes.\nVuelve en: *${msToTime(tiempoRestante)}*`)
    }

    // 5. Recompensa (Mejorada para valer la pena)
    // Entre 50k y 100k monedas
    const coins = Math.floor(Math.random() * (100000 - 50000 + 1)) + 50000
    // Entre 10k y 20k de experiencia
    const exp = Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000

    // 6. Guardar Datos
    user.lastMonthly = Date.now()
    user.exp = (user.exp || 0) + exp
    user.coins = (user.coins || 0) + coins

    // 7. Mensaje
    const info = `📅 *RECOMPENSA MENSUAL* 📅
    
> 👑 *¡Has reclamado tu premio del mes!*

⚡ *Experiencia:* +${exp.toLocaleString()} XP
💰 *Dinero:* +${coins.toLocaleString()} ${monedas}

_¡No olvides volver el próximo mes!_`

    await client.sendMessage(m.chat, { 
        text: info,
        mentions: [userId]
    }, { quoted: m })
  },
};

// Función de tiempo formateada
function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24),
      days = Math.floor(duration / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m`
}
