import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['profile', 'perfil'],
  category: 'rpg',
  run: async ({ client, m }) => {
    
    // 1. Identificar Usuario (Mencionado, Citado o Sender)
    const texto = m.mentionedJid
    const who2 = texto.length > 0 ? texto[0] : (m.quoted ? m.quoted.sender : m.sender)
    const userId = await resolveLidToRealJid(who2, client, m.chat);

    // 2. Obtener Datos Globales
    // Inicializamos si no existe para evitar "Usuario no registrado"
    let user = global.db.data.users[userId]
    if (!user) {
        global.db.data.users[userId] = { 
            level: 0, exp: 0, coins: 0, bank: 0, 
            name: m.pushName || 'Sin Nombre', 
            registered: true 
        }
        user = global.db.data.users[userId]
    }

    // Configuración del Bot
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[idBot] || {}
    const currency = settings.currency || 'Coins'

    // 3. Extraer Datos del Perfil
    const name = user.name || 'Sin Nombre'
    const birth = user.birth || 'No especificado'
    const genero = user.genre || 'No especificado'
    const desc = user.description || 'Sin descripción'
    const pasatiempo = user.pasatiempo || 'No definido'
    const comandos = user.usedcommands || 0
    const harem = user.characters?.length || 0

    // 4. Lógica de Pareja (Marry)
    let parejaDisplay = 'Nadie 💔'
    let estadoCivil = (genero === 'Mujer') ? 'Casada con' : 'Casado con'

    if (user.marry) {
        const partnerId = user.marry
        const partner = global.db.data.users[partnerId]
        const partnerName = partner ? (partner.name || `@${partnerId.split('@')[0]}`) : 'Desconocido'
        parejaDisplay = partnerName
    } else {
        estadoCivil = 'Estado Civil'
        parejaDisplay = 'Soltero/a'
    }

    // 5. Datos de Economía
    const exp = user.exp || 0
    const nivel = user.level || 0
    const coins = user.coins || 0
    const bank = user.bank || 0
    const totalCoins = coins + bank

    // 6. Obtener Foto de Perfil
    const perfil = await client.profilePictureUrl(userId, 'image').catch((_) => 'https://cdn.stellarwa.xyz/files/1751246122292.jpg')

    // 7. Calcular Rank Global (Top Nivel)
    // Convertimos el objeto de usuarios en array y ordenamos por nivel
    const globalUsers = global.db.data.users
    const sortedLevel = Object.entries(globalUsers).sort((a, b) => (b[1].level || 0) - (a[1].level || 0))
    const rank = sortedLevel.findIndex(x => x[0] === userId) + 1

    // 8. Construir Mensaje
    const profileText = `╭─── ⋆🐉⋆ ───
│  *𝐏𝐄𝐑𝐅𝐈𝐋 𝐃𝐄 𝐔𝐒𝐔𝐀𝐑𝐈𝐎*
├───────────────
│ 👤 *Nombre ›* ${name}
│ 🏅 *Rango ›* #${rank} (Top Global)
│
│ ── 🌸 *Info Personal* ──
│ 🎂 Cumpleaños › *${birth}*
│ 🎮 Pasatiempo › *${pasatiempo}*
│ ✧ Género › *${genero}*
│ 💕 ${estadoCivil} › *${parejaDisplay}*
│
│ ── 💎 *Finanzas* ──
│ 💰 En Mano › *${coins.toLocaleString()} ${currency}*
│ 🏦 En Banco › *${bank.toLocaleString()} ${currency}*
│ 💎 Total › *${totalCoins.toLocaleString()} ${currency}*
│
│ ── 📊 *Stats* ──
│ ✨ Nivel › *${nivel}*
│ ❀ Exp › *${exp.toLocaleString()}*
│ 🐲 Harem › *${harem}*
│ 📝 Comandos › *${comandos.toLocaleString()}*
╰─── ⋆✨⋆ ───

> _${desc}_`

    // 9. Enviar
    await client.sendMessage(m.chat, { 
        image: { url: perfil }, 
        caption: profileText,
        mentions: user.marry ? [user.marry] : [] // Mencionamos a la pareja si existe
    }, { quoted: m })
  }
};
