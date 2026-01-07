export async function before(m, { client }) {
  try {
    const rawId = client?.user?.id || ''
    const botId = rawId ? rawId.split(':')[0] + '@s.whatsapp.net' : null

    global.db = global.db || { data: {} }
    global.db.data = global.db.data || {}
    global.db.data.settings = global.db.data.settings || {}

    const bot = (botId && global.db.data.settings[botId]) ? global.db.data.settings[botId] : {}

    const botname = bot.namebot || 'Lucoa Bot'
    const icon = bot.icon || 'https://images3.alphacoders.com/814/814389.jpg'

    const dev = global.dev || 'MatheoDark'

    const canal = 'https://whatsapp.com/channel/0029Vb7Ji66KbYMTYLU9km3p'
    const canal2 = 'https://whatsapp.com/channel/0029Vaxr2YgLCoWy2NS1Ab0a'
    const gpo = 'https://chat.whatsapp.com/JrO1REb8ESRAKgRQKaF8KC?mode=ac_t'

    global.redes = [canal, canal2, gpo][Math.floor(Math.random() * 3)]

    global.rcanal = {
      contextInfo: {
        forwardingScore: 2026,
        isForwarded: true,
        externalAdReply: {
          title: botname,
          body: dev,
          sourceUrl: global.redes,
          thumbnailUrl: icon
        }
      }
    }
  } catch (e) {
    console.error('Error en allfake.before:', e)
  }
}
