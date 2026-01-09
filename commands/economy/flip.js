export default {
  command: ['cf', 'flip', 'coinflip'],
  category: 'rpg',
  run: async ({client, m, command, text, usedPrefix}) => { // usedPrefix añadido
    const prefa = usedPrefix || '/'

    if (global.db.data.chats[m.chat].adminonly)
      return m.reply(`❒ Solo admins.`)
    if (!global.db.data.chats[m.chat].rpg)
      return m.reply(`❒ Economía pausada.`)

    // CORRECCIÓN: Usuario Global
    let user = global.db.data.users[m.sender]
    if (!user.coinfCooldown) user.coinfCooldown = 0;
    let remainingTime = user.coinfCooldown - Date.now();

    if (remainingTime > 0) {
      return m.reply(`✿ Espera *${msToTime(remainingTime)}*.`);
    }

    let [cantidad, eleccion] = text.split(' ')
    let botId = client.user.id.split(':')[0] + '@s.whatsapp.net';
    let botSettings = global.db.data.settings[botId] || {}
    let monedas = botSettings.currency || 'coins'

    if (!eleccion || !cantidad)
      return m.reply(`✿ Ejemplo:\n> *${prefa + command}* 2000 cara`)

    eleccion = eleccion.toLowerCase()
    cantidad = parseInt(cantidad)

    if (eleccion !== 'cara' && eleccion !== 'cruz')
      return m.reply(`ꕥ Elige *cara* o *cruz*.`)

    if (isNaN(cantidad) || cantidad <= 199)
      return m.reply(`ꕥ Mínimo *200 ${monedas}*.`)
    if (cantidad >= 5001)
      return m.reply(`ꕥ Máximo *5000 ${monedas}*.`)

    if (user.coins < cantidad)
      return m.reply(`ꕥ No tienes suficientes *${monedas}*.`)

    let azar = Math.random()
    user.coinfCooldown = Date.now() + 10 * 60000; 
    let resultado

    if (azar < 0.1) resultado = 'perdido'
    else resultado = azar < 0.55 ? 'cara' : 'cruz'

    let cantidadFormatted = cantidad.toLocaleString()
    let mensaje = `🎰 *Lanzando moneda...*\n\n✿ Cayó en `

    if (resultado === eleccion) {
      user.coins += cantidad
      mensaje += `*${resultado.toUpperCase()}* 🪙\n\n✨ ¡Ganaste *¥${cantidadFormatted} ${monedas}*!`
    } else if (resultado === 'perdido') {
      let perdida = Math.floor(cantidad * 0.5)
      user.coins -= perdida
      mensaje += `*de canto* 😵‍💫\n\n💸 ¡Perdiste la mitad! (*¥${perdida.toLocaleString()}*)`
    } else {
      user.coins -= cantidad
      mensaje += `*${resultado.toUpperCase()}* 💀\n\n❌ Perdiste *¥${cantidadFormatted} ${monedas}*.`
    }

    await client.reply(m.chat, mensaje, m)
  }
}

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
}
