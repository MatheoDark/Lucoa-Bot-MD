import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['deldescription', 'deldesc', 'borrardesc'],
  category: 'rpg',
  run: async ({ client, m }) => {
    
    // 1. Resolver ID Real
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    const user = global.db.data.users[userId]

    // 2. Validar si existe el usuario y la descripción
    if (!user || !user.description) {
        return m.reply(`《✧》 No tienes una descripción establecida para borrar.`)
    }

    // 3. Borrar
    user.description = ''
    return m.reply(`✎ Tu descripción ha sido eliminada correctamente.`)
  },
};
