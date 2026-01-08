const onlyDigits = (s = '') => String(s).replace(/\D/g, '')

function ensureJid(x) {
  if (!x) return null
  const s = String(x)
  if (s.includes('@')) return s
  const n = onlyDigits(s)
  return n ? `${n}@s.whatsapp.net` : null
}

export default {
  command: ['delname', 'delalias', 'unsetname'],
  category: 'utils',
  run: async ({ client, m, usedPrefix, command }) => {
    const db = global.db?.data
    if (!db?.users) return m.reply('❌ DB no inicializada.')

    const target = (m.mentionedJid && m.mentionedJid[0]) ? m.mentionedJid[0] : null
    if (!target) {
      return m.reply(`📌 Uso: *${usedPrefix || '#'}${command}* @usuario`)
    }

    const jid = ensureJid(target)
    if (!jid || !db.users[jid]) return m.reply('⚠️ No había nombre guardado.')

    delete db.users[jid].name
    return m.reply(`✅ Listo. Borré el nombre guardado para *@${jid.split('@')[0]}*.`)
  }
}
