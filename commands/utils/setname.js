const onlyDigits = (s = '') => String(s).replace(/\D/g, '')

function ensureJid(x) {
  if (!x) return null
  const s = String(x)
  if (s.includes('@')) return s
  const n = onlyDigits(s)
  return n ? `${n}@s.whatsapp.net` : null
}

export default {
  command: ['setname', 'setnombre', 'alias', 'setalias'],
  category: 'utils',
  run: async ({ client, m, args, usedPrefix, command }) => {
    const db = global.db?.data
    if (!db?.users) return m.reply('❌ DB no inicializada.')

    const target = (m.mentionedJid && m.mentionedJid[0]) ? m.mentionedJid[0] : null
    const name = args.slice(target ? 1 : 0).join(' ').trim()

    if (!target) {
      return m.reply(
        `📌 Uso:\n` +
        `• *${usedPrefix || '#'}${command}* @usuario Nombre\n` +
        `Ej: *${usedPrefix || '#'}${command}* @Cristina Cristina C`
      )
    }

    if (!name) return m.reply('📌 Te faltó el nombre para guardar.')

    const jid = ensureJid(target)
    if (!jid) return m.reply('❌ No pude identificar el usuario.')

    db.users[jid] = db.users[jid] || {}
    db.users[jid].name = name

    return m.reply(`✅ Listo. Guardé el nombre de *@${jid.split('@')[0]}* como: *${name}*`)
  }
}
