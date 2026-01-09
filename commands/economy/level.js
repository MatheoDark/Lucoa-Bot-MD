import { resolveLidToRealJid } from "../../lib/utils.js"
export default {
  command: ['levelup', 'level', 'lvl'],
  category: 'profile',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : (m.quoted ? m.quoted.sender : m.sender)
    const who = await resolveLidToRealJid(who2, client, m.chat);
    
    // Usuario Global (Ya estaba bien, pero aseguramos)
    const user = db.users[who]

    if (!user)
      return m.reply(`「✎」 El usuario mencionado no está registrado en el bot.`)

    const users = Object.entries(db.users).map(([key, value]) => ({
      ...value,
      jid: key
    }))

    const sortedLevel = users.sort((a, b) => (b.level || 0) - (a.level || 0))
    const rank = sortedLevel.findIndex(u => u.jid === who) + 1

    const txt = `*「✿」Usuario* ◢ ${user.name || who.split('@')[0]} ◤

☆ Experiencia › *${(user.exp || 0).toLocaleString()}*
❖ Nivel › *${user.level || 0}*
✐ Puesto › *#${rank}*

❒ Comandos totales › *${(user.usedcommands || 0).toLocaleString()}*`

    await client.sendMessage(chatId, { text: txt, mentions: [who] }, { quoted: m })
  }
};
