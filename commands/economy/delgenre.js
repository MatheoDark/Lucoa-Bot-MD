import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['delgenre', 'borrargenero'],
  category: 'rpg',
  run: async ({ client, m }) => {
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    const user = global.db.data.users[userId]

    // Inicializar si no existe
    if (!user) return m.reply(`🐲 Perfil no encontrado. (◕︿◕)`)

    if (!user.genre) return m.reply(`🐲 No tienes un género asignado para borrar. (◕︿◕)`)

    user.genre = ''
    return m.reply(`✎ Tu género ha sido eliminado del perfil.`)
  },
};
