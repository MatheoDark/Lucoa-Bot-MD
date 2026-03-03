import { resolveLidToRealJid } from '../../lib/utils.js'
import { getRPGImage } from '../../lib/rpgImages.js'

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

// ═══════════════════════════════════════════════════════════════════════
//  🌳 ÁRBOL DE HABILIDADES — Gasta XP para mejorar habilidades pasivas
//  Cada habilidad tiene 5 niveles con costos y bonos crecientes.
//  Las habilidades dan ventajas reales en la economía del bot.
// ═══════════════════════════════════════════════════════════════════════

const SKILL_TREE = {
  // ── 💰 RAMA: COMERCIANTE ──
  mercader: {
    nombre: '💰 Instinto Mercader',
    desc: 'Ganas más monedas al trabajar',
    rama: 'Comerciante',
    emoji: '💰',
    niveles: [
      { costo: 500,   bono: '+5% monedas en work/mine' },
      { costo: 1500,  bono: '+12% monedas en work/mine' },
      { costo: 4000,  bono: '+20% monedas en work/mine' },
      { costo: 10000, bono: '+30% monedas en work/mine' },
      { costo: 25000, bono: '+50% monedas en work/mine' },
    ],
    multiplicadores: [1.05, 1.12, 1.20, 1.30, 1.50]
  },
  negociante: {
    nombre: '🤝 Negociante Nato',
    desc: 'Reduces el cooldown de daily/weekly/monthly',
    rama: 'Comerciante',
    emoji: '🤝',
    niveles: [
      { costo: 800,   bono: '-5% cooldown de recolecciones' },
      { costo: 2000,  bono: '-10% cooldown de recolecciones' },
      { costo: 5000,  bono: '-15% cooldown de recolecciones' },
      { costo: 12000, bono: '-22% cooldown de recolecciones' },
      { costo: 30000, bono: '-30% cooldown de recolecciones' },
    ],
    multiplicadores: [0.95, 0.90, 0.85, 0.78, 0.70]
  },

  // ── ⚔️ RAMA: GUERRERO ──
  fuerza: {
    nombre: '⚔️ Fuerza Bruta',
    desc: 'Más probabilidad de ganar duelos',
    rama: 'Guerrero',
    emoji: '⚔️',
    niveles: [
      { costo: 600,   bono: '+3% probabilidad de ganar duelos' },
      { costo: 2000,  bono: '+7% probabilidad de ganar duelos' },
      { costo: 5000,  bono: '+12% probabilidad de ganar duelos' },
      { costo: 12000, bono: '+18% probabilidad de ganar duelos' },
      { costo: 28000, bono: '+25% probabilidad de ganar duelos' },
    ],
    multiplicadores: [0.03, 0.07, 0.12, 0.18, 0.25]
  },
  ladron: {
    nombre: '🗡️ Manos Rápidas',
    desc: 'Más éxito al robar y más botín',
    rama: 'Guerrero',
    emoji: '🗡️',
    niveles: [
      { costo: 700,   bono: '+5% éxito + botín al robar' },
      { costo: 1800,  bono: '+10% éxito + botín al robar' },
      { costo: 4500,  bono: '+18% éxito + botín al robar' },
      { costo: 11000, bono: '+25% éxito + botín al robar' },
      { costo: 26000, bono: '+35% éxito + botín al robar' },
    ],
    multiplicadores: [0.05, 0.10, 0.18, 0.25, 0.35]
  },

  // ── 🍀 RAMA: EXPLORADOR ──
  rastreador: {
    nombre: '🍀 Ojo de Halcón',
    desc: 'Mejor loot al explorar y pescar',
    rama: 'Explorador',
    emoji: '🍀',
    niveles: [
      { costo: 600,   bono: '+8% loot en explorar/pescar' },
      { costo: 1500,  bono: '+15% loot en explorar/pescar' },
      { costo: 4000,  bono: '+25% loot en explorar/pescar' },
      { costo: 10000, bono: '+35% loot en explorar/pescar' },
      { costo: 24000, bono: '+50% loot en explorar/pescar' },
    ],
    multiplicadores: [1.08, 1.15, 1.25, 1.35, 1.50]
  },
  supervivencia: {
    nombre: '🛡️ Supervivencia',
    desc: 'Reduces las pérdidas por trampas al explorar',
    rama: 'Explorador',
    emoji: '🛡️',
    niveles: [
      { costo: 500,   bono: '-10% pérdidas por trampas' },
      { costo: 1200,  bono: '-20% pérdidas por trampas' },
      { costo: 3000,  bono: '-35% pérdidas por trampas' },
      { costo: 8000,  bono: '-50% pérdidas por trampas' },
      { costo: 20000, bono: '-70% pérdidas por trampas' },
    ],
    multiplicadores: [0.90, 0.80, 0.65, 0.50, 0.30]
  },

  // ── 🎲 RAMA: APOSTADOR ──
  suerte: {
    nombre: '🎲 Suerte Divina',
    desc: 'Mejor probabilidad en slots y ruleta',
    rama: 'Apostador',
    emoji: '🎲',
    niveles: [
      { costo: 800,   bono: '+3% probabilidad de ganar en apuestas' },
      { costo: 2500,  bono: '+6% probabilidad de ganar en apuestas' },
      { costo: 6000,  bono: '+10% probabilidad de ganar en apuestas' },
      { costo: 15000, bono: '+15% probabilidad de ganar en apuestas' },
      { costo: 35000, bono: '+22% probabilidad de ganar en apuestas' },
    ],
    multiplicadores: [0.03, 0.06, 0.10, 0.15, 0.22]
  },
  jackpot: {
    nombre: '🎰 Imán de Jackpot',
    desc: 'Multiplica las ganancias en juegos de azar',
    rama: 'Apostador',
    emoji: '🎰',
    niveles: [
      { costo: 1000,  bono: '+5% multiplicador en ganancias' },
      { costo: 3000,  bono: '+12% multiplicador en ganancias' },
      { costo: 7000,  bono: '+20% multiplicador en ganancias' },
      { costo: 18000, bono: '+30% multiplicador en ganancias' },
      { costo: 40000, bono: '+45% multiplicador en ganancias' },
    ],
    multiplicadores: [1.05, 1.12, 1.20, 1.30, 1.45]
  },

  // ── ✨ RAMA: MÍSTICO ──
  sabiduria: {
    nombre: '✨ Sabiduría Ancestral',
    desc: 'Ganas más XP en todas las actividades',
    rama: 'Místico',
    emoji: '✨',
    niveles: [
      { costo: 1000,  bono: '+10% XP en todo' },
      { costo: 3000,  bono: '+20% XP en todo' },
      { costo: 8000,  bono: '+35% XP en todo' },
      { costo: 20000, bono: '+50% XP en todo' },
      { costo: 50000, bono: '+75% XP en todo' },
    ],
    multiplicadores: [1.10, 1.20, 1.35, 1.50, 1.75]
  },
  aura: {
    nombre: '🔮 Aura Mística',
    desc: 'Probabilidad de duplicar cualquier recompensa',
    rama: 'Místico',
    emoji: '🔮',
    niveles: [
      { costo: 1200,  bono: '3% de duplicar recompensas' },
      { costo: 3500,  bono: '6% de duplicar recompensas' },
      { costo: 9000,  bono: '10% de duplicar recompensas' },
      { costo: 22000, bono: '15% de duplicar recompensas' },
      { costo: 55000, bono: '22% de duplicar recompensas' },
    ],
    multiplicadores: [0.03, 0.06, 0.10, 0.15, 0.22]
  },
}

// Nombres de ramas para mostrar
const RAMAS = {
  'Comerciante': { emoji: '💰', skills: ['mercader', 'negociante'] },
  'Guerrero':    { emoji: '⚔️', skills: ['fuerza', 'ladron'] },
  'Explorador':  { emoji: '🍀', skills: ['rastreador', 'supervivencia'] },
  'Apostador':   { emoji: '🎲', skills: ['suerte', 'jackpot'] },
  'Místico':     { emoji: '✨', skills: ['sabiduria', 'aura'] },
}

function getSkillLevel(user, skillId) {
  if (!user.skills) user.skills = {}
  return user.skills[skillId] || 0
}

function getSkillBonus(user, skillId) {
  const lvl = getSkillLevel(user, skillId)
  if (lvl === 0) return skillId === 'negociante' || skillId === 'supervivencia' ? 1 : (SKILL_TREE[skillId].multiplicadores[0] >= 1 ? 1 : 0)
  return SKILL_TREE[skillId].multiplicadores[lvl - 1]
}

// Barras de progreso visual
function progressBar(current, max, length = 5) {
  const filled = Math.round((current / max) * length)
  return '█'.repeat(filled) + '░'.repeat(length - filled)
}

export default {
  command: ['skills', 'habilidades', 'skilltree', 'arbol'],
  category: 'rpg',
  run: async ({ client, m, args, usedPrefix, command }) => {
    if (!m.isGroup) return m.reply('🐲 Solo en grupos (◕ᴗ◕✿)')

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) return m.reply('🐉 La economía está dormida zzZ')

    const userId = await resolveLidToRealJid(m.sender, client, m.chat)
    let user = global.db.data.users[userId]
    if (!user) {
      global.db.data.users[userId] = { coins: 0, exp: 0, skills: {} }
      user = global.db.data.users[userId]
    }
    user.skills = user.skills || {}
    user.exp = user.exp || 0

    const subCmd = (args[0] || '').toLowerCase()

    // ══════════════════════════════
    //  SUBCOMANDO: Mejorar skill
    // ══════════════════════════════
    if (subCmd === 'upgrade' || subCmd === 'mejorar' || subCmd === 'up') {
      const skillId = (args[1] || '').toLowerCase()
      
      if (!skillId || !SKILL_TREE[skillId]) {
        const lista = Object.entries(SKILL_TREE).map(([id, s]) => `  ${s.emoji} *${id}* — ${s.desc}`).join('\n')
        return m.reply(`╭─── ⋆🐉⋆ ───\n│ 📋 *HABILIDADES DISPONIBLES*\n├───────────────\n${lista}\n│\n│ ❀ Uso: *${usedPrefix}${command} upgrade <nombre>*\n│ ❀ Ej: *${usedPrefix}${command} upgrade mercader*\n╰─── ⋆✨⋆ ───`)
      }

      const skill = SKILL_TREE[skillId]
      const currentLvl = getSkillLevel(user, skillId)
      
      if (currentLvl >= 5) {
        return m.reply(`${skill.emoji} *${skill.nombre}* ya está al máximo (Nivel 5) ✧`)
      }

      const costo = skill.niveles[currentLvl].costo
      const nuevoNivel = currentLvl + 1
      const bono = skill.niveles[currentLvl].bono

      if (user.exp < costo) {
        return m.reply(`╭─── ⋆🐉⋆ ───\n│ ❌ *XP INSUFICIENTE*\n├───────────────\n│ ${skill.emoji} ${skill.nombre}\n│ Nivel actual: *${currentLvl}/5*\n│ Costo: *${costo.toLocaleString()} XP*\n│ Tu XP: *${user.exp.toLocaleString()} XP*\n│ Faltan: *${(costo - user.exp).toLocaleString()} XP*\n╰─── ⋆✨⋆ ───`)
      }

      // GASTAR XP
      user.exp -= costo
      user.skills[skillId] = nuevoNivel

      const msg = `╭─── ⋆🐉⋆ ───
│ ⬆️ *¡HABILIDAD MEJORADA!*
├───────────────
│ ${skill.emoji} *${skill.nombre}*
│ 
│ ${progressBar(currentLvl, 5)} → ${progressBar(nuevoNivel, 5)}
│ Nivel: *${currentLvl}* → *${nuevoNivel}* ✨
│ 
│ 🎯 Bono actual: *${bono}*
│ 💫 XP gastada: *-${costo.toLocaleString()}*
│ 📊 XP restante: *${user.exp.toLocaleString()}*
│
│ ${nuevoNivel === 5 ? '🏆 *¡NIVEL MÁXIMO ALCANZADO!*' : `❀ Siguiente nivel: *${skill.niveles[nuevoNivel]?.costo.toLocaleString()} XP*`}
╰─── ⋆✨⋆ ───`

      const upgradeImg = await getRPGImage('skill_upgrade', skillId)
      return client.sendMessage(m.chat, { 
        image: { url: upgradeImg },
        caption: msg 
      }, { quoted: m })
    }

    // ══════════════════════════════
    //  SUBCOMANDO: Info de una skill
    // ══════════════════════════════
    if (subCmd === 'info') {
      const skillId = (args[1] || '').toLowerCase()
      if (!skillId || !SKILL_TREE[skillId]) {
        return m.reply(`❀ Uso: *${usedPrefix}${command} info <nombre>*\nEjemplo: *${usedPrefix}${command} info mercader*`)
      }

      const skill = SKILL_TREE[skillId]
      const currentLvl = getSkillLevel(user, skillId)

      let detalle = `╭─── ⋆🐉⋆ ───\n│ ${skill.emoji} *${skill.nombre}*\n│ _${skill.desc}_\n│ Rama: *${skill.rama}*\n├───────────────\n`

      for (let i = 0; i < 5; i++) {
        const marker = i < currentLvl ? '✅' : (i === currentLvl ? '➡️' : '🔒')
        detalle += `│ ${marker} Nivel ${i + 1}: ${skill.niveles[i].bono} (${skill.niveles[i].costo.toLocaleString()} XP)\n`
      }

      detalle += `├───────────────\n│ 📊 Tu nivel: *${currentLvl}/5* ${progressBar(currentLvl, 5)}\n│ ✨ Tu XP: *${user.exp.toLocaleString()}*\n╰─── ⋆✨⋆ ───`
      
      const ramaImg = await getRPGImage('skill', skill.rama)
      return client.sendMessage(m.chat, { 
        image: { url: ramaImg },
        caption: detalle 
      }, { quoted: m })
    }

    // ══════════════════════════════
    //  VISTA PRINCIPAL: Árbol completo
    // ══════════════════════════════
    const totalSkillLvls = Object.keys(SKILL_TREE).reduce((sum, id) => sum + getSkillLevel(user, id), 0)
    const maxTotal = Object.keys(SKILL_TREE).length * 5

    let txt = `╭─── ⋆🐉⋆ ───
│ 🌳 *ÁRBOL DE HABILIDADES*
│ Progreso: *${totalSkillLvls}/${maxTotal}* ${progressBar(totalSkillLvls, maxTotal, 10)}
│ ✨ XP disponible: *${user.exp.toLocaleString()}*
├───────────────\n`

    for (const [ramaName, rama] of Object.entries(RAMAS)) {
      txt += `│\n│ ${rama.emoji} ── *${ramaName}* ──\n`
      for (const skillId of rama.skills) {
        const skill = SKILL_TREE[skillId]
        const lvl = getSkillLevel(user, skillId)
        const bar = progressBar(lvl, 5)
        const costoSig = lvl < 5 ? ` (${skill.niveles[lvl].costo.toLocaleString()} XP)` : ' ✧ MAX'
        txt += `│  ${skill.emoji} ${skill.nombre.split(' ').slice(1).join(' ')} [${lvl}/5] ${bar}${costoSig}\n`
      }
    }

    txt += `│
├───────────────
│ ❀ *${usedPrefix}${command} upgrade <skill>*
│ ❀ *${usedPrefix}${command} info <skill>*
│ 
│ Skills: mercader, negociante,
│ fuerza, ladron, rastreador,
│ supervivencia, suerte, jackpot,
│ sabiduria, aura
╰─── ⋆✨⋆ ───`

    const treeImg = await getRPGImage('skill', 'skill-tree')
    await client.sendMessage(m.chat, { 
      image: { url: treeImg },
      caption: txt 
    }, { quoted: m })
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  FUNCIONES EXPORTADAS — Para usar en otros comandos
// ═══════════════════════════════════════════════════════════════════════

/** Obtiene el multiplicador de monedas del trabajo (mercader) */
export function getWorkBonus(user) {
  const lvl = getSkillLevel(user, 'mercader')
  if (lvl === 0) return 1
  return SKILL_TREE.mercader.multiplicadores[lvl - 1]
}

/** Obtiene el multiplicador de cooldown (negociante) — menor = más rápido */
export function getCooldownReduction(user) {
  const lvl = getSkillLevel(user, 'negociante')
  if (lvl === 0) return 1
  return SKILL_TREE.negociante.multiplicadores[lvl - 1]
}

/** Obtiene el bonus de probabilidad en duelos (fuerza) */
export function getDuelBonus(user) {
  const lvl = getSkillLevel(user, 'fuerza')
  if (lvl === 0) return 0
  return SKILL_TREE.fuerza.multiplicadores[lvl - 1]
}

/** Obtiene el bonus para robar (ladron) */
export function getStealBonus(user) {
  const lvl = getSkillLevel(user, 'ladron')
  if (lvl === 0) return 0
  return SKILL_TREE.ladron.multiplicadores[lvl - 1]
}

/** Obtiene multiplicador de loot en explorar/pescar (rastreador) */
export function getExploreBonus(user) {
  const lvl = getSkillLevel(user, 'rastreador')
  if (lvl === 0) return 1
  return SKILL_TREE.rastreador.multiplicadores[lvl - 1]
}

/** Obtiene reducción de pérdidas en trampas (supervivencia) */
export function getTrapReduction(user) {
  const lvl = getSkillLevel(user, 'supervivencia')
  if (lvl === 0) return 1
  return SKILL_TREE.supervivencia.multiplicadores[lvl - 1]
}

/** Obtiene bonus de probabilidad en apuestas (suerte) */
export function getLuckBonus(user) {
  const lvl = getSkillLevel(user, 'suerte')
  if (lvl === 0) return 0
  return SKILL_TREE.suerte.multiplicadores[lvl - 1]
}

/** Obtiene multiplicador de ganancias en apuestas (jackpot) */
export function getJackpotBonus(user) {
  const lvl = getSkillLevel(user, 'jackpot')
  if (lvl === 0) return 1
  return SKILL_TREE.jackpot.multiplicadores[lvl - 1]
}

/** Obtiene multiplicador de XP (sabiduria) */
export function getXpBonus(user) {
  const lvl = getSkillLevel(user, 'sabiduria')
  if (lvl === 0) return 1
  return SKILL_TREE.sabiduria.multiplicadores[lvl - 1]
}

/** Obtiene probabilidad de duplicar recompensas (aura) */
export function getDoubleChance(user) {
  const lvl = getSkillLevel(user, 'aura')
  if (lvl === 0) return 0
  return SKILL_TREE.aura.multiplicadores[lvl - 1]
}

/** Verifica y aplica duplicación por Aura Mística. Retorna { doubled, amount } */
export function tryDoubleReward(user, amount) {
  const chance = getDoubleChance(user)
  if (chance > 0 && Math.random() < chance) {
    return { doubled: true, amount: amount * 2 }
  }
  return { doubled: false, amount }
}
