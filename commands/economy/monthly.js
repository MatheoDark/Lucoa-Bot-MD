export default {
  command: ['monthly', 'mensual'],
  category: 'rpg',
  run: async ({client, m}) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId] || {}
    const monedas = botSettings.currency || 'Coins'
    const chatData = db.chats[chatId] || {}

    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`✎ Estos comandos estan desactivados en este grupo.`)

    // CORRECCIÓN: Usuario Global
    const user = db.users[m.sender]
    if (!user) return m.reply("Usuario no encontrado.")

    // Aumentamos recompensas mensuales para que valgan la pena
    const coins = pickRandom([50000, 75000, 100000, 125000]) 
    const exp = Math.floor(Math.random() * 5000)

    const monthlyCooldown = 30 * 24 * 60 * 60 * 1000 // 30 días
    const lastMonthly = user.lastMonthly || 0
    const tiempoRestante = msToTime(monthlyCooldown - (Date.now() - lastMonthly))

    if (Date.now() - lastMonthly < monthlyCooldown)
      return m.reply(
        `✎ Debes esperar ${tiempoRestante} para volver a reclamar tu recompensa mensual.`,
      )

    user.lastMonthly = Date.now()
    user.exp = (user.exp || 0) + exp
    user.coins = (user.coins || 0) + coins

    const info = `☆ ໌　۟　𝖱𝖾𝖼𝗈𝗆𝗉𝖾𝗇𝗌𝖺　ׅ　팅화　ׄ

> ✿ *Exp ›* ${exp}
> ⛁ *${monedas} ›* ${coins}

${global.dev || ''}`

    await client.sendMessage(chatId, { text: info }, { quoted: m })
  },
};

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function msToTime(duration) {
  let days = Math.floor(duration / (1000 * 60 * 60 * 24))
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  return `${days} d ${hours} h`
}
