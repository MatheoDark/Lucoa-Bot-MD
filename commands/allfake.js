// commands/allfake.js

function getSelfId(client) {
  const raw =
    client?.user?.id ||
    client?.user?.jid ||
    client?.authState?.creds?.me?.id ||
    client?.authState?.creds?.me?.jid

  if (!raw) return null

  const cleaned = String(raw).replace(/:\d+/, '') // quita :device
  return cleaned.includes('@') ? cleaned : `${cleaned}@s.whatsapp.net`
}

export async function before(m, { client }) {
  const selfId = getSelfId(client)
  if (!selfId) return

  // Asegura estructura DB
  global.db = global.db || { data: {} }
  global.db.data = global.db.data || {}
  global.db.data.settings = global.db.data.settings || {}

  // Settings del bot (con defaults para que nunca sea undefined)
  const bot = global.db.data.settings[selfId] || (global.db.data.settings[selfId] = {})

  const botname = bot.namebot || bot.namebot2 || 'Lucoa-Bot 🐉'
  const botname2 = bot.namebot2 || bot.namebot || 'Lucoa-Bot 🐉'
  const icon = bot.icon || bot.thumbnail || bot.thumb || '' // por si tienes otro nombre en tu DB

  const canal = 'https://whatsapp.com/channel/0029Vb7Ji66KbYMTYLU9km3p'
  const canal2 = 'https://whatsapp.com/channel/0029Vaxr2YgLCoWy2NS1Ab0a'
  const gpo = 'https://chat.whatsapp.com/JrO1REb8ESRAKgRQKaF8KC?mode=ac_t'

  // ✅ Antes tenías global.redes pero usabas "redes" (undefined)
  global.redes = [canal, canal2, gpo][Math.floor(Math.random() * 3)]

  // ✅ dev puede no existir; lo protegemos
  const devText = global.dev || bot.dev || 'Lucoa'

  // ✅ rcanal seguro
  global.rcanal = {
    contextInfo: {
      forwardingScore: 2026,
      isForwarded: true,
      externalAdReply: {
        title: botname,
        body: devText,
        sourceUrl: global.redes,
        thumbnailUrl: icon
      }
    }
  }

  // si quieres usar botname2 en otro lado, lo dejamos disponible
  global.botname = botname
  global.botname2 = botname2
}

