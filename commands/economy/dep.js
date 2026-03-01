import { resolveLidToRealJid } from '../../lib/utils.js'

export default {
  command: ['dep', 'deposit', 'depositar', 'd'],
  category: 'rpg',
  run: async ({ client, m, args }) => {
    
    // 1. Validaciones de Grupo
    if (!m.isGroup) return m.reply('🐲 Este comando solo funciona en grupos (◕ᴗ◕✿)')

    const chatData = global.db.data.chats[m.chat] || {}
    if (chatData.adminonly || !chatData.rpg) {
      return m.reply('🐉 La economía está dormida en este grupo zzZ')
    }

    // 2. Configuración del Bot
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const monedas = settings.currency || 'monedas'

    // 3. Resolución de Usuario (CRÍTICO)
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    let user = global.db.data.users[userId]

    // Inicializamos si no existe
    if (!user) {
        global.db.data.users[userId] = { coins: 0, bank: 0 }
        user = global.db.data.users[userId]
    }

    // Aseguramos propiedades numéricas
    user.coins = user.coins || 0
    user.bank = user.bank || 0

    // 4. Validar Argumentos
    if (!args[0]) {
      return m.reply(`🐲 Ingresa la cantidad de *${monedas}* a *depositar* (◕ᴗ◕)\n│ Ejemplo: *#dep 100* o *#dep all*`)
    }

    let amount = 0

    // CASO: Depositar TODO
    if (args[0].toLowerCase() === 'all' || args[0].toLowerCase() === 'todo') {
      if (user.coins <= 0) return m.reply(`🐲 No tienes *${monedas}* en la mano (╥﹏╥)`)
      amount = user.coins
    } 
    // CASO: Cantidad Específica
    else {
      amount = parseInt(args[0])
      if (isNaN(amount) || amount < 1) {
        return m.reply('🐲 Ingresa una cantidad válida para depositar (◕︿◕)')
      }
    }

    // 5. Verificar Fondos
    if (user.coins < amount) {
      return m.reply(`🐲 No tienes suficientes *${monedas}* en la mano (╥﹏╥)\n│ 👛 Tienes: *${user.coins.toLocaleString()} ${monedas}*`)
    }

    // 6. Ejecutar Transacción
    user.coins -= amount
    user.bank += amount

    await m.reply(`╭─── ⋆🐉⋆ ───\n│ 🏦 *DEPÓSITO EXITOSO*\n├───────────────\n│ ❀ Monto: *¥${amount.toLocaleString()} ${monedas}*\n│ ❀ Banco: *¥${user.bank.toLocaleString()}*\n│ (◕ᴗ◕✿)\n╰─── ⋆✨⋆ ───`)
  },
};
