import { resolveLidToRealJid } from '../../lib/utils.js'
import { getRPGImage } from '../../lib/rpgImages.js'

export default {
  command: ['ritual'],
  category: 'rpg',
  run: async ({client, m}) => {
    const botId = client?.user?.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId] || {}
    const monedas = botSettings.currency || 'Coins'

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg)
      return m.reply('🐉 La economía está dormida zzZ')

    // CORRECCIÓN: Usuario Global + Resolución LID/JID
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    const user = global.db.data.users[userId]
    if (!user) return m.reply('🐲 No estás registrado (◕︿◕)')

    const remaining = (user.ritualCooldown || 0) - Date.now()
    if (remaining > 0) {
      return m.reply(`🐲 Espera *${msToTime(remaining)}* para otro ritual (◕︿◕✿)`)
    }

    user.ritualCooldown = Date.now() + 15 * 60000

    const roll = Math.random()
    let reward = 0
    let narration = ''
    let bonusMsg = ''

    // Inicializamos monedas si no existen
    user.coins = user.coins || 0

    if (roll < 0.05) {
      reward = Math.floor(Math.random() * 250000) + 100000
      narration = '🐉 ¡Invocaste un espíritu ancestral que te entrega un tesoro cósmico!'
      bonusMsg = '\n│ ✨ ¡Recompensa MÍTICA! (≧◡≦)'
    } else if (roll < 0.25) {
      reward = Math.floor(Math.random() * 22000) + 8000
      narration = '🐉 Tu ritual abre un portal dimensional~'
    } else if (roll < 0.75) {
      reward = Math.floor(Math.random() * 10000) + 2000
      narration = `🐉 Bajo la luna, tu ritual te concede *${reward.toLocaleString()} ${monedas}*`
    } else {
      const loss = Math.floor(Math.random() * 5000) + 1000
      // Evitamos números negativos
      user.coins = Math.max(0, user.coins - loss)
      return m.reply(`🐲 El ritual salió mal... perdiste *${loss.toLocaleString()} ${monedas}* (╥﹏╥)`)
    }

    if (Math.random() < 0.15) {
      const bonus = Math.floor(Math.random() * 10000) + 3000
      reward += bonus
      bonusMsg += `\n│ ❀ ¡Energía extra! +*${bonus.toLocaleString()}* ${monedas}`
    }

    user.coins += reward

    let msg = `╭─── ⋆🐉⋆ ───\n│ 🔮 *RITUAL*\n├───────────────\n│ ${narration}\n│ Ganaste *${reward.toLocaleString()} ${monedas}*`
    if (bonusMsg) msg += bonusMsg
    msg += '\n╰─── ⋆✨⋆ ───'

    const img = await getRPGImage('ritual', 'magic')
    await client.sendMessage(m.chat, { image: { url: img }, caption: msg }, { quoted: m })
  },
};

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  minutes = minutes < 10 ? '0' + minutes : minutes
  seconds = seconds < 10 ? '0' + seconds : seconds
  return (minutes === '00') ? `${seconds}s` : `${minutes}m ${seconds}s`
}
