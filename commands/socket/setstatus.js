export default {
  command: ['setstatus'],
  category: 'socket',
  run: async ({client, m, args}) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const config = global.db.data.settings[idBot]
    const owners = (global.owner || [])
  .map(o => Array.isArray(o) ? o[0] : o)
  .map(n => String(n).replace(/\D/g, ''))
  .filter(Boolean)
const isOwner2 = [idBot, ...owners.map(n => n + '@s.whatsapp.net')].includes(m.sender);

if (!isOwner2 && m.sender !== owner) return m.reply(mess.socket)
    const value = args.join(' ').trim()
    if (!value) return m.reply(`✐ Debes escribir un estado valido.\n> Ejemplo: *${prefa}setstatus Hola! soy Sherry Barnet*`)
    await client.updateProfileStatus(value)
    return m.reply(`✿ Se ha actualizado el estado del bot a *${value}*!`)
  },
};
