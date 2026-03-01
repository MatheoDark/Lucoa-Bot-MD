import { resolveLidToRealJid } from '../../lib/utils.js'

export default {
  command: ['gachainfo', 'ginfo', 'infogacha'],
  category: 'gacha',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const chatData = db.chats[chatId] || {}
    const now = Date.now()

    if (chatData.adminonly || !chatData.gacha)
      return m.reply(`🐲 Estos comandos están desactivados en este grupo. (◕︿◕)`)

    // --- MODELO HÍBRIDO + Resolución LID/JID ---
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    // Cooldowns desde usuario GLOBAL
    const globalUser = db.users[userId] || {}
    // Personajes desde usuario LOCAL (del grupo)
    const localUser = chatData.users?.[userId] || {}

    const cooldowns = {
      vote: Math.max(0, (globalUser.voteCooldown || 0) - now),
      roll: Math.max(0, (globalUser.rwCooldown || 0) - now),
      claim: Math.max(0, (globalUser.buyCooldown || 0) - now)
    }

    const formatTime = (ms) => {
      const totalSeconds = Math.floor(ms / 1000)
      const hours = Math.floor((totalSeconds % 86400) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      const parts = []
      if (hours > 0) parts.push(`${hours} hora${hours > 1 ? 's' : ''}`)
      if (minutes > 0) parts.push(`${minutes} minuto${minutes > 1 ? 's' : ''}`)
      if (seconds > 0) parts.push(`${seconds} segundo${seconds > 1 ? 's' : ''}`)
      return parts.join(' ')
    }

    const nombre = globalUser.name || userId.split('@')[0]
    const personajes = localUser.characters || []
    const valorTotal = personajes.reduce((acc, char) => acc + (char.value || 0), 0)

    const mensaje = `╭─── ⋆🐉⋆ ───
│ Gacha Info (◕ᴗ◕✿)
├───────────────
│ ❀ Usuario: \`<${nombre}>\`
│ ❀ RollWaifu » *${cooldowns.roll > 0 ? formatTime(cooldowns.roll) : 'Ahora.'}*
│ ❀ Claim » *${cooldowns.claim > 0 ? formatTime(cooldowns.claim) : 'Ahora.'}*
│ ❀ Vote » *${cooldowns.vote > 0 ? formatTime(cooldowns.vote) : 'Ahora.'}*
├───────────────
│ ❀ Personajes (Grupo) » *${personajes.length}*
│ ❀ Valor total (Grupo) » *${valorTotal.toLocaleString()}*
╰─── ⋆✨⋆ ───`

    await client.sendMessage(chatId, { text: mensaje }, { quoted: m })
  }
};