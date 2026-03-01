import { resolveLidToRealJid } from "../../lib/utils.js"

// Almacén temporal de propuestas
let proposals = {}

export default {
  command: ['marry', 'casarse'],
  category: 'rpg',
  run: async ({ client, m }) => {
    
    // 1. Resolver Proposer (Quien pide)
    const proposerId = await resolveLidToRealJid(m.sender, client, m.chat);
    
    // 2. Resolver Proposee (A quien se le pide)
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : (m.quoted ? m.quoted.sender : false)
    
    if (!who2) return m.reply('🐲 Menciona al usuario con quien quieres casarte (◕ᴗ◕✿)')

    const proposeeId = await resolveLidToRealJid(who2, client, m.chat);

    // Validaciones
    if (proposerId === proposeeId) return m.reply('🐲 No puedes casarte contigo mismo (╥﹏╥)')

    // Inicializar usuarios si no existen
    if (!global.db.data.users[proposerId]) global.db.data.users[proposerId] = { marry: '' }
    if (!global.db.data.users[proposeeId]) global.db.data.users[proposeeId] = { marry: '' }

    const user1 = global.db.data.users[proposerId]
    const user2 = global.db.data.users[proposeeId]

    // Verificar si ya están casados
    if (user1.marry) {
        const partnerName = global.db.data.users[user1.marry]?.name || 'alguien'
        return m.reply(`🐲 Ya estás casado/a con *${partnerName}* (◕ᴗ◕)`)
    }

    if (user2.marry) {
        const partnerName = global.db.data.users[user2.marry]?.name || 'alguien'
        const targetName = user2.name || proposeeId.split('@')[0]
        return m.reply(`🐲 *${targetName}* ya está casado/a con *${partnerName}* (◕︿◕)`)
    }

    // Lógica de Propuesta
    if (proposals[proposeeId] === proposerId) {
      // Si ya había una propuesta pendiente del otro lado -> ACEPTAR
      delete proposals[proposeeId]
      
      user1.marry = proposeeId
      user2.marry = proposerId
      
      const name1 = user1.name || proposerId.split('@')[0]
      const name2 = user2.name || proposeeId.split('@')[0]
      
      return m.reply(`╭─── ⋆🐉⋆ ───\n│ 💍 *¡BODA REALIZADA!*\n├───────────────\n│ Felicidades~ *${name1}* y *${name2}*\n│ están oficialmente casados 🎉\n│ (◕ᴗ◕✿)\n╰─── ⋆✨⋆ ───`)
    
    } else {
      // ENVIAR PROPUESTA
      proposals[proposerId] = proposeeId
      
      // Caducar en 2 minutos
      setTimeout(() => {
        if (proposals[proposerId] === proposeeId) delete proposals[proposerId]
      }, 120000)

      return client.sendMessage(m.chat, {
        text: `╭─── ⋆🐉⋆ ───\n│ 💌 *PROPUESTA*\n├───────────────\n│ @${proposeeId.split('@')[0]}, el usuario\n│ @${proposerId.split('@')[0]} te ha pedido\n│ matrimonio (◕ᴗ◕✿)\n│\n│ ❀ *Para aceptar:*\n│ Usa *#marry @${proposerId.split('@')[0]}*\n│ ⏳ Expira en 2 min\n╰─── ⋆✨⋆ ───`,
        mentions: [proposerId, proposeeId]
      }, { quoted: m })
    }
  }
};
