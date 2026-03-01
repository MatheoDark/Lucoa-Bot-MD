import { resolveLidToRealJid } from '../../lib/utils.js'

export default {
  command: ['withdraw', 'retirar', 'wd'],
  category: 'rpg',
  run: async ({ client, m, args }) => {
    
    // 1. Validaciones Básicas
    if (!m.isGroup) return m.reply('🐲 Este comando solo funciona en grupos (◕ᴗ◕✿)')

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) {
         return m.reply('🐉 La economía está dormida en este grupo zzZ')
    }

    // 2. Configuración del Bot (Moneda)
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const monedas = settings.currency || 'monedas'

    // 3. Resolución de Usuario (ID Real)
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    
    // Aseguramos que el usuario exista en la DB
    let user = global.db.data.users[userId]
    if (!user) {
         global.db.data.users[userId] = { coins: 0, bank: 0, exp: 0 }
         user = global.db.data.users[userId]
    }

    // Aseguramos que las propiedades numéricas existan para evitar NaN
    user.bank = user.bank || 0
    user.coins = user.coins || 0

    // 4. Validar Argumentos
    if (!args[0]) {
      return m.reply(`🐲 Ingresa la cantidad de *${monedas}* a *retirar* (◕ᴗ◕)\n│ Ejemplo: *#retirar 100* o *#retirar all*`)
    }

    // 5. Lógica de Retiro
    let amount = 0

    // CASO: Retirar TODO
    if (args[0].toLowerCase() === 'all' || args[0].toLowerCase() === 'todo') {
      if (user.bank <= 0) return m.reply(`🐲 No tienes *${monedas}* en tu *banco* (╥﹏╥)`)
      amount = user.bank
    } 
    // CASO: Cantidad Específica
    else {
      amount = parseInt(args[0])
      if (!Number.isInteger(amount) || amount < 1) {
        return m.reply('🐲 Ingresa una cantidad válida para retirar (◕︿◕)')
      }
    }

    // 6. Verificar Fondos
    if (user.bank < amount) {
      return m.reply(`🐲 No tienes suficientes *${monedas}* en el banco (╥﹏╥)\n│ 🏦 Tienes: *${user.bank.toLocaleString()} ${monedas}*`)
    }

    // 7. Ejecutar Transacción
    user.bank -= amount
    user.coins += amount

    await m.reply(`╭─── ⋆🐉⋆ ───\n│ 🏦 *RETIRO EXITOSO*\n├───────────────\n│ ❀ Monto: *¥${amount.toLocaleString()} ${monedas}*\n│ ❀ Cartera: *¥${user.coins.toLocaleString()}*\n│ (◕ᴗ◕✿)\n╰─── ⋆✨⋆ ───`)
  },
};
