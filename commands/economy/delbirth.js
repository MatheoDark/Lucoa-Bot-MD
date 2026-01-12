import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['delbirth', 'borrarcumple', 'delcumple'],
  category: 'rpg',
  run: async ({ client, m }) => {
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    const user = global.db.data.users[userId]

    if (!user) return m.reply(`《✧》 Perfil no encontrado.`)

    if (!user.birth) return m.reply(`《✧》 No tienes una fecha de nacimiento establecida.`)

    user.birth = ''
    return m.reply(`✎ Tu fecha de nacimiento ha sido eliminada.`)
  },
};
