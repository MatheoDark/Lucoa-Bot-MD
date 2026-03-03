import { resolveLidToRealJid } from '../../lib/utils.js'
import { getWorkBonus, getExploreBonus, getXpBonus, tryDoubleReward } from './skills.js'
import { getClassBonus, getClassName, getClassEmoji } from './class.js'
import { getRPGImage } from '../../lib/rpgImages.js'

// ═══════════════════════════════════════════════════════════════════════
//  ⚔️ ARENA PvE — Gasta XP como "energía" para luchar contra monstruos
//  Cada pelea es una secuencia narrativa con decisiones aleatorias.
//  Mayor nivel de entrada = mejores recompensas.
//  Cooldown: 15 minutos
// ═══════════════════════════════════════════════════════════════════════

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ── MONSTRUOS POR TIER ──
const MONSTRUOS = {
  facil: [
    { nombre: 'Slime Verde', emoji: '🟢', hp: 30, atk: 5, lore: 'Un slime tembloroso te mira con curiosidad' },
    { nombre: 'Goblin Ladrón', emoji: '👺', hp: 40, atk: 8, lore: 'Un goblin salta desde los arbustos con un cuchillo oxidado' },
    { nombre: 'Esqueleto Errante', emoji: '💀', hp: 35, atk: 7, lore: 'Los huesos crujen mientras se pone en guardia' },
    { nombre: 'Lobo Sombra', emoji: '🐺', hp: 45, atk: 10, lore: 'Un lobo oscuro gruñe mostrando sus colmillos' },
    { nombre: 'Araña Venenosa', emoji: '🕷️', hp: 25, atk: 12, lore: 'Una araña gigante desciende del techo de la cueva' },
  ],
  medio: [
    { nombre: 'Minotauro', emoji: '🐂', hp: 80, atk: 18, lore: 'El suelo tiembla con cada paso del Minotauro' },
    { nombre: 'Liche Oscuro', emoji: '🧙‍♂️', hp: 60, atk: 22, lore: 'Una figura encapuchada canaliza energía negra' },
    { nombre: 'Gárgola de Piedra', emoji: '🗿', hp: 100, atk: 15, lore: 'La estatua cobra vida con un rugido atronador' },
    { nombre: 'Hidra Menor', emoji: '🐍', hp: 70, atk: 20, lore: 'Tres cabezas serpentinas te observan con hambre' },
    { nombre: 'Caballero Fantasma', emoji: '👻', hp: 75, atk: 19, lore: 'Un guerrero espectral alza su espada brillante' },
  ],
  dificil: [
    { nombre: 'Dragón Rojo', emoji: '🐉', hp: 150, atk: 35, lore: 'El Dragón Rojo escupe una columna de fuego devastadora' },
    { nombre: 'Demonio Ancestral', emoji: '👿', hp: 130, atk: 40, lore: 'El aire se enrarece ante la presencia demoníaca' },
    { nombre: 'Titán de Hielo', emoji: '🧊', hp: 180, atk: 30, lore: 'Un gigante de hielo eterno aparece entre la ventisca' },
    { nombre: 'Fénix Corrupto', emoji: '🔥', hp: 120, atk: 45, lore: 'Un pájaro de fuego negro y púrpura desciende del cielo' },
    { nombre: 'Kraken Abismal', emoji: '🦑', hp: 200, atk: 28, lore: 'Tentáculos enormes emergen de las profundidades' },
  ],
  legendario: [
    { nombre: 'Rey Demonio Azgaroth', emoji: '😈', hp: 300, atk: 55, lore: '¡¡El cielo se tiñe de rojo!! Azgaroth, el Rey Demonio, ha despertado' },
    { nombre: 'Dragón Celestial Lunaris', emoji: '🌙', hp: 350, atk: 50, lore: 'Lunaris, la Dragona de la Luna, desciende envuelta en luz plateada' },
    { nombre: 'Leviatán del Vacío', emoji: '🌀', hp: 400, atk: 45, lore: 'El espacio-tiempo se distorsiona. El Leviatán emerge del vacío' },
  ]
}

// ── ATAQUES DEL JUGADOR ──
const ATAQUES_JUGADOR = [
  { nombre: 'Espadazo Veloz', emoji: '⚔️', dmgMin: 8, dmgMax: 20, narr: 'cargas y lanzas un corte rápido' },
  { nombre: 'Flecha Certera', emoji: '🏹', dmgMin: 10, dmgMax: 25, narr: 'apuntas con precisión y disparas' },
  { nombre: 'Hechizo de Fuego', emoji: '🔥', dmgMin: 12, dmgMax: 30, narr: 'canalizas una bola de fuego' },
  { nombre: 'Golpe de Martillo', emoji: '🔨', dmgMin: 15, dmgMax: 35, narr: 'descargas un golpe devastador' },
  { nombre: 'Rayo Arcano', emoji: '⚡', dmgMin: 10, dmgMax: 28, narr: 'invocas un rayo del cielo' },
  { nombre: 'Corte Sombrío', emoji: '🌑', dmgMin: 13, dmgMax: 32, narr: 'atacas desde las sombras' },
  { nombre: 'Golpe de Ki', emoji: '💫', dmgMin: 11, dmgMax: 27, narr: 'liberas tu energía interior' },
]

// ── EVENTOS ESPECIALES EN COMBATE ──
const EVENTOS = [
  { tipo: 'critico', emoji: '💥', texto: '¡¡GOLPE CRÍTICO!! Daño x2', mult: 2 },
  { tipo: 'esquivar', emoji: '💨', texto: '¡Esquivaste el ataque enemigo!', mult: 0 },
  { tipo: 'contraataque', emoji: '🔄', texto: '¡Contraatacas rápidamente! Ataque doble', mult: 1.5 },
  { tipo: 'curar', emoji: '💚', texto: '¡Encuentras una poción y te curas!', heal: 20 },
  { tipo: 'nada', emoji: '', texto: '', mult: 1 },
]

// ── TIERS CON COSTOS Y RECOMPENSAS ──
const TIERS = {
  facil:      { label: '🟢 Fácil',       costoXP: 300,   coinsMin: 3000,   coinsMax: 12000,  expMin: 200,   expMax: 600,   winChance: 0.75 },
  medio:      { label: '🟡 Medio',       costoXP: 800,   coinsMin: 8000,   coinsMax: 30000,  expMin: 500,   expMax: 1500,  winChance: 0.55 },
  dificil:    { label: '🔴 Difícil',     costoXP: 2000,  coinsMin: 20000,  coinsMax: 70000,  expMin: 1200,  expMax: 4000,  winChance: 0.35 },
  legendario: { label: '🟣 Legendario',  costoXP: 5000,  coinsMin: 50000,  coinsMax: 200000, expMin: 3000,  expMax: 10000, winChance: 0.18 },
}

// ── IMÁGENES DE RESULTADO (dinámicas via rpgImages.js) ──

function msToTime(ms) {
  const min = Math.floor((ms / (1000 * 60)) % 60)
  const sec = Math.floor((ms / 1000) % 60)
  return `${min}m ${sec}s`
}

export default {
  command: ['arena', 'battle', 'batalla', 'pelear', 'boss'],
  category: 'rpg',
  run: async ({ client, m, args, usedPrefix, command }) => {
    if (!m.isGroup) return m.reply('🐲 Solo en grupos (◕ᴗ◕✿)')

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) return m.reply('🐉 La economía está dormida zzZ')

    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const monedas = settings.currency || 'monedas'

    const userId = await resolveLidToRealJid(m.sender, client, m.chat)
    let user = global.db.data.users[userId]
    if (!user) {
      global.db.data.users[userId] = { coins: 0, exp: 0, level: 0, arenaWins: 0, arenaLosses: 0, arenaStreak: 0, arenaBestStreak: 0 }
      user = global.db.data.users[userId]
    }
    user.exp = user.exp || 0
    user.arenaWins = user.arenaWins || 0
    user.arenaLosses = user.arenaLosses || 0
    user.arenaStreak = user.arenaStreak || 0
    user.arenaBestStreak = user.arenaBestStreak || 0
    user.arenaCooldown = user.arenaCooldown || 0

    const tierId = (args[0] || '').toLowerCase()

    // ══════════════════════════════
    //  SUBCOMANDO: Stats
    // ══════════════════════════════
    if (tierId === 'stats' || tierId === 'estadisticas') {
      const winRate = (user.arenaWins + user.arenaLosses) > 0 
        ? ((user.arenaWins / (user.arenaWins + user.arenaLosses)) * 100).toFixed(1)
        : '0.0'

      const clase = getClassName(user)
      const claseEmoji = getClassEmoji(user)

      const txt = `╭─── ⋆🐉⋆ ───
│ ⚔️ *ESTADÍSTICAS DE ARENA*
├───────────────
│ 👤 ${m.pushName || 'Guerrero'}
│ ${claseEmoji} Clase: *${clase}*
│ 
│ 🏆 Victorias: *${user.arenaWins}*
│ 💀 Derrotas: *${user.arenaLosses}*
│ 📊 Win Rate: *${winRate}%*
│ 
│ 🔥 Racha actual: *${user.arenaStreak}*
│ ⭐ Mejor racha: *${user.arenaBestStreak}*
│ 
│ ✨ XP disponible: *${user.exp.toLocaleString()}*
╰─── ⋆✨⋆ ───`
      return client.sendMessage(m.chat, { text: txt }, { quoted: m })
    }

    // ══════════════════════════════
    //  SIN TIER → MOSTRAR MENÚ
    // ══════════════════════════════
    if (!tierId || !TIERS[tierId]) {
      let txt = `╭─── ⋆🐉⋆ ───
│ ⚔️ *ARENA DE COMBATE*
│ _Gasta XP para luchar contra monstruos_
│ _y ganar monedas + XP extra_
│ ✨ Tu XP: *${user.exp.toLocaleString()}*
├───────────────\n`

      for (const [id, t] of Object.entries(TIERS)) {
        const monster = pickRandom(MONSTRUOS[id])
        const asequible = user.exp >= t.costoXP ? '✅' : '🔒'
        txt += `│\n│ ${asequible} ${t.label}\n`
        txt += `│  ⚡ Costo: *${t.costoXP.toLocaleString()} XP*\n`
        txt += `│  💰 Recompensa: *${t.coinsMin.toLocaleString()}-${t.coinsMax.toLocaleString()}*\n`
        txt += `│  🎯 Prob. victoria: *${Math.round(t.winChance * 100)}%*\n`
      }

      txt += `│
├───────────────
│ ❀ *${usedPrefix}${command} <tier>*
│ ❀ *${usedPrefix}${command} stats*
│ Tiers: facil, medio, dificil, legendario
╰─── ⋆✨⋆ ───`

      return client.sendMessage(m.chat, { text: txt }, { quoted: m })
    }

    // ══════════════════════════════
    //  COMBATE
    // ══════════════════════════════
    const tier = TIERS[tierId]
    
    // Cooldown
    const cooldown = 15 * 60 * 1000
    const remaining = user.arenaCooldown - Date.now()
    if (remaining > 0) {
      return m.reply(`🐲 La arena está cerrada para ti. Espera *${msToTime(remaining)}* (◕︿◕)`)
    }

    // Verificar XP
    if (user.exp < tier.costoXP) {
      return m.reply(`╭─── ⋆🐉⋆ ───\n│ ❌ *XP INSUFICIENTE*\n├───────────────\n│ Tier: ${tier.label}\n│ Costo: *${tier.costoXP.toLocaleString()} XP*\n│ Tu XP: *${user.exp.toLocaleString()}*\n│ Faltan: *${(tier.costoXP - user.exp).toLocaleString()} XP*\n╰─── ⋆✨⋆ ───`)
    }

    // COBRAR XP
    user.exp -= tier.costoXP
    user.arenaCooldown = Date.now() + cooldown

    // Elegir monstruo
    const monster = pickRandom(MONSTRUOS[tierId])

    // Bonus de clase
    const arenaBonus = getClassBonus(user, 'arenaBonus') || 0
    const effectiveWinChance = Math.min(tier.winChance + arenaBonus, 0.90)

    // Simular combate narrativo
    let playerHP = 100
    let monsterHP = monster.hp
    let rondas = []
    let rondaNum = 0
    const maxRondas = 6

    while (playerHP > 0 && monsterHP > 0 && rondaNum < maxRondas) {
      rondaNum++
      const ataque = pickRandom(ATAQUES_JUGADOR)
      
      // Evento aleatorio (20% de chance)
      let evento = EVENTOS[EVENTOS.length - 1] // nada por defecto
      if (Math.random() < 0.20) {
        evento = pickRandom(EVENTOS.slice(0, -1))
      }

      let dmgJugador = randomInt(ataque.dmgMin, ataque.dmgMax)
      let dmgMonstruo = randomInt(Math.floor(monster.atk * 0.5), monster.atk)

      // Aplicar evento
      if (evento.tipo === 'critico') dmgJugador *= 2
      if (evento.tipo === 'contraataque') dmgJugador = Math.floor(dmgJugador * 1.5)
      if (evento.tipo === 'esquivar') dmgMonstruo = 0
      if (evento.tipo === 'curar') playerHP = Math.min(100, playerHP + evento.heal)

      monsterHP -= dmgJugador
      playerHP -= dmgMonstruo

      let rondaTxt = `│ ⚔️ R${rondaNum}: ${ataque.emoji} ${ataque.narr} → *${dmgJugador} dmg*`
      if (dmgMonstruo > 0) rondaTxt += `\n│    ${monster.emoji} te golpea → *${dmgMonstruo} dmg*`
      if (evento.tipo !== 'nada') rondaTxt += `\n│    ${evento.emoji} ${evento.texto}`

      rondas.push(rondaTxt)
    }

    // Determinar resultado (con influencia del azar ponderado)
    const victoria = Math.random() < effectiveWinChance

    let resultadoMsg
    let recompensaCoins = 0
    let recompensaExp = 0

    if (victoria) {
      recompensaCoins = randomInt(tier.coinsMin, tier.coinsMax)
      recompensaExp = randomInt(tier.expMin, tier.expMax)

      // Aplicar bonos de skills
      const workMult = getWorkBonus(user)
      const exploreMult = getExploreBonus(user)
      const xpMult = getXpBonus(user)
      const avgMult = (workMult + exploreMult) / 2
      
      recompensaCoins = Math.floor(recompensaCoins * avgMult)
      recompensaExp = Math.floor(recompensaExp * xpMult)

      // Bonus de racha
      user.arenaStreak = (user.arenaStreak || 0) + 1
      if (user.arenaStreak > user.arenaBestStreak) user.arenaBestStreak = user.arenaStreak

      let streakBonus = 0
      if (user.arenaStreak >= 3) {
        streakBonus = Math.floor(recompensaCoins * 0.1 * Math.min(user.arenaStreak, 10))
        recompensaCoins += streakBonus
      }

      // Aura mística (duplicar)
      const doubleResult = tryDoubleReward(user, recompensaCoins)
      recompensaCoins = doubleResult.amount

      user.coins = (user.coins || 0) + recompensaCoins
      user.exp += recompensaExp
      user.arenaWins++

      resultadoMsg = `│ 🎉 *¡¡VICTORIA!!*
│ 
│ 💰 Monedas: *+${recompensaCoins.toLocaleString()} ${monedas}*
│ ✨ XP: *+${recompensaExp.toLocaleString()}* (neto: +${(recompensaExp - tier.costoXP).toLocaleString()})
│ 🔥 Racha: *${user.arenaStreak}* ${user.arenaStreak >= 3 ? `(+${streakBonus.toLocaleString()} bonus)` : ''}
${doubleResult.doubled ? '│ 🔮 *¡¡AURA MÍSTICA: RECOMPENSA DUPLICADA!!*\n' : ''}`

    } else {
      // Derrota — pierde el XP invertido pero gana exp de consuelo
      const consolacion = Math.floor(tier.expMin * 0.2)
      user.exp += consolacion
      user.arenaStreak = 0
      user.arenaLosses++

      resultadoMsg = `│ 💀 *DERROTA...*
│ 
│ ❌ Perdiste *${tier.costoXP.toLocaleString()} XP* de entrada
│ 💫 Consuelo: *+${consolacion} XP*
│ 🔥 Racha reiniciada a 0`
    }

    // Construir mensaje narrativo completo
    const [monsterImg, resultImg] = await Promise.all([
      getRPGImage('monster', monster.nombre),
      getRPGImage(victoria ? 'victory' : 'defeat', `arena-${monster.nombre}`)
    ])
    
    const battleMsg = `╭─── ⋆🐉⋆ ───
│ ⚔️ *ARENA DE COMBATE* — ${tier.label}
├───────────────
│ ${monster.emoji} *${monster.nombre}*
│ _${monster.lore}_
│ ❤️ HP: ${monster.hp} | ⚔️ ATK: ${monster.atk}
├───────────────
│ 📖 *COMBATE*
│
${rondas.join('\n')}
│
├───────────────
${resultadoMsg}
│ 
│ 📊 Record: *${user.arenaWins}W / ${user.arenaLosses}L*
│ ⏱️ Próxima pelea en *15 minutos*
╰─── ⋆✨⋆ ───`

    // Enviar imagen del monstruo primero
    await client.sendMessage(m.chat, { 
      image: { url: monsterImg }, 
      caption: `${monster.emoji} *${monster.nombre}* aparece...\n_${monster.lore}_\n\n❤️ HP: *${monster.hp}* | ⚔️ ATK: *${monster.atk}*`
    }, { quoted: m })

    // Enviar resultado con imagen de victoria/derrota
    await client.sendMessage(m.chat, { 
      image: { url: resultImg },
      caption: battleMsg 
    }, { quoted: m })
  }
}
