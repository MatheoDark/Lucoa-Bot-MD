export default {
  command: ['darplata', 'addcoins', 'darcoins', 'givecoins'], // Agregué alias útiles
  category: 'Owner',
  isOwner: true, // Solo tú puedes usarlo

  run: async ({ client, m, text, usedPrefix, command }) => {
    
    // 1. Detectar moneda del bot
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const currency = global.db.data.settings[botId]?.currency || 'Monedas' // Fallback si no hay nombre

    // 2. Detectar A QUIÉN se le da (Mención O Responder mensaje)
    let who
    if (m.isGroup) {
        if (m.mentionedJid.length > 0) who = m.mentionedJid[0]
        else if (m.quoted) who = m.quoted.sender
        else who = false
    } else {
        who = m.chat // Si es chat privado, es al otro usuario
    }

    if (!who) return m.reply(`⚠️ *Error:* Debes mencionar a alguien o responder a su mensaje.\n\n📌 *Uso:* ${usedPrefix + command} 1000 @usuario`)

    // 3. Detectar CANTIDAD (Limpia el texto quitando la mención para encontrar el número)
    // Esto permite poner el número antes o después de la etiqueta
    let txt = text.replace('@' + who.split('@')[0], '').trim()
    
    // Soporte para "k" (ej: 1k = 1000)
    if (txt.toLowerCase().endsWith('k')) {
        txt = parseFloat(txt) * 1000
    }
    
    let cantidad = parseInt(txt)

    if (isNaN(cantidad) || cantidad <= 0) {
        return m.reply(`⚠️ *Error:* Ingresa una cantidad válida.\n\n📌 *Ejemplo:* ${usedPrefix + command} 500 @usuario`)
    }

    // 4. Acceder a la Base de Datos GLOBAL (Users, no Chats)
    let users = global.db.data.users
    
    // Si el usuario no existe en la DB, lo iniciamos para que no de error
    if (!users[who]) {
        users[who] = { coins: 0, exp: 0, limit: 10 } 
    }

    // 5. Ejecutar transacción
    users[who].coins = (users[who].coins || 0) + cantidad

    // 6. Confirmación con estilo
    await client.sendMessage(m.chat, { 
        text: `✅ *TRANSACCIÓN EXITOSA*\n\n` +
              `👤 *Usuario:* @${who.split('@')[0]}\n` +
              `💰 *Monto:* +${cantidad.toLocaleString()} ${currency}\n` +
              `🏦 *Nuevo Saldo:* ${(users[who].coins).toLocaleString()} ${currency}\n\n` +
              `> 🐲 Powered by MatheoDark`,
        mentions: [who]
    }, { quoted: m })
  }
}
