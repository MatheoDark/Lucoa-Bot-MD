import { resolveLidToRealJid } from '../../lib/utils.js'
import { getClassName, getClassEmoji } from './class.js'

// ═══════════════════════════════════════════════════════════════════════
//  🌟 PRESTIGE — Reinicia tu nivel a cambio de bonos permanentes
//  Requisito: Nivel 50+ y gastar TODA tu XP
//  Cada prestige da +5% bonus permanente a monedas y XP
//  Tu nivel vuelve a 0 pero tus skills, clase y monedas se mantienen
//  Máximo: Prestige 10 (★★★★★★★★★★)
// ═══════════════════════════════════════════════════════════════════════

const NIVEL_MINIMO = 50
const MAX_PRESTIGE = 10
const BONUS_POR_PRESTIGE = 0.05 // +5% por cada prestige

const TITULOS_PRESTIGE = [
  '⭐ Novato Renacido',
  '⭐⭐ Veterano',
  '⭐⭐⭐ Experto',
  '🌟🌟🌟🌟 Maestro',
  '🌟🌟🌟🌟🌟 Gran Maestro',
  '💫💫💫💫💫💫 Leyenda',
  '✨✨✨✨✨✨✨ Mítico',
  '👑👑👑👑👑👑👑👑 Ascendido',
  '🔱🔱🔱🔱🔱🔱🔱🔱🔱 Divino',
  '🐉🐉🐉🐉🐉🐉🐉🐉🐉🐉 Dragón Ancestral',
]

function progressBar(current, max, length = 10) {
  const filled = Math.round((current / max) * length)
  return '█'.repeat(filled) + '░'.repeat(length - filled)
}

export default {
  command: ['prestige', 'prestigio', 'rebirth', 'renacer'],
  category: 'rpg',
  run: async ({ client, m, args, usedPrefix, command }) => {
    if (!m.isGroup) return m.reply('🐲 Solo en grupos (◕ᴗ◕✿)')

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) return m.reply('🐉 La economía está dormida zzZ')

    const userId = await resolveLidToRealJid(m.sender, client, m.chat)
    let user = global.db.data.users[userId]
    if (!user) {
      global.db.data.users[userId] = { coins: 0, exp: 0, level: 0, prestige: 0 }
      user = global.db.data.users[userId]
    }
    user.prestige = user.prestige || 0
    user.level = user.level || 0
    user.exp = user.exp || 0

    const subCmd = (args[0] || '').toLowerCase()

    // ══════════════════════════════
    //  CONFIRMAR PRESTIGE
    // ══════════════════════════════
    if (subCmd === 'confirmar' || subCmd === 'confirm' || subCmd === 'si') {
      if (user.prestige >= MAX_PRESTIGE) {
        return m.reply(`🐉 Ya alcanzaste el Prestige máximo (${MAX_PRESTIGE}). ¡Eres una leyenda! ✧`)
      }

      if (user.level < NIVEL_MINIMO) {
        return m.reply(`╭─── ⋆🐉⋆ ───\n│ 🔒 *NIVEL INSUFICIENTE*\n├───────────────\n│ Necesitas nivel *${NIVEL_MINIMO}* para hacer Prestige\n│ Tu nivel actual: *${user.level}*\n│ Te faltan *${NIVEL_MINIMO - user.level}* niveles\n╰─── ⋆✨⋆ ───`)
      }

      // EJECUTAR PRESTIGE
      const prestigeAnterior = user.prestige
      user.prestige += 1
      user.level = 0
      user.exp = 0

      const titulo = TITULOS_PRESTIGE[user.prestige - 1] || '🐉 ???'
      const bonusTotal = (user.prestige * BONUS_POR_PRESTIGE * 100).toFixed(0)

      const msg = `╭─── ⋆🐉⋆ ───
│ 🌟 *¡¡¡PRESTIGE ${user.prestige}!!!*
├───────────────
│ 
│ ✧ *Tu alma ha sido forjada de nuevo* ✧
│ 
│ El fuego ancestral consumió tu experiencia
│ y la transformó en poder puro...
│ 
│ 📜 Título: *${titulo}*
│ 
│ 📊 *Cambios:*
│  ✦ Nivel: *${NIVEL_MINIMO}* → *0* (reiniciado)
│  ✦ XP: → *0* (consumida)
│  ✦ Monedas: *Sin cambio* ✅
│  ✦ Skills: *Sin cambio* ✅
│  ✦ Clase: *Sin cambio* ✅
│ 
│ 🎯 *Bonus Permanente:*
│  ✦ +*${bonusTotal}%* monedas en TODO
│  ✦ +*${bonusTotal}%* XP en TODO
│  ✦ Título exclusivo de Prestige
│ 
│ ${user.prestige < MAX_PRESTIGE ? `❀ Siguiente prestige: Nivel *${NIVEL_MINIMO}* de nuevo` : '🏆 *¡PRESTIGE MÁXIMO ALCANZADO!*'}
│ 
│ ⭐ Prestige: ${progressBar(user.prestige, MAX_PRESTIGE)} *${user.prestige}/${MAX_PRESTIGE}*
╰─── ⋆✨⋆ ───`

      return client.sendMessage(m.chat, { text: msg }, { quoted: m })
    }

    // ══════════════════════════════
    //  VISTA PRINCIPAL
    // ══════════════════════════════
    const bonusActual = (user.prestige * BONUS_POR_PRESTIGE * 100).toFixed(0)
    const bonusSiguiente = ((user.prestige + 1) * BONUS_POR_PRESTIGE * 100).toFixed(0)
    const tituloActual = user.prestige > 0 ? TITULOS_PRESTIGE[user.prestige - 1] : 'Sin prestige'
    const clase = getClassName(user)
    const claseEmoji = getClassEmoji(user)
    const puedePrestige = user.level >= NIVEL_MINIMO && user.prestige < MAX_PRESTIGE

    let txt = `╭─── ⋆🐉⋆ ───
│ 🌟 *SISTEMA DE PRESTIGE*
│ _Renacer con poder permanente_
├───────────────
│ 👤 *${m.pushName || 'Guerrero'}*
│ ${claseEmoji} Clase: *${clase}*
│ ✨ Nivel: *${user.level}* | XP: *${user.exp.toLocaleString()}*
│ 
│ ⭐ Prestige actual: *${user.prestige}/${MAX_PRESTIGE}*
│ ${progressBar(user.prestige, MAX_PRESTIGE)}
│ 📜 Título: *${tituloActual}*
│ 
│ 🎯 Bonus actual: *+${bonusActual}%* monedas y XP
${user.prestige < MAX_PRESTIGE ? `│ 🆙 Siguiente: *+${bonusSiguiente}%* monedas y XP` : '│ 🏆 *¡MÁXIMO ALCANZADO!*'}
├───────────────
│ 📋 *Requisitos para Prestige:*
│  ${user.level >= NIVEL_MINIMO ? '✅' : '❌'} Nivel *${NIVEL_MINIMO}+* (actual: ${user.level})
│  ${user.prestige < MAX_PRESTIGE ? '✅' : '❌'} No estar en prestige max
│ 
│ ⚠️ *Se reinicia:* Nivel y XP
│ ✅ *Se mantiene:* Monedas, skills, clase, harem
│ 
│ ${puedePrestige ? `🔥 *¡LISTO!* Usa *${usedPrefix}${command} confirmar*` : `🔒 *Aún no cumples los requisitos*`}
╰─── ⋆✨⋆ ───`

    await client.sendMessage(m.chat, { text: txt }, { quoted: m })
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  FUNCIONES EXPORTADAS
// ═══════════════════════════════════════════════════════════════════════

/** Obtiene el multiplicador de prestige para monedas/XP */
export function getPrestigeMultiplier(user) {
  const prestige = user.prestige || 0
  return 1 + (prestige * BONUS_POR_PRESTIGE)
}

/** Obtiene el título de prestige */
export function getPrestigeTitle(user) {
  const prestige = user.prestige || 0
  if (prestige === 0) return ''
  return TITULOS_PRESTIGE[prestige - 1] || '🐉 ???'
}
