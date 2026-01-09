import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['steal', 'rob', 'robar'],
  category: 'rpg',
  run: async ({ client, m }) => {
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId] || {}
    const monedas = botSettings.currency || 'coins'
    const chatData = global.db.data.chats[chatId]

    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`✎ Desactivado.`)

    const mentioned = m.mentionedJid || []
    const who2 = mentioned[0] || (m.quoted ? m.quoted.sender : null)

    if (!who2) return m.reply(`《✧》 Menciona a alguien para robar.`)

    const target = await resolveLidToRealJid(who2, client, chatId)
    if (target === m.sender) return m.reply(`《✧》 No puedes robarte a ti mismo.`)

    // CORRECCIÓN: Usuarios Globales
    const senderData = global.db.data.users[m.sender]
    const targetData = global.db.data.users[target]

    if (!targetData) return m.reply('《✧》 Usuario no registrado.')

    if ((targetData.coins || 0) < 50)
      return m.reply(`《✧》 La víctima es muy pobre.`)

    senderData.roboCooldown = senderData.roboCooldown || 0
    const remainingTime = senderData.roboCooldown - Date.now()

    if (remainingTime > 0)
      return m.reply(`ꕥ Espera *${msToTime(remainingTime)}*.`)

    const cooldown = 30 * 60 * 1000 
    const now = Date.now()

    senderData.roboCooldown = now + cooldown
    const success = Math.random() < 0.70

    if (!success) {
      const fine = Math.floor(senderData.coins * 0.15)
      senderData.coins = Math.max(0, senderData.coins - fine)
      senderData.roboCooldown = now + cooldown * 2

      return client.sendMessage(chatId, {
          text: `🚔 ¡ATRAPADO!\n\nꕥ Intentaste robar a *@${target.split('@')[0]}* y fallaste.\n💸 Multa: *-${fine.toLocaleString()} ${monedas}*`,
          mentions: [m.sender, target],
        }, { quoted: m }
      )
    }

    const cantidadRobada = Math.min(Math.floor(Math.random() * 5000) + 50, targetData.coins)
    senderData.coins += cantidadRobada
    targetData.coins -= cantidadRobada

    await client.sendMessage(chatId, {
        text: `ꕥ Le robaste *${cantidadRobada.toLocaleString()} ${monedas}* a *@${target.split('@')[0]}*.`,
        mentions: [target],
      }, { quoted: m }
    )
  },
}

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
}
