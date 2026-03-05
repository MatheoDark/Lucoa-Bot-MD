import { resolveLidToRealJid } from '../../lib/utils.js'
import { getDropInfo } from '../../lib/drops.js'

// Tips aleatorios para hacer el comando más entretenido
const TIPS = [
  '💡 Usa *#work* seguido para activar rachas y ganar +72% extra!',
  '💡 El *#explore* legendario da hasta ¥300k y puede dropear personajes!',
  '💡 ¡Los peces Míticos tienen 40% de soltar un personaje gacha!',
  '💡 Completa las 3 misiones diarias para el *MEGA BONUS* de ¥60k!',
  '💡 En la arena *Legendaria* puedes ganar hasta ¥400k por pelea!',
  '💡 El *#crime* tiene 20% de robar un personaje de otro usuario!',
  '💡 ¡Mantén tu racha de daily! A racha 28 ganas ¥350k por día!',
  '💡 El *#math* ahora da monedas además de XP — ¡hasta ¥10k!',
  '💡 ¡El ahorcado (*#hangman*) da ¥15k + 4k XP por victoria!',
  '💡 Sube skills de *Aura Mística* para duplicar cualquier recompensa!',
  '💡 Usa *#lottery jugar 20* para comprar 20 boletos — ¡jackpot de ¥2M!',
  '💡 Pescar es lo más rápido: solo 3 min de cooldown!',
  '💡 Recuerda reclamar tu *#evento* y *#eventsemanal* cada día!',
  '💡 Los duelos (*#duel*) no tienen cooldown — ¡reta a todos!',
]

export default {
  command: ['waittimes', 'cooldowns', 'economyinfo', 'einfo', 'wt', 'cd'],
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
      work: Math.max(0, (user.workCooldown || 0) + (5 * 60 * 1000) - now),
      rt: Math.max(0, (user.rtCooldown || 0) - now),
      slut: Math.max(0, (user.lastProsti || 0) + (7 * 60 * 1000) - now),
      steal: Math.max(0, (user.roboCooldown || 0) - now),
      ppt: Math.max(0, (user.pptCooldown || 0) - now),
      fish: Math.max(0, (user.fishCooldown || 0) - now),
      explore: Math.max(0, (user.exploreCooldown || 0) - now),
      hangman: Math.max(0, (user.ahorcadoCooldown || 0) - now),
      arena: Math.max(0, (user.arenaCooldown || 0) - now),
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
    const level = user.level || 1
    const exp = user.exp || 0
    const dailyStreak = user.dailyStreak || 0
    const workStreak = user.workStreak || 0
    const totalFish = user.totalFish || 0
    const totalExplores = user.totalExplores || 0
    const arenaWins = user.arenaWins || 0
    const duelWins = user.duelWins || 0
    const prestige = user.prestige || 0
    const userClass = user.class || 'Sin clase'

    // Contar cuántos cooldowns están listos
    const readyCount = Object.values(cooldowns).filter(c => c <= 0).length
    const totalCount = Object.keys(cooldowns).length
    const readyBar = '█'.repeat(readyCount) + '░'.repeat(totalCount - readyCount)
    const readyPercent = Math.round((readyCount / totalCount) * 100)

    // Tip aleatorio
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)]

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
            dropSection = `\n│\n│  🎁 *— DROPS —*\n│  ✅ *Todos los drops de hoy enviados*\n│  Próximo ciclo en *2 días*`
          }
        } else {
          dropSection = `\n│\n│  🎁 *— DROPS —*\n│  ⏳ Próximo día de drops: *${formatTime(dropInfo.proximoCiclo).replace('⏳ ', '').replace(/\*/g, '')}*`
        }
      }
    } catch {}

    const mensaje = `╭─── ⋆🐉⋆ ───
│  🐲 *${name}* — Nivel ${level}${prestige > 0 ? ` ⭐P${prestige}` : ''}
│  ${readyBar} ${readyPercent}% listo
├───────────────
│
│  ⚔️ *— ACCIONES —*
│  ⴵ Work » ${formatTime(cooldowns.work)}${workStreak > 1 ? ` 🔥x${workStreak}` : ''}
│  ⴵ Crime » ${formatTime(cooldowns.crime)}
│  ⴵ Steal » ${formatTime(cooldowns.steal)}
│  ⴵ Mine » ${formatTime(cooldowns.mine)}
│  ⴵ Fish » ${formatTime(cooldowns.fish)} 🐟${totalFish}
│  ⴵ Explorar » ${formatTime(cooldowns.explore)} 🧭${totalExplores}
│  ⴵ Slut » ${formatTime(cooldowns.slut)}
│
│  🎮 *— JUEGOS —*
│  ⴵ Ruleta » ${formatTime(cooldowns.rt)}
│  ⴵ Ppt » ${formatTime(cooldowns.ppt)}
│  ⴵ Ahorcado » ${formatTime(cooldowns.hangman)}
│  ⴵ Arena » ${formatTime(cooldowns.arena)} 🏆${arenaWins}
│  ⴵ Ritual » ${formatTime(cooldowns.ritual)}
│  ⴵ Duelo » ✅ *Sin CD* ⚔️${duelWins}
│  ⴵ Math » ✅ *Sin CD*
│  ⴵ Slots » ✅ *Sin CD*
│  ⴵ Lottery » ✅ *Sin CD*
│
│  📅 *— RECOMPENSAS —*
│  ⴵ Daily » ${formatTime(cooldowns.daily)}${dailyStreak > 0 ? ` 🔥${dailyStreak}d` : ''}
│  ⴵ Weekly » ${formatTime(cooldowns.weekly)}
│  ⴵ Monthly » ${formatTime(cooldowns.monthly)}
│  ⴵ Evento » Escribe *#evento*
│${dropSection}
│
│  💼 *— ESTADO —*
│  ⛁ Coins » *¥${coins.toLocaleString()} ${currency}*
│  🏦 Banco » *¥${bank.toLocaleString()} ${currency}*
│  💔 Salud » *${health}/100 HP*
│  ⚡ XP » *${exp.toLocaleString()}*
│  🎭 Clase » *${userClass}*
│
│  ${tip}
╰─── ⋆🐲⋆ ───
> 🐉 *Lucoa Bot* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`

    await client.sendMessage(chatId, {
      text: mensaje
    }, { quoted: m })
  }
};
