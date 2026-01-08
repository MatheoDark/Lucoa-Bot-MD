const onlyDigits = (s = '') => String(s).replace(/\D/g, '')

function ensureJid(x) {
    if (!x) return null
    const s = String(x)
    if (s.includes('@')) return s
    const n = onlyDigits(s)
    return n ? `${n}@s.whatsapp.net` : null
}

export default {
    command: ['setname', 'setnombre', 'alias', 'setalias', 'reg'],
    category: 'utils',
    run: async ({ client, m, args, usedPrefix, command, isOwner, isAdmin }) => {
        const db = global.db?.data
        if (!db?.users) return m.reply('❌ DB no inicializada.')

        // Caso 1: Mención (Cambiar nombre a otro) -> Requiere Admin/Owner
        const target = (m.mentionedJid && m.mentionedJid[0]) ? m.mentionedJid[0] : null
        
        let jid
        let name

        if (target) {
            // Si intentas cambiar el nombre de OTRO, verificamos permisos
            if (!isOwner && !isAdmin) {
                return m.reply('❌ Solo Administradores pueden cambiar el nombre de otros usuarios.')
            }
            jid = ensureJid(target)
            // El nombre es todo lo que sigue después de la mención
            name = args.slice(1).join(' ').trim()
        } else {
            // Caso 2: Auto-Cambio (Cambiar mi propio nombre)
            jid = m.sender
            name = args.join(' ').trim()
        }

        if (!name) {
            return m.reply(
                `📌 *Uso Correcto:*\n` +
                `• Para ti: *${usedPrefix + command} NuevoNombre*\n` +
                `• Para otro: *${usedPrefix + command} @tag NuevoNombre*`
            )
        }

        if (name.length > 25) return m.reply('📌 El nombre es muy largo (Máx 25 letras).')

        // Guardar en DB
        db.users[jid] = db.users[jid] || {}
        db.users[jid].name = name

        return m.reply(`✅ *Registro Exitoso*\n👤 Usuario: @${jid.split('@')[0]}\n📝 Nombre: *${name}*`, { 
            mentions: [jid] 
        })
    }
}
