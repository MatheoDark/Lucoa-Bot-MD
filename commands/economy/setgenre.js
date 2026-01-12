import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['setgenre', 'setgenero'],
  category: 'profile',
  run: async ({ client, m, args, usedPrefix }) => {
    const prefa = usedPrefix || '/'
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    const user = global.db.data.users[userId]

    if (user.genre) return m.reply(`《✧》 Ya tienes género. Usa *${prefa}delgenre* para borrarlo.`)

    const input = args.join(' ').toLowerCase()
    const genre = (input === 'hombre' || input === 'h') ? 'Hombre' : (input === 'mujer' || input === 'm') ? 'Mujer' : null

    if (!genre) return m.reply(`《✧》 Género inválido. Usa: *Hombre* o *Mujer*.`)

    user.genre = genre
    return m.reply(`✎ Género establecido: *${user.genre}*`)
  },
};
