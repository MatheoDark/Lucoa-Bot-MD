import { resolveLidToRealJid } from '../../lib/utils.js'

export default {
  command: ['ppt'],
  category: 'rpg',
  run: async ({client, m, text, usedPrefix, command}) => {
    // Validaciones de grupo
    const chatData = global.db.data.chats[m.chat] || {}
    if (chatData.adminonly) return m.reply('🐲 Solo administradores (◕ᴗ◕✿)');
    if (!chatData.rpg) return m.reply('🐉 La economía está dormida zzZ');

    // CORRECCIÓN: Usuario Global + Resolución LID/JID
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    let user = global.db.data.users[userId]
    if (!user) {
        global.db.data.users[userId] = { coins: 0, bank: 0, exp: 0 }
        user = global.db.data.users[userId]
    }

    if (!user.pptCooldown) user.pptCooldown = 0;
    let remainingTime = user.pptCooldown - Date.now();

    let botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
    let botSettings = global.db.data.settings[botId] || {}
    let monedas = botSettings.currency || 'coins'

    if (remainingTime > 0) {
      return m.reply(`🐲 Espera *${msToTime(remainingTime)}* (◕︿◕✿)`);
    }

    const options = ['piedra', 'papel', 'tijera'];
    const userChoice = text.trim().toLowerCase();

    if (!options.includes(userChoice)) {
      return m.reply(`🐲 Uso: *${usedPrefix}${command} <piedra|papel|tijera>* (◕ᴗ◕)`);
    }

    const botChoice = options[Math.floor(Math.random() * options.length)];
    const result = determineWinner(userChoice, botChoice);
    
    // Usamos 'coins' en lugar de 'chocolates' para unificar
    const randomReward = Math.floor(Math.random() * 8000) + 2000;
    const randomExp = Math.floor(Math.random() * 2000) + 500;
    const randomLoss = Math.floor(Math.random() * 3000) + 500;
    const randomTieReward = Math.floor(Math.random() * 1000) + 200;
    const randomTieExp = Math.floor(Math.random() * 500) + 100;

    user.coins = user.coins || 0
    user.bank = user.bank || 0

    if (result === '✧ ¡Ganaste!') {
      user.coins += randomReward;
      user.exp = (user.exp || 0) + randomExp;
      await client.reply(m.chat, `╭─── ⋆🐉⋆ ───\n│ ✨ *¡Ganaste!*\n├───────────────\n│ ❀ Tu elección › *${userChoice}*\n│ ❀ Bot › *${botChoice}*\n│ ❀ ${monedas} › +¥${randomReward.toLocaleString()}\n│ ❀ Exp › +${randomExp}\n╰─── ⋆✨⋆ ───`, m);
    } else if (result === '✿ Perdiste. ¡Intenta de nuevo!') {
      if (user.coins >= randomLoss) {
        user.coins -= randomLoss;
      } else if (user.bank >= randomLoss) {
        user.bank -= randomLoss;
      } else {
        // Pierde todo lo que tenga si es menos que la pérdida
        user.coins = 0;
        user.bank = Math.max(0, user.bank - (randomLoss - user.coins));
      }
      await client.reply(m.chat, `╭─── ⋆🐉⋆ ───\n│ 💀 *Perdiste* (╥﹏╥)\n├───────────────\n│ ❀ Tu elección › *${userChoice}*\n│ ❀ Bot › *${botChoice}*\n│ ❀ ${monedas} › -¥${randomLoss.toLocaleString()}\n╰─── ⋆✨⋆ ───`, m);
    } else {
      user.coins += randomTieReward;
      user.exp += randomTieExp;
      await client.reply(m.chat, `╭─── ⋆🐉⋆ ───\n│ 🤝 *Empate*\n├───────────────\n│ ❀ Tu elección › *${userChoice}*\n│ ❀ Bot › *${botChoice}*\n│ ❀ ${monedas} › +¥${randomTieReward.toLocaleString()}\n╰─── ⋆✨⋆ ───`, m);
    }

    user.pptCooldown = Date.now() + 10 * 60000;
  }
};

function determineWinner(userChoice, botChoice) {
  if (userChoice === botChoice) return '❀ Empate.';
  if (
    (userChoice === 'piedra' && botChoice === 'tijera') ||
    (userChoice === 'papel' && botChoice === 'piedra') ||
    (userChoice === 'tijera' && botChoice === 'papel')
  ) {
    return '✧ ¡Ganaste!';
  }
  return '✿ Perdiste. ¡Intenta de nuevo!';
}

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  return (minutes === 0) ? `${seconds}s` : `${minutes}m ${seconds}s`
}
