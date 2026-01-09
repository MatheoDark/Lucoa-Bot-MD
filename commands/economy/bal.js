export default {
  command: ['bal', 'balance', 'dinero', 'cartera'],
  category: 'economy',
  run: async ({client, m}) => {
    // CAMBIO IMPORTANTE AQUÍ ABAJO 👇
    const user = global.db.data.users[m.sender]
    // 👆 Antes decía: global.db.data.chats[m.chat].users[m.sender]

    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const currency = settings.currency || 'monedas'

    const wallet = user.coins || 0
    const bank = user.bank || 0
    const total = wallet + bank

    const txt = `
👤 *Usuario:* ${m.pushName || 'Desconocido'}
💳 *Cartera:* ${wallet.toLocaleString()} ${currency}
🏦 *Banco:* ${bank.toLocaleString()} ${currency}
💰 *Total:* ${total.toLocaleString()} ${currency}
`.trim()

    m.reply(txt)
  }
}
