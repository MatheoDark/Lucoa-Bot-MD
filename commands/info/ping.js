export default {
  command: ['ping', 'p'],
  category: 'info',
  run: async ({client, m}) => {
    const start = Date.now()
    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
    const botSettings = global.db.data.settings?.[botId] || {}
    const botName = botSettings.namebot2 || 'Lucoa'
    const kaos = ['(◕ᴗ◕✿)', '(●\'\u25e1\'\u25cf)', '(˶ᵔ ᵕ ᵔ˶)', '(≧◡≦)']
    const kao = kaos[Math.floor(Math.random() * kaos.length)]
    
    const sent = await client.sendMessage(m.chat, { text: `🔮 *Pong~!* ${kao}`}, { quoted: m })
    const latency = Date.now() - start

    await client.sendMessage(m.chat, {
      text: `╭─── ⋆🐉⋆ ───\n│ 🐲 *${botName}* ${kao}\n├───────────\n│ ✨ *Latencia ›* ${latency}ms\n│ 🌸 *Estado ›* Online\n╰─── ⋆✨⋆ ───`,
      edit: sent.key
    }, { quoted: m })
  },
};