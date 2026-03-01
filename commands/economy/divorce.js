import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['divorce', 'divorciarse'],
  category: 'rpg',
  run: async ({ client, m }) => {
    
    // Resolver tu ID real
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    const user = global.db.data.users[userId]

    if (!user || !user.marry) return m.reply('🐲 No estás casado/a con nadie~ disfruta tu libertad 🍃 (◕ᴗ◕)')

    const partnerId = user.marry

    // Limpiar tu estado
    user.marry = ''
    
    // Limpiar el estado de la pareja (si existe en la DB)
    const partner = global.db.data.users[partnerId]
    if (partner) {
        partner.marry = ''
    }

    // Nombres para el mensaje
    const myName = user.name || userId.split('@')[0]
    const partnerName = partner ? (partner.name || partnerId.split('@')[0]) : 'tu ex-pareja'

    return m.reply(
      `╭─── ⋆🐉⋆ ───\n│ 💔 *DIVORCIO FINALIZADO*\n├───────────────\n│ 📝 *${myName}* ha firmado los papeles\n│ Te has divorciado de *${partnerName}*\n│\n│ Ahora eres libre~ (◕ᴗ◕)\n╰─── ⋆✨⋆ ───`
    )
  },
};
