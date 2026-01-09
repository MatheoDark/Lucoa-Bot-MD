import { resolveLidToRealJid } from '../../lib/utils.js'

export default {
  command: ['rt', 'roulette', 'ruleta'],
  category: 'rpg',
  run: async ({client, m, text, usedPrefix, command}) => {
    // Validaciones de grupo
    if (global.db.data.chats[m.chat].adminonly)   
      return m.reply(`❒ Comandos desactivados. Solo administradores.`)
    if (!global.db.data.chats[m.chat].rpg)   
      return m.reply(`❒ Economía desactivada en este grupo.`)

    // CORRECCIÓN: Usuario Global + Resolución LID/JID
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    let user = global.db.data.users[userId]
    if (!user.coins) user.coins = 0  
    if (!user.rtCooldown) user.rtCooldown = 0  
    
    let botId = client.user.id.split(':')[0] + '@s.whatsapp.net';
    let botSettings = global.db.data.settings[botId] || {}
    let currency = botSettings.currency || 'monedas'

    let remainingTime = user.rtCooldown - Date.now()  
    if (remainingTime > 0) {  
      return m.reply(`⏳ Debes esperar *${msToTime(remainingTime)}* antes de volver a girar la ruleta 🎰`)  
    }  
    
    const args = text.split(' ')  
    if (args.length !== 2) {  
      return m.reply(`ꕥ Debes ingresar una cantidad y apostar a un color.\n🎲 *Ejemplo ›* ${usedPrefix + command} 200 black`)  
    }  
    
    const amount = parseInt(args[0])  
    const color = args[1].toLowerCase()  
    
    if (isNaN(amount)) return m.reply(`⚠️ Ingresa una cantidad de ${currency} válida.`)  
    if (amount < 200) return m.reply(`💰 La apuesta mínima es de *200 ${currency}*.`)  
    if (amount > 10000) return m.reply(`🚫 No puedes apostar más de *10,000 ${currency}* por ronda.`)  

    if (!['red', 'black', 'green'].includes(color))   
      return m.reply(`🎨 Colores disponibles:\n🔴 red\n⚫ black\n🟢 green`)  
    
    if (user.coins < amount)   
      return m.reply(`🚫 No tienes suficientes *${currency}* para esta apuesta.`)  
    
    const colors = [  
      'red','red','red','red','red','red',  
      'black','black','black','black','black','black',  
      'green', 'orange', 'white'
    ]  
    
    const resultColor = colors[Math.floor(Math.random() * colors.length)]  
    user.rtCooldown = Date.now() + 10 * 60000  

    const colorEmojis = { red: '🔴', black: '⚫', green: '🟢', orange: '🟠', white: '⚪' }  
    
    if (resultColor === 'orange') {
      user.coins -= amount
      await client.reply(m.chat, `🎰 *RULETA ESPECIAL*\n\nCayó en ${colorEmojis[resultColor]} *ORANGE*\n😵 ¡Color maldito! Perdiste *${amount.toLocaleString()} ${currency}*`, m)
      return
    }

    if (resultColor === 'white') {
      let total = user.coins
      user.coins = 0
      await client.reply(m.chat, `🎰 *RULETA FATAL*\n\nCayó en ${colorEmojis[resultColor]} *WHITE*\n☠️ ¡Desastre! Has perdido *todo tu dinero (${total.toLocaleString()} ${currency})*`, m)
      return
    }

    if (resultColor === color) {  
      let reward = amount  
      reward *= (resultColor === 'green') ? 14 : 2
      user.coins += reward  
      await client.reply(m.chat, `🎰 *RULETA*\n\nCayó en ${colorEmojis[resultColor]} *${resultColor.toUpperCase()}*\n\n✨ ¡Ganaste *${reward.toLocaleString()} ${currency}*!`, m)  
    } else {  
      user.coins -= amount  
      await client.reply(m.chat, `🎰 *RULETA*\n\nCayó en ${colorEmojis[resultColor]} *${resultColor.toUpperCase()}*\n\n💸 Perdiste *${amount.toLocaleString()} ${currency}*`, m)  
    }  
  }  
}

function msToTime(duration) {  
  let seconds = Math.floor((duration / 1000) % 60)  
  let minutes = Math.floor((duration / (1000 * 60)) % 60)  
  minutes = (minutes < 10) ? '0' + minutes : minutes  
  seconds = (seconds < 10) ? '0' + seconds : seconds  
  return (minutes === '00') ? `${seconds}s` : `${minutes}m ${seconds}s`
}
