import { resolveLidToRealJid } from '../../lib/utils.js'
import { getDropInfo } from '../../lib/drops.js'

export default {
  command: ['waittimes', 'cooldowns', 'economyinfo', 'einfo'],
  category: 'rpg',
  run: async ({client, m}) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
    const chatData = db.chats[chatId] || {}

    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`✎ Estos comandos están desactivados en este grupo.`)

    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    const user = db.users[userId]
    if (!user) return m.reply("⚠ Usuario no encontrado en la base de datos global.")

    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    const cooldowns = {
      crime: Math.max(0, (user.crimeCooldown || 0) - now),
      mine: Math.max(0, (user.mineCooldown || 0) - now),
      ritual: Math.max(0, (user.ritualCooldown || 0) - now),
      work: Math.max(0, (user.workCooldown || 0) - now),
      rt: Math.max(0, (user.rtCooldown || 0) - now),
      slut: Math.max(0, (user.lastProsti || 0) + (10 * 60 * 1000) - now),
      steal: Math.max(0, (user.roboCooldown || 0) - now),
      ppt: Math.max(0, (user.pptCooldown || 0) - now),
      fish: Math.max(0, (user.fishCooldown || 0) - now),
      explore: Math.max(0, (user.exploreCooldown || 0) - now),
      daily: Math.max(0, (user.lastDaily || 0) + oneDay - now),
      weekly: Math.max(0, (user.lastWeekly || 0) + 7 * oneDay - now),
      monthly: Math.max(0, (user.lastMonthly || 0) + 30 * oneDay - now)
    }

    const formatTime = (ms) => {
      if (ms <= 0) return '✅ *Listo*'
      const totalSeconds = Math.floor(ms / 1000)
      const days = Math.floor(totalSeconds / 86400)
      const hours = Math.floor((totalSeconds % 86400) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      const parts = []
      if (days > 0) parts.push(`${days}d`)
      if (hours > 0) parts.push(`${hours}h`)
      if (minutes > 0) parts.push(`${minutes}m`)
      if (seconds > 0) parts.push(`${seconds}s`)
      return `⏳ *${parts.join(' ')}*`
    }

    const coins = user.coins || 0
    const bank = user.bank || 0
    const health = user.health ?? 100
    const name = user.name || userId.split('@')[0]
    const currency = global.db.data.settings[botId]?.currency || 'Coins'

    // ═══ INFO DE DROPS ═══
    let dropSection = ''
    try {
      const dropInfo = getDropInfo(chatId)
      if (dropInfo) {
        if (dropInfo.dropActivo) {
          dropSection = `\n│\n│  🎁 *— DROPS —*\n│  🔴 *¡HAY UN DROP ACTIVO AHORA!*\n│  > Escribe *#drop* para reclamarlo`
        } else if (dropInfo.esDia) {
          const pendientes = dropInfo.franjasPendientes
          if (pendientes.length > 0) {
            const franjasList = pendientes.map(f => `${f.emoji} ${f.label} (${f.horaInicio}:00-${f.horaFin}:00)`).join('\n│  ')
            dropSection = `\n│\n│  🎁 *— DROPS —*\n│  🟢 *¡Hoy es día de drops!*\n│  Pendientes:\n│  ${franjasList}`
          } else {
            dropSection = `\n│\n│  🎁 *— DROPS —*\n│  ✅ *Todos los drops de hoy enviados*\n│  Próximo ciclo en *3 días*`
          }
        } else {
          dropSection = `\n│\n│  🎁 *— DROPS —*\n│  ⏳ Próximo día de drops: *${formatTime(dropInfo.proximoCiclo).replace('⏳ ', '').replace(/\*/g, '')}*`
        }
      }
    } catch {}

    const mensaje = `╭─── ⋆🐉⋆ ───
│  🐲 *Cooldowns de ${name}*
├───────────────
│
│  ⚔️ *— ACCIONES —*
│  ⴵ Work » ${formatTime(cooldowns.work)}
│  ⴵ Crime » ${formatTime(cooldowns.crime)}
│  ⴵ Steal » ${formatTime(cooldowns.steal)}
│  ⴵ Mine » ${formatTime(cooldowns.mine)}
│  ⴵ Fish » ${formatTime(cooldowns.fish)}
│  ⴵ Explorar » ${formatTime(cooldowns.explore)}
│  ⴵ Slut » ${formatTime(cooldowns.slut)}
│
│  🎰 *— JUEGOS —*
│  ⴵ Ruleta » ${formatTime(cooldowns.rt)}
│  ⴵ Ppt » ${formatTime(cooldowns.ppt)}
│  ⴵ Ritual » ${formatTime(cooldowns.ritual)}
│
│  📅 *— RECOMPENSAS —*
│  ⴵ Daily » ${formatTime(cooldowns.daily)}
│  ⴵ Weekly » ${formatTime(cooldowns.weekly)}
│  ⴵ Monthly » ${formatTime(cooldowns.monthly)}
│${dropSection}
│
│  💼 *— ESTADO —*
│  ⛁ Coins » *¥${coins.toLocaleString()} ${currency}*
│  🏦 Banco » *¥${bank.toLocaleString()} ${currency}*
│  💔 Salud » *${health} HP*
╰─── ⋆🐲⋆ ───
> 🐉 *Lucoa Bot* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`

    await client.sendMessage(chatId, {
      text: mensaje
    }, { quoted: m })
  }
};
