export default {
  command: ['ping', 'p'],
  category: 'info',
  run: async ({client, m}) => {
    const start = Date.now()
    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
    const botSettings = global.db.data.settings?.[botId] || {}
    const botName = botSettings.namebot || 'Lucoa-Bot'
    
    const sent = await client.sendMessage(m.chat, { text: '`🌱 ¡Pong!`' + `\n> *${botName}*`}, { quoted: m })
    const latency = Date.now() - start

    await client.sendMessage(m.chat, {
      text: `🌾 *Pong!*\n> Tiempo ⴵ ${latency}ms`,
      edit: sent.key
    }, { quoted: m })
  },
};