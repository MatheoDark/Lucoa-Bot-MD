import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['givecoins', 'pay', 'coinsgive'],
  category: 'rpg',
  run: async ({client, m, args}) => {
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId] || {}
    const monedas = botSettings.currency || 'coins'
    const chatData = global.db.data.chats[chatId]

    if (chatData.adminonly || !chatData.rpg) return m.reply(`✎ Desactivado.`)

    const [cantidadInputRaw] = args
    const mentioned = m.mentionedJid || []
    const who2 = mentioned[0] || (m.quoted ? m.quoted.sender : null)
    
    if (!who2) return m.reply(`《✧》 Menciona a alguien.`)
    const who = await resolveLidToRealJid(who2, client, m.chat);

    // CORRECCIÓN: Usuarios Globales
    const senderData = global.db.data.users[m.sender]
    const targetData = global.db.data.users[who]

    if (!targetData) {
        // Inicializar si no existe
        global.db.data.users[who] = { coins: 0 }
    }

    const cantidadInput = cantidadInputRaw?.toLowerCase()
    const cantidad = cantidadInput === 'all' ? senderData.coins : parseInt(cantidadInput)

    if (!cantidadInput || isNaN(cantidad) || cantidad <= 0)
      return m.reply(`《✧》 Cantidad inválida.`)

    if (senderData.coins < cantidad)
      return m.reply(`《✧》 No tienes suficientes *${monedas}*.`)

    senderData.coins -= cantidad
    global.db.data.users[who].coins = (global.db.data.users[who].coins || 0) + cantidad

    await client.sendMessage(chatId, {
        text: `✎ Transferiste *¥${cantidad.toLocaleString()} ${monedas}* a *@${who.split('@')[0]}*.`,
        mentions: [who],
      }, { quoted: m }
    )
  }
};
