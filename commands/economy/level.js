import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['levelup', 'level', 'lvl'],
  category: 'profile',
  run: async ({ client, m, args }) => {
    
    // 1. Resolver a quién estamos mirando
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : (m.quoted ? m.quoted.sender : m.sender)
    const userId = await resolveLidToRealJid(who2, client, m.chat);
    
    const db = global.db.data
    // 2. Obtener Usuario Global
    const user = db.users[userId]

    if (!user) {
      return m.reply(`「✎」 El usuario no está registrado en la base de datos.`)
    }

    // 3. Calcular Ranking Global
    // Convertimos el objeto de usuarios en un array para ordenar
    const users = Object.entries(db.users).map(([key, value]) => ({
      ...value,
      jid: key
    }))

    // Ordenamos por nivel (Mayor a menor)
    const sortedLevel = users.sort((a, b) => (b.level || 0) - (a.level || 0))
    const rank = sortedLevel.findIndex(u => u.jid === userId) + 1

    // 4. Mensaje
    const txt = `「✿」 *NIVEL DE USUARIO* ◢ ${user.name || 'Usuario'} ◤

☆ Experiencia › *${(user.exp || 0).toLocaleString()}*
❖ Nivel › *${user.level || 0}*
✐ Rank Global › *#${rank}*

❒ Comandos usados › *${(user.usedcommands || 0).toLocaleString()}*`

    await client.sendMessage(m.chat, { text: txt, mentions: [userId] }, { quoted: m })
  }
};
