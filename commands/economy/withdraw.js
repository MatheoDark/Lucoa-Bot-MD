export default {
  command: ['withdraw', 'retirar', 'wd'],
  category: 'rpg',
  run: async ({client, m, args}) => {
    // CORRECCIÓN: Usuario global
    const user = global.db.data.users[m.sender]
    
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[idBot] || {}
    const monedas = settings.currency || 'monedas'

    const chatData = global.db.data.chats[m.chat]
    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`✐ Estos comandos están desactivados en este grupo.`)

    if (!args[0]) {
      return m.reply(`《✧》 Ingresa la cantidad de *${monedas}* que quieras *retirar*.`)
    }

    if (args[0].toLowerCase() === 'all') {
      if (user.bank <= 0) return m.reply(`✎ No tienes *${monedas}* en tu *banco* para retirar`)

      const count = user.bank
      user.bank = 0
      user.coins += count
      await m.reply(`ꕥ Has retirado *¥${count.toLocaleString()} ${monedas}* de tu Banco`)
      return
    }

    if (!Number(args[0]) || parseInt(args[0]) < 1) {
      return m.reply('《✧》 Ingresa una cantidad *válida* para retirar')
    }

    const count = parseInt(args[0])
    if (user.bank < count) {
      return m.reply(`❀ No tienes suficientes *${monedas}* en el banco para retirar`)
    }

    user.bank -= count
    user.coins += count
    await m.reply(`ꕥ Has retirado *¥${count.toLocaleString()} ${monedas}* de tu Banco`)
  },
};
