export default {
  command: ['removerpj', 'delchar', 'deletechar', 'delwaifu'],
  category: 'owner',
  isOwner: true, // Solo tú puedes borrar personajes

  run: async ({ client, m, text, args, usedPrefix, command }) => {
    
    // 1. Detectar A QUIÉN se le borra (Mención, Reply o Texto)
    let who
    if (m.isGroup) {
        if (m.mentionedJid.length > 0) who = m.mentionedJid[0]
        else if (m.quoted) who = m.quoted.sender
        else if (args[0] && args[0].match(/^\d+$/)) who = args[0] + '@s.whatsapp.net' // Si pone el número directo
        else who = null
    } else {
        who = m.chat // Si es privado
    }

    // 2. Detectar NOMBRE DEL PERSONAJE
    // Eliminamos la mención del texto para que solo quede el nombre
    let charName = text
    if (who) {
        // Quitamos el @numero del texto para limpiar
        charName = charName.replace('@' + who.split('@')[0], '').trim()
    }
    
    // Si usó el formato "número nombre", quitamos el primer argumento (el número)
    if (args[0] && args[0].match(/^\d+$/)) {
        charName = args.slice(1).join(" ").trim()
    }

    // Validaciones
    if (!who) return m.reply(`⚠️ *Error:* Debes mencionar a alguien o responder a su mensaje.`)
    if (!charName) return m.reply(`⚠️ *Falta el nombre.*\n\n📌 *Ejemplo:* ${usedPrefix + command} @usuario Lucoa`)

    // 3. Acceder a Base de Datos GLOBAL
    let user = global.db.data.users[who]
    if (!user) return m.reply('❌ El usuario no está registrado en mi base de datos.')
    if (!user.characters || user.characters.length === 0) return m.reply('❌ El usuario no tiene ningún personaje.')

    // 4. Buscar el personaje (Búsqueda insensible a mayúsculas)
    let index = user.characters.findIndex(c => c.name.toLowerCase() === charName.toLowerCase())

    if (index === -1) {
        // Opción Extra: Búsqueda parcial (por si escribiste "Luc" en vez de "Lucoa")
        index = user.characters.findIndex(c => c.name.toLowerCase().includes(charName.toLowerCase()))
        
        if (index === -1) {
             return m.reply(`❌ No encontré al personaje *"${charName}"* en el inventario de este usuario.`)
        }
    }

    // 5. Eliminar y Recalcular
    let personajeEliminado = user.characters[index]
    
    // Cortamos el array en la posición encontrada
    user.characters.splice(index, 1)

    // Actualizamos estadísticas del usuario para evitar bugs
    user.characterCount = user.characters.length
    user.totalRwcoins = user.characters.reduce((acc, c) => acc + (Number(c.value) || 0), 0)

    // 6. Confirmación
    await client.sendMessage(m.chat, { 
        text: `🗑️ *PERSONAJE ELIMINADO*\n\n` +
              `👤 *Usuario:* @${who.split('@')[0]}\n` +
              `❌ *Personaje:* ${personajeEliminado.name}\n` +
              `📉 *Nuevo Valor Harem:* ${user.totalRwcoins}\n\n` +
              `> 🐲 Powered by MatheoDark`,
        mentions: [who]
    }, { quoted: m })
  }
}
