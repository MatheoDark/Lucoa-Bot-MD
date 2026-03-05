import { resolveLidToRealJid } from '../../lib/utils.js'

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]

const msToTime = (duration) => {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  const days = Math.floor(duration / (1000 * 60 * 60 * 24))

  const pad = (n) => n.toString().padStart(2, '0')
  return `${days} d y ${pad(hours)} h ${pad(minutes)} m y ${pad(seconds)} s`
}

export default {
  command: ['weekly', 'semanal'],
  category: 'rpg',
  run: async ({client, m}) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const chatData = db.chats[chatId] || {}

    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`✎ Estos comandos estan desactivados en este grupo.`)

    // CORRECCIÓN: Usuario Global + Resolución LID/JID
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    const user = db.users[userId]
    if (!user) return m.reply("Usuario no registrado.")

    const cooldown = 7 * 24 * 60 * 60 * 1000
    const lastClaim = user.lastWeekly || 0
    const timeLeft = msToTime(cooldown - (Date.now() - lastClaim))

    if (Date.now() - lastClaim < cooldown)
      return client.sendMessage(
        chatId,
        { text: `ꕥ Debes esperar ${timeLeft} para volver a reclamar tu recompensa semanal` },
        { quoted: m },
      )

    user.lastWeekly = Date.now()
    const coins = pickRandom([35000, 55000, 80000, 120000, 150000])
    const exp = Math.floor(Math.random() * 6000) + 1500
    const currency = db.settings[botId]?.currency || 'Monedas'
    
    // Aumentamos los valores en la DB global
    user.exp += exp
    user.coins = (user.coins || 0) + coins

    const message = `╭─── ⋆🐉⋆ ───
│  *✨ RECOMPENSA SEMANAL*
├───────────────
│ ❀ Exp › *${exp}*
│ 💰 ${currency} › *¥${coins.toLocaleString()}*
╰─── ⋆✨⋆ ───

> 🐉 *Lucoa Bot* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`.trim()

    await client.sendMessage(
      chatId,
      {
        text: message,
        mentions: [userId],
      },
      { quoted: m },
    )
  },
};
