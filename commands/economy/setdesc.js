import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['setdescription', 'setdesc'],
  category: 'profile',
  run: async ({ client, m, args, usedPrefix }) => {
    const prefa = usedPrefix || '/'
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    const user = global.db.data.users[userId]

    if (user.description) return m.reply(`《✧》 Ya tienes descripción. Usa *${prefa}deldesc* para borrarla.`)

    const input = args.join(' ')
    if (!input) return m.reply('《✧》 Escribe tu descripción.')

    user.description = input
    return m.reply(`✎ Descripción actualizada:\n> *${user.description}*`)
  },
};
