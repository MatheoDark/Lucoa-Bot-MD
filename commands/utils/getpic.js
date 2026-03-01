import { resolveLidToRealJid } from "../../lib/utils.js"

const FALLBACK_PP = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'

function getQuotedParticipant(m) {
  const msg = m?.message || {}
  const ctx =
    msg?.extendedTextMessage?.contextInfo ||
    msg?.imageMessage?.contextInfo ||
    msg?.videoMessage?.contextInfo ||
    msg?.documentMessage?.contextInfo ||
    null
  return ctx?.participant || null
}

export default {
  command: ['pfp', 'getpic'],
  category: 'utils',
  run: async ({ client, m, args, usedPrefix, command }) => {
    const mentioned = Array.isArray(m.mentionedJid) ? m.mentionedJid : []
    const firstArg = (args?.[0] || '').toLowerCase()

    const wantsMe = ['me', 'yo', 'mio', 'mía', 'mia', 'mí', 'mi'].includes(firstArg)

    const whoRaw =
      (wantsMe ? m.sender : null) ||
      mentioned[0] ||
      (m.quoted?.sender || m.quoted?.participant || m.quoted?.key?.participant || getQuotedParticipant(m)) ||
      null

    if (!whoRaw) {
      return m.reply(
        `🐲 Etiqueta, responde o usa *me* (◕ᴗ◕)\n\n` +
        `Ej:\n` +
        `• *${usedPrefix || '#'}${command || 'getpic'}* me\n` +
        `• *${usedPrefix || '#'}${command || 'getpic'}* @usuario\n` +
        `• Responda un mensaje + *${usedPrefix || '#'}${command || 'getpic'}*`
      )
    }

    // Resolver LID -> JID (sirve en grupos, en privado queda igual)
    const who = await resolveLidToRealJid(whoRaw, client, m.chat).catch(() => whoRaw)

    try {
      const img = await client.profilePictureUrl(who, 'image').catch(() => null)

      if (!img) {
        return client.sendMessage(
          m.chat,
          {
            image: { url: FALLBACK_PP },
            caption: `🐲 No pude obtener la foto de perfil de @${String(who).split('@')[0]} (╥﹏╥)`,
            mentions: [who],
          },
          { quoted: m }
        )
      }

      await client.sendMessage(
        m.chat,
        {
          image: { url: img },
          caption: `🐉 Foto de perfil de @${String(who).split('@')[0]} (◕ᴗ◕✿)`,
          mentions: [who],
        },
        { quoted: m }
      )
    } catch (e) {
      console.error('[getpic] error:', e?.message || e)
      await m.reply('🐲 Error al obtener la foto de perfil (╥﹏╥)')
    }
  },
}
