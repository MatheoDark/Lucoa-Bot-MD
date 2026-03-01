import {promises as fs} from 'fs';

const charactersFilePath = './lib/characters.json'
const cooldownTime = 60 * 60 * 1000
let characterVotes = new Map()

async function loadCharacters() {
  try {
    const data = await fs.readFile(charactersFilePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    throw new Error('ꕥ No se pudo cargar el archivo characters.json')
  }
}

async function saveCharacters(characters) {
  try {
    await fs.writeFile(charactersFilePath, JSON.stringify(characters, null, 2))
  } catch {
    throw new Error('ꕥ No se pudo guardar el archivo characters.json')
  }
}

function msToTime(duration) {
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  return `${hours}h ${minutes}m`
}

export default {
  command: ['vote', 'votar'],
  category: 'gacha',
  run: async ({client, m, args, command}) => {
    const db = global.db.data
    const chatId = m.chat
    const userId = m.sender
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    
    // --- LÓGICA HÍBRIDA ---
    // Usamos usuario global para el cooldown de voto
    const userGlobal = db.users[userId]
    const chatConfig = db.chats[chatId] || {}

    // Verificaciones de bot (mantengo tu lógica original)
    const isOficialBot = botId === global.client.user.id.split(':')[0] + '@s.whatsapp.net'
    const isPremiumBot = db.settings[botId]?.botprem === true
    const isModBot = db.settings[botId]?.botmod === true

    if (!isOficialBot && !isPremiumBot && !isModBot) {
      return client.reply(m.chat, `🐲 El comando *${command}* no está disponible en *Sub-Bots.* (◕︿◕)`, m)
    }

    if (chatConfig.adminonly || !chatConfig.gacha)
      return m.reply(`🐲 Estos comandos están desactivados en este grupo. (◕︿◕)`)

    // Cooldown Global
    if (!userGlobal.voteCooldown) userGlobal.voteCooldown = 0
    const remainingTime = userGlobal.voteCooldown - Date.now()
    if (remainingTime > 0)
      return m.reply(`🐲 Debes esperar *${msToTime(remainingTime)}* para votar nuevamente. (◕︿◕)`)

    if (args.length === 0)
      return m.reply(`🐲 Por favor, indica el nombre del personaje. (◕︿◕)`)

    try {
      const characterName = args.join(' ').toLowerCase().trim()
      const characters = await loadCharacters()
      const character = characters.find((c) => c.name.toLowerCase() === characterName)

      if (!character)
        return m.reply(`🐲 No se encontró el personaje *${characterName}*. (◕︿◕)`)

      if ((character.votes || 0) >= 10) {
        // Límite de votos global por personaje (esto afecta a todos los usuarios)
        // Puedes quitar esto si quieres votos infinitos
        return m.reply(`🐲 El personaje *${character.name}* ya tiene el valor máximo. (◕︿◕)`)
      }

      if (characterVotes.has(characterName)) {
        const expires = characterVotes.get(characterName)
        const cooldownLeft = expires - Date.now()
        if (cooldownLeft > 0)
          return m.reply(`🐲 *${character.name}* fue votado recientemente. Espera un poco. (◕︿◕)`)
      }

      const incrementValue = Math.floor(Math.random() * 100) + 1
      character.value = (Number(character.value) || 0) + incrementValue
      character.votes = (character.votes || 0) + 1
      character.lastVoteTime = Date.now()

      await saveCharacters(characters)

      userGlobal.voteCooldown = Date.now() + 90 * 60000 // 90 min cooldown para el usuario
      characterVotes.set(characterName, Date.now() + cooldownTime) // 60 min cooldown para el personaje

      const message = `╭─── ⋆🐉⋆ ───\n│ Voto Registrado (◕ᴗ◕✿)\n├───────────────\n│ ❀ Personaje: *${character.name}*\n│ ❀ Nuevo valor › *${character.value.toLocaleString()}*\n│ ❀ Votos totales › *${character.votes}*\n╰─── ⋆✨⋆ ───`
      await client.sendMessage(chatId, { text: message }, { quoted: m })
    } catch (error) {
      console.error(error)
      await client.sendMessage(chatId, { text: "Ocurrió un error al votar." }, { quoted: m })
    }
  },
};
