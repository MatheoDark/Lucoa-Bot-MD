export default {
  command: ['leave'],
  category: 'socket',
  run: async ({ client, m, args, mess, msgglobal }) => {
    const db = global.db.data
    const botId = client?.user?.id
      ? client.user.id.split(':')[0] + '@s.whatsapp.net'
      : null
    const owner = db.settings[botId]?.owner
    const owners = (global.owner || [])
      .map((o) => Array.isArray(o) ? o[0] : o)
      .map((n) => String(n).replace(/\D/g, ''))
      .filter(Boolean)
    const isSocketOwner = [
      ...(botId ? [botId] : []),
      ...owners.map((n) => n + '@s.whatsapp.net'),
      ...(global.mods || []).map((n) => n + '@s.whatsapp.net'),
    ].includes(m.sender)

    if (!isSocketOwner && m.sender !== owner)
      return m.reply(mess?.socket || '🚫 No tienes permisos para usar este comando.')

    const groupId = args[0] || m.chat

    try {
      await client.groupLeave(groupId)
    } catch (e) {
      return m.reply(msgglobal || '❌ No pude salir del grupo.')
    }
  },
};
