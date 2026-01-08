const onlyDigits = (s = '') => String(s).replace(/\D/g, '')

function ensureJid(x) {
    if (!x) return null
    const s = String(x)
    if (s.includes('@')) return s
    const n = onlyDigits(s)
    return n ? `${n}@s.whatsapp.net` : null
}

export default {
    command: ['delname', 'delalias', 'unreg'],
    category: 'utils',
    run: async ({ client, m, usedPrefix, command, isOwner, isAdmin }) => {
        const db = global.db?.data
        if (!db?.users) return m.reply('❌ DB no inicializada.')

        const target = (m.mentionedJid && m.mentionedJid[0]) ? m.mentionedJid[0] : null
        let jid

        if (target) {
            if (!isOwner && !isAdmin) return m.reply('❌ Solo Administradores pueden borrar nombres ajenos.')
            jid = ensureJid(target)
        } else {
            // Borrar mi propio nombre
            jid = m.sender
        }

        if (!db.users[jid] || !db.users[jid].name) {
            return m.reply('⚠️ Este usuario no tiene un nombre personalizado guardado.')
        }

        // Borramos el nombre personalizado
        delete db.users[jid].name
        
        // Opcional: Si quieres reiniciar todo el usuario usa: delete db.users[jid]
        
        return m.reply(`✅ *Nombre eliminado.*\nAhora el bot usará el nombre de WhatsApp de @${jid.split('@')[0]}`, {
            mentions: [jid]
        })
    }
}
