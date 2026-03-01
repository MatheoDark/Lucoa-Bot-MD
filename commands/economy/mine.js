import { resolveLidToRealJid } from '../../lib/utils.js'

export default {
  command: ['mine'],
  category: 'rpg',
  run: async ({client, m}) => {
    const botId = client?.user?.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId] || {}
    const monedas = botSettings.currency || 'Coins'

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) return m.reply('🐉 La economía está dormida aquí zzZ')

    // CORRECCIÓN: Usuario Global + Resolución LID/JID
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    const user = global.db.data.users[userId]
    if (!user) return m.reply('🐲 No estás registrado (◕︿◕)')

    const remaining = (user.mineCooldown || 0) - Date.now()
    if (remaining > 0) {
      return m.reply(`🐲 Espera *${msToTime(remaining)}* para minar de nuevo (◕︿◕✿)`)
    }

    user.mineCooldown = Date.now() + 10 * 60000

    let isLegendary = Math.random() < 0.02
    let reward, narration, bonusMsg = ''

    if (isLegendary) {
      reward = Math.floor(Math.random() * 150000) + 100000
      narration = '✨ ¡TESORO LEGENDARIO! ✨\n│ '
      bonusMsg = '\n│ 🌟 ¡Recompensa ÉPICA! (≧◡≦)'
    } else {
      reward = Math.floor(Math.random() * 13000) + 2000
      const scenario = pickRandom(escenarios)
      narration = `En ${scenario}, ${pickRandom(mineria)}`

      if (Math.random() < 0.1) {
        const bonus = Math.floor(Math.random() * 8000) + 2000
        reward += bonus
        bonusMsg = `\n│ ❀ ¡Bonus! +*${bonus.toLocaleString()}* extra`
      }
    }

    user.coins = (user.coins || 0) + reward

    let msg = `╭─── ⋆🐉⋆ ───\n│ ⛏️ *MINERÍA*\n├───────────────\n│ ${narration} *${reward.toLocaleString()} ${monedas}*`
    if (bonusMsg) msg += `\n${bonusMsg}`
    msg += '\n╰─── ⋆✨⋆ ───'

    await client.reply(m.chat, msg, m)
  }
};

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
}

function pickRandom(list) {
  return list[Math.floor(list.length * Math.random())]
}

const escenarios = [
  'una cueva oscura', 
  'una montaña nevada', 
  'un bosque misterioso', 
  'un río cristalino', 
  'una mina abandonada'
];

const mineria = [
  'encontraste un cofre con', 
  'hallaste una bolsa de', 
  'descubriste oro por valor de', 
  'picaste una gema que vale'
];
