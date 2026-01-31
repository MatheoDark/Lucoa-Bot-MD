import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['givecoins', 'pay', 'coinsgive', 'transferir', 'darcoins'],
  category: 'rpg',
  run: async ({ client, m, args }) => {
    
    // 1. Validaciones de Grupo
    if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos.')

    const chatId = m.chat
    const chatData = global.db.data.chats[chatId] || {}
    
    // 🔓 CORRECCIÓN: Eliminado "chatData.adminonly"
    // Ahora cualquiera puede transferir, a menos que el RPG esté apagado (false).
    if (chatData.rpg === false) {
         return m.reply(`✎ Los comandos de economía están desactivados en este grupo.`)
    }

    // 2. Configuración Bot
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const monedas = settings.currency || 'Coins'

    // 3. Resolver Sender (El que envía)
    const senderId = await resolveLidToRealJid(m.sender, client, chatId)
    
    // Aseguramos que el usuario exista en la DB
    if (!global.db.data.users[senderId]) {
        global.db.data.users[senderId] = { coins: 0, bank: 0 }
    }
    let senderData = global.db.data.users[senderId]

    // 4. Resolver Target (El que recibe)
    const mentioned = m.mentionedJid || []
    const who2 = mentioned[0] || (m.quoted ? m.quoted.sender : null)
    
    if (!who2) return m.reply(`《✧》 Menciona a alguien para enviarle *${monedas}*.\nEjemplo: *#pay @usuario 100*`)
    
    const targetId = await resolveLidToRealJid(who2, client, chatId)

    // Validaciones de seguridad
    if (targetId === senderId) return m.reply(`《✧》 No puedes transferirte dinero a ti mismo.`)
    if (targetId === botId) return m.reply(`《✧》 No necesito tu dinero, humano.`)

    // Aseguramos que el destinatario exista en la DB
    if (!global.db.data.users[targetId]) {
        global.db.data.users[targetId] = { coins: 0, bank: 0 }
    }
    let targetData = global.db.data.users[targetId]

    // 5. Detectar la Cantidad (Lógica Inteligente)
    // Busca un número en los argumentos que NO sea una mención (@)
    let cantidad = 0
    let foundAmount = args.find(a => !a.includes('@') && (a.toLowerCase() === 'all' || a.toLowerCase() === 'todo' || !isNaN(parseInt(a))))

    if (!foundAmount) {
        return m.reply(`《✧》 Ingresa la cantidad.\nEjemplo: *#pay @user 100*`)
    }

    // Convertir a número real
    if (foundAmount.toLowerCase() === 'all' || foundAmount.toLowerCase() === 'todo') {
        cantidad = senderData.coins || 0
    } else {
        cantidad = parseInt(foundAmount)
    }

    // 6. Validar Saldo
    if (isNaN(cantidad) || cantidad <= 0) return m.reply(`《✧》 Cantidad inválida.`)
    if ((senderData.coins || 0) < cantidad) return m.reply(`《✧》 No tienes suficientes *${monedas}* para enviar.`)

    // 7. Transacción
    senderData.coins -= cantidad
    targetData.coins = (targetData.coins || 0) + cantidad

    // 8. Mensaje de Éxito
    await client.sendMessage(chatId, {
        text: `💸 *TRANSFERENCIA REALIZADA*\n\n💰 Monto: *${cantidad.toLocaleString()} ${monedas}*\n📤 De: @${senderId.split('@')[0]}\n📥 Para: @${targetId.split('@')[0]}`,
        mentions: [senderId, targetId],
      }, { quoted: m }
    )
  }
};
