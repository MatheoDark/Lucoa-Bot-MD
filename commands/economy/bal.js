import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['balance', 'bal'],
  category: 'rpg',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const chatData = db.chats[chatId]
    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
    const botSettings = db.settings[botId] || {}
    const monedas = botSettings.currency || 'Coins'

    // Verificación de permisos del grupo
    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`✎ Estos comandos estan desactivados en este grupo.`)

    // Resolver a quién estamos mirando (mencionado o uno mismo)
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : (m.quoted ? m.quoted.sender : m.sender)
    const who = await resolveLidToRealJid(who2, client, m.chat);

    // --- CORRECCIÓN CRÍTICA: Leemos del usuario GLOBAL ---
    // Si el usuario no existe en la DB global, lo inicializamos básico para evitar errores
    if (!global.db.data.users[who]) {
        global.db.data.users[who] = { coins: 0, bank: 0, exp: 0, level: 0 }
    }
    
    const user = global.db.data.users[who]
    const name = user.name || who.split('@')[0] // Fallback para el nombre

    const total = (user.coins || 0) + (user.bank || 0)

    const bal = `✿ Usuario \`<${name}>\`

⛀ Dinero › *¥${(user.coins || 0).toLocaleString()} ${monedas}*
⚿ Banco › *¥${(user.bank || 0).toLocaleString()} ${monedas}*
⛁ Total › *¥${total.toLocaleString()} ${monedas}*

> _Para proteger tu dinero, ¡depósitalo en el banco usando #deposit!_`

    await client.sendMessage(chatId, { text: bal }, { quoted: m })
  }
};
