import { resolveLidToRealJid } from '../../lib/utils.js'

// ═══════════════════════════════════════════
//  ⚔️ DUELO - Desafía a otro jugador
// ═══════════════════════════════════════════

// Duelos pendientes: chatId -> { retador, retadorId, rival, rivalId, apuesta, timestamp }
global.duelos = global.duelos || {}

const ataques = [
  'lanzó un golpe certero ⚔️',
  'esquivó y contraatacó con fuerza 💥',
  'usó un hechizo devastador 🔮',
  'disparó una flecha envenenada 🏹',
  'invocó un rayo fulminante ⚡',
  'sacó su espada legendaria 🗡️',
  'realizó un combo mortal 👊',
  'desató su poder oculto 🌀',
  'cargó un ataque especial 💫',
  'lanzó una bomba de humo y atacó desde las sombras 💨'
]

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]

export default {
  command: ['duel', 'duelo', 'pelea', 'fight'],
  category: 'rpg',
  run: async ({ client, m, args, usedPrefix, command }) => {
    if (!m.isGroup) return m.reply('❌ Solo en grupos.')

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) return m.reply('✎ Economía desactivada en este grupo.')

    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const monedas = settings.currency || 'monedas'

    const userId = await resolveLidToRealJid(m.sender, client, m.chat)
    let user = global.db.data.users[userId]
    if (!user) {
      global.db.data.users[userId] = { coins: 0, exp: 0, duelWins: 0, duelLosses: 0 }
      user = global.db.data.users[userId]
    }
    user.coins = user.coins || 0

    // ══════════════════════════════
    // SUBCOMANDO: Aceptar duelo
    // ══════════════════════════════
    if (args[0] === 'accept' || args[0] === 'aceptar') {
      const duelo = global.duelos[m.chat]
      if (!duelo) return m.reply('❌ No hay ningún duelo pendiente en este grupo.')
      if (duelo.rivalId !== userId) return m.reply('❌ Este duelo no es para ti.')

      // Verificar que el rival tiene las monedas
      let rival = global.db.data.users[duelo.rivalId]
      let retador = global.db.data.users[duelo.retadorId]

      if (!rival || (rival.coins || 0) < duelo.apuesta) {
        delete global.duelos[m.chat]
        return m.reply(`❌ No tienes suficientes ${monedas} para aceptar.`)
      }
      if (!retador || (retador.coins || 0) < duelo.apuesta) {
        delete global.duelos[m.chat]
        return m.reply('❌ El retador ya no tiene suficiente dinero.')
      }

      // PELEA
      delete global.duelos[m.chat]
      const apuesta = duelo.apuesta

      // Generar rondas narrativas
      const rondas = Math.floor(Math.random() * 3) + 2 // 2-4 rondas
      let narración = '⚔️ *¡COMIENZA EL DUELO!*\n\n'
      
      for (let i = 1; i <= rondas; i++) {
        const atacante = Math.random() < 0.5 ? duelo.retador : duelo.rival
        narración += `> *Ronda ${i}:* ${atacante} ${pickRandom(ataques)}\n`
      }

      // 50/50 de ganar
      const ganaRetador = Math.random() < 0.5
      const ganador = ganaRetador ? duelo.retadorId : duelo.rivalId
      const perdedor = ganaRetador ? duelo.rivalId : duelo.retadorId
      const ganadorNombre = ganaRetador ? duelo.retador : duelo.rival
      const perdedorNombre = ganaRetador ? duelo.rival : duelo.retador

      // Transferir monedas
      global.db.data.users[ganador].coins = (global.db.data.users[ganador].coins || 0) + apuesta
      global.db.data.users[perdedor].coins = (global.db.data.users[perdedor].coins || 0) - apuesta
      global.db.data.users[ganador].duelWins = (global.db.data.users[ganador].duelWins || 0) + 1
      global.db.data.users[ganador].exp = (global.db.data.users[ganador].exp || 0) + 500
      global.db.data.users[perdedor].duelLosses = (global.db.data.users[perdedor].duelLosses || 0) + 1

      narración += `\n🏆 *¡${ganadorNombre} gana el duelo!*\n`
      narración += `💰 Se lleva *¥${apuesta.toLocaleString()} ${monedas}* de ${perdedorNombre}\n`
      narración += `\n📊 *${ganadorNombre}:* ${global.db.data.users[ganador].duelWins}W / ${global.db.data.users[ganador].duelLosses || 0}L`
      narración += `\n📊 *${perdedorNombre}:* ${global.db.data.users[perdedor].duelWins || 0}W / ${global.db.data.users[perdedor].duelLosses}L`

      return client.sendMessage(m.chat, { 
        text: narración, 
        mentions: [duelo.retadorId, duelo.rivalId] 
      }, { quoted: m })
    }

    // ══════════════════════════════
    // SUBCOMANDO: Rechazar duelo
    // ══════════════════════════════
    if (args[0] === 'reject' || args[0] === 'rechazar') {
      const duelo = global.duelos[m.chat]
      if (!duelo) return m.reply('❌ No hay duelo pendiente.')
      if (duelo.rivalId !== userId) return m.reply('❌ Este duelo no es para ti.')
      delete global.duelos[m.chat]
      return m.reply('🏳️ Duelo rechazado.')
    }

    // ══════════════════════════════
    // CREAR DUELO
    // ══════════════════════════════
    const mentioned = m.mentionedJid
    const quoted = m.quoted ? m.quoted.sender : null
    let rivalRaw = mentioned?.[0] || quoted

    if (!rivalRaw) {
      return m.reply(`⚔️ *DUELO*\n\n> Uso: *${usedPrefix}${command} @rival <apuesta>*\n> Ejemplo: *${usedPrefix}${command} @Juan 5000*\n\n> El rival debe aceptar con *${usedPrefix}${command} aceptar*\n> O rechazar con *${usedPrefix}${command} rechazar*`)
    }

    const rivalId = await resolveLidToRealJid(rivalRaw, client, m.chat)
    if (rivalId === userId) return m.reply('❌ No puedes desafiarte a ti mismo.')

    let rival = global.db.data.users[rivalId]
    if (!rival) return m.reply('❌ Ese usuario no está registrado en la economía.')

    // Obtener apuesta
    const apuestaArg = args.find(a => !isNaN(parseInt(a)))
    const apuesta = parseInt(apuestaArg) || 1000

    if (apuesta < 500) return m.reply(`💰 La apuesta mínima es *500 ${monedas}*.`)
    if (apuesta > 100000) return m.reply(`🚫 La apuesta máxima es *100,000 ${monedas}*.`)
    if (user.coins < apuesta) return m.reply(`🚫 No tienes suficiente. Tienes: *¥${user.coins.toLocaleString()}*`)
    if ((rival.coins || 0) < apuesta) return m.reply(`🚫 Tu rival no tiene suficientes ${monedas} para esa apuesta.`)

    // Verificar duelo existente
    if (global.duelos[m.chat]) {
      return m.reply('⚠️ Ya hay un duelo pendiente en este grupo. Espera a que termine.')
    }

    // Crear duelo
    const userName = user.name || m.pushName || userId.split('@')[0]
    const rivalName = rival.name || rivalId.split('@')[0]

    global.duelos[m.chat] = {
      retador: userName,
      retadorId: userId,
      rival: rivalName,
      rivalId: rivalId,
      apuesta: apuesta,
      timestamp: Date.now()
    }

    // Auto-cancelar después de 2 minutos
    setTimeout(() => {
      if (global.duelos[m.chat]?.timestamp === global.duelos[m.chat]?.timestamp) {
        delete global.duelos[m.chat]
      }
    }, 2 * 60 * 1000)

    const msg = `⚔️ *¡DESAFÍO A DUELO!*

> 🗡️ *${userName}* desafía a *@${rivalId.split('@')[0]}*
> 💰 Apuesta: *¥${apuesta.toLocaleString()} ${monedas}*
> ⏱️ Expira en: *2 minutos*

@${rivalId.split('@')[0]}, escribe:
> *${usedPrefix}${command} aceptar* para pelear
> *${usedPrefix}${command} rechazar* para huir 🏃`

    await client.sendMessage(m.chat, { text: msg, mentions: [rivalId, userId] }, { quoted: m })
  }
}
