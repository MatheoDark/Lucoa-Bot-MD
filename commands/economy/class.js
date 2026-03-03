import { resolveLidToRealJid } from '../../lib/utils.js'

// ═══════════════════════════════════════════════════════════════════════
//  🏛️ SISTEMA DE CLASES — Elige tu camino al alcanzar nivel 10
//  Cada clase da bonificaciones únicas y desbloquea una habilidad activa.
//  Se puede cambiar de clase por un costo de XP.
// ═══════════════════════════════════════════════════════════════════════

const CLASES = {
  guerrero: {
    nombre: '⚔️ Guerrero',
    emoji: '⚔️',
    desc: 'Maestro del combate cuerpo a cuerpo.',
    color: '🔴',
    lore: 'Entrenado en las forjas de la montaña, el Guerrero domina la espada y el escudo.',
    bonos: [
      '+20% monedas en duelos',
      '+15% daño en arena',
      '-10% pérdidas al ser robado',
      'Habilidad: *Golpe Crítico* — 15% de triplicar ganancias en work'
    ],
    statBonuses: { duelBonus: 0.20, arenaBonus: 0.15, robProtection: 0.10, critChance: 0.15 }
  },
  mago: {
    nombre: '🔮 Mago',
    emoji: '🔮',
    desc: 'Sabio dominador de las artes arcanas.',
    color: '🟣',
    lore: 'Estudió en la Academia Arcana durante siglos, canalizando el mana puro del universo.',
    bonos: [
      '+30% XP en todas las actividades',
      '+10% monedas en todas las actividades',
      'Doble recompensa en math/ahorcado',
      'Habilidad: *Transmutación* — 10% de convertir XP extra en monedas'
    ],
    statBonuses: { xpBonus: 0.30, coinBonus: 0.10, puzzleBonus: 2, transmuteChance: 0.10 }
  },
  explorador: {
    nombre: '🧭 Explorador',
    emoji: '🧭',
    desc: 'Aventurero incansable de tierras lejanas.',
    color: '🟢',
    lore: 'Ha recorrido cada rincón del mundo conocido y siempre encuentra tesoros donde nadie mira.',
    bonos: [
      '+25% loot en explorar, pescar y minar',
      '-20% cooldown en explorar',
      '+15% probabilidad de evento legendario',
      'Habilidad: *Sexto Sentido* — Evita trampas automáticamente (20%)'
    ],
    statBonuses: { lootBonus: 0.25, exploreCdReduce: 0.20, legendaryBonus: 0.15, trapDodge: 0.20 }
  },
  mercader: {
    nombre: '💎 Mercader',
    emoji: '💎',
    desc: 'Genio de los negocios y las finanzas.',
    color: '🟡',
    lore: 'Desde joven supo que el oro llama al oro. Su imperio financiero no tiene límites.',
    bonos: [
      '+35% monedas en work, mine y crime',
      '-15% cooldown en daily/weekly/monthly',
      '+10% interés diario en banco (hasta 5000)',
      'Habilidad: *Ojo del Tasador* — Ve el valor exacto antes de apostar'
    ],
    statBonuses: { workBonus: 0.35, claimCdReduce: 0.15, bankInterest: 0.10, maxInterest: 5000 }
  },
  asesino: {
    nombre: '🗡️ Asesino',
    emoji: '🗡️',
    desc: 'Sombra letal que actúa desde la oscuridad.',
    color: '⚫',
    lore: 'Nadie lo ve venir. El Asesino golpea rápido, roba todo y desaparece sin dejar rastro.',
    bonos: [
      '+40% éxito y botín al robar',
      '-25% cooldown en steal/crime',
      '+20% monedas en crime/slut',
      'Habilidad: *Golpe en la Sombra* — Doble robo (10% prob.)'
    ],
    statBonuses: { stealBonus: 0.40, crimeCdReduce: 0.25, crimeBonus: 0.20, doubleSteal: 0.10 }
  },
  apostador: {
    nombre: '🎰 Apostador',
    emoji: '🎰',
    desc: 'La suerte siempre está de su lado.',
    color: '🟠',
    lore: 'Nació bajo una estrella afortunada. Los dados, las cartas y la ruleta son su dominio.',
    bonos: [
      '+25% probabilidad de ganar en slots/ruleta',
      '+20% multiplicador en ganancias de apuestas',
      'Doble chance de jackpot en slots',
      'Habilidad: *Segunda Oportunidad* — Re-spin gratis en slots (15%)'
    ],
    statBonuses: { gamblingLuck: 0.25, gamblingMult: 0.20, jackpotDouble: true, respinChance: 0.15 }
  }
}

const NIVEL_REQUERIDO = 10
const COSTO_CAMBIO = 15000 // XP para cambiar de clase

export default {
  command: ['class', 'clase', 'classes', 'clases'],
  category: 'rpg',
  run: async ({ client, m, args, usedPrefix, command }) => {
    if (!m.isGroup) return m.reply('🐲 Solo en grupos (◕ᴗ◕✿)')

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) return m.reply('🐉 La economía está dormida zzZ')

    const userId = await resolveLidToRealJid(m.sender, client, m.chat)
    let user = global.db.data.users[userId]
    if (!user) {
      global.db.data.users[userId] = { coins: 0, exp: 0, level: 0 }
      user = global.db.data.users[userId]
    }
    user.exp = user.exp || 0
    user.level = user.level || 0

    const subCmd = (args[0] || '').toLowerCase()

    // ══════════════════════════════
    //  ELEGIR / CAMBIAR CLASE
    // ══════════════════════════════
    if (subCmd && CLASES[subCmd]) {
      if (user.level < NIVEL_REQUERIDO) {
        return m.reply(`╭─── ⋆🐉⋆ ───\n│ 🔒 *NIVEL INSUFICIENTE*\n├───────────────\n│ Necesitas nivel *${NIVEL_REQUERIDO}* para elegir clase.\n│ Tu nivel actual: *${user.level}*\n│ Sigue ganando XP con work, mine,\n│ explore, fish, etc.\n╰─── ⋆✨⋆ ───`)
      }

      const claseElegida = CLASES[subCmd]

      // Si ya tiene la misma clase
      if (user.class === subCmd) {
        return m.reply(`${claseElegida.emoji} Ya eres un *${claseElegida.nombre}* ✧`)
      }

      // Si ya tiene otra clase → cobrar cambio
      if (user.class && user.class !== subCmd) {
        if (user.exp < COSTO_CAMBIO) {
          return m.reply(`╭─── ⋆🐉⋆ ───\n│ ❌ *XP INSUFICIENTE*\n├───────────────\n│ Cambiar de clase cuesta *${COSTO_CAMBIO.toLocaleString()} XP*\n│ Tu XP: *${user.exp.toLocaleString()}*\n│ Faltan: *${(COSTO_CAMBIO - user.exp).toLocaleString()} XP*\n╰─── ⋆✨⋆ ───`)
        }
        user.exp -= COSTO_CAMBIO
      }

      const claseAnterior = user.class ? CLASES[user.class]?.nombre || 'Ninguna' : 'Ninguna'
      user.class = subCmd

      const msg = `╭─── ⋆🐉⋆ ───
│ 🏛️ *¡CLASE SELECCIONADA!*
├───────────────
│ ${claseAnterior !== 'Ninguna' ? `❀ Anterior: *${claseAnterior}*\n│ ` : ''}${claseElegida.emoji} *${claseElegida.nombre}*
│ 
│ _"${claseElegida.lore}"_
│
│ 🎯 *Bonificaciones:*
${claseElegida.bonos.map(b => `│  ✦ ${b}`).join('\n')}
│
│ ${user.class !== subCmd ? '' : `📊 XP restante: *${user.exp.toLocaleString()}*`}
╰─── ⋆✨⋆ ───`

      return client.sendMessage(m.chat, { text: msg }, { quoted: m })
    }

    // ══════════════════════════════
    //  INFO DE UNA CLASE ESPECÍFICA
    // ══════════════════════════════
    if (subCmd === 'info' && args[1]) {
      const claseId = args[1].toLowerCase()
      if (!CLASES[claseId]) {
        return m.reply(`❌ Clase no encontrada. Clases: ${Object.keys(CLASES).join(', ')}`)
      }
      const c = CLASES[claseId]
      const esActual = user.class === claseId

      const txt = `╭─── ⋆🐉⋆ ───
│ ${c.emoji} *${c.nombre}* ${esActual ? '← TU CLASE' : ''}
│ ${c.color} _${c.desc}_
├───────────────
│ 📜 _"${c.lore}"_
│
│ 🎯 *Bonificaciones:*
${c.bonos.map(b => `│  ✦ ${b}`).join('\n')}
│
│ ${esActual ? '✅ *Esta es tu clase actual*' : `❀ Para elegirla: *${usedPrefix}${command} ${claseId}*`}
╰─── ⋆✨⋆ ───`

      return client.sendMessage(m.chat, { text: txt }, { quoted: m })
    }

    // ══════════════════════════════
    //  VISTA PRINCIPAL: Todas las clases
    // ══════════════════════════════
    const claseActual = user.class ? CLASES[user.class] : null
    const bloqueado = user.level < NIVEL_REQUERIDO

    let txt = `╭─── ⋆🐉⋆ ───
│ 🏛️ *SISTEMA DE CLASES*
│ ${bloqueado ? `🔒 Desbloqueo: Nivel *${NIVEL_REQUERIDO}* (Actual: ${user.level})` : `✅ Desbloqueado | Nivel ${user.level}`}
│ ${claseActual ? `Tu clase: ${claseActual.emoji} *${claseActual.nombre}*` : '❀ Sin clase seleccionada'}
├───────────────\n`

    for (const [id, c] of Object.entries(CLASES)) {
      const esActual = user.class === id
      txt += `│\n│ ${esActual ? '▸' : '▹'} ${c.emoji} *${c.nombre}* ${esActual ? '✧' : ''}\n`
      txt += `│   _${c.desc}_\n`
      txt += `│   Destacado: ${c.bonos[0]}\n`
    }

    txt += `│
├───────────────
│ ❀ *${usedPrefix}${command} <clase>* — Elegir clase
│ ❀ *${usedPrefix}${command} info <clase>* — Ver detalles
│ ${user.class ? `❀ Cambiar clase cuesta *${COSTO_CAMBIO.toLocaleString()} XP*` : ''}
│
│ Clases: guerrero, mago, explorador,
│ mercader, asesino, apostador
╰─── ⋆✨⋆ ───`

    await client.sendMessage(m.chat, { text: txt }, { quoted: m })
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  FUNCIONES EXPORTADAS — Para usar en otros comandos
// ═══════════════════════════════════════════════════════════════════════

export function getClassBonus(user, bonusType) {
  if (!user.class || !CLASES[user.class]) return 0
  return CLASES[user.class].statBonuses[bonusType] || 0
}

export function hasClass(user, classId) {
  return user.class === classId
}

export function getClassName(user) {
  if (!user.class || !CLASES[user.class]) return 'Sin clase'
  return CLASES[user.class].nombre
}

export function getClassEmoji(user) {
  if (!user.class || !CLASES[user.class]) return '❓'
  return CLASES[user.class].emoji
}
