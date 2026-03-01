import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['warn'],
  category: 'group',
  isAdmin: true,
  // botAdmin: true,
  run: async ({client, m, args}) => {
    const chat = global.db.data.chats[m.chat]
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0
      ? mentioned[0]
      : m.quoted
      ? m.quoted.sender
      : false
    const targetId = await resolveLidToRealJid(who2, client, m.chat);

    const reason = mentioned.length > 0
      ? args.slice(1).join(' ') || 'Sin razón.'
      : args.slice(0).join(' ') || 'Sin razón.'

    try {
      if (!who2) return m.reply('🐲 Debes mencionar o responder al usuario que deseas advertir.')

      if (!chat.users[targetId]) chat.users[targetId] = {}
      const user = chat.users[targetId]
      if (!user.warnings) user.warnings = []

      const now = new Date()
      const timestamp = now.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      user.warnings.unshift({
        reason,
        timestamp,
        by: m.sender,
      })

      const total = user.warnings.length
      const name = global.db.data.users[targetId]?.name || 'Usuario'
      const warningList = user.warnings
        .map((w, i) => {
          const index = total - i
          return `\`#${index}\` » ${w.reason}\n> » Fecha: ${w.timestamp}`
        })
        .join('\n')

      let message = `🐉 Se ha añadido una advertencia a @${targetId.split('@')[0]}.\n🐉 Advertencias totales \`(${total})\`:\n\n${warningList}`

      const warnLimit = chat.warnLimit || 3
      const expulsar = chat.expulsar === true

      if (total >= warnLimit && expulsar) {
        try {
          await client.groupParticipantsUpdate(m.chat, [targetId], 'remove')
          delete chat.users[targetId]
          delete global.db.data.users[targetId]
          message += `\n\n> ❀ El usuario ha alcanzado el límite de advertencias y fue expulsado del grupo.`
        } catch {
          message += `\n\n> ❀ El usuario alcanzó el límite, pero no se pudo expulsar automáticamente.`
        }
      } else if (total >= warnLimit && !expulsar) {
        message += `\n\n> ❀ El usuario ha alcanzado el límite de advertencias.`
      }

      await client.reply(m.chat, message, m, { mentions: [targetId] })
    } catch (e) {
      m.reply(msgglobal)
    }
  },
};
