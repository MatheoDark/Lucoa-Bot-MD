import moment from 'moment-timezone';
import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['profile', 'perfil'],
  category: 'rpg',
  run: async ({client, m}) => {
    const texto = m.mentionedJid
    const who2 = texto.length > 0 ? texto[0] : m.quoted ? m.quoted.sender : m.sender
    const userId = await resolveLidToRealJid(who2, client, m.chat);

    // CORRECCIÓN FINAL: Referencias unificadas
    // Ya no usamos chatUsers para la economía, solo globalUsers
    const globalUsers = global.db.data.users || {}
    const user = globalUsers[userId]

    if (!user) return m.reply('✎ Usuario no registrado.')

    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net' || ''
    const settings = global.db.data.settings[idBot] || {}
    const currency = settings.currency || ''

    const name = user.name || 'Sin Nombre'
    const birth = user.birth || 'Sin especificar'
    const genero = user.genre || 'Oculto'
    const comandos = user.usedcommands || 0
    const pareja = user.marry ? `${globalUsers[user.marry]?.name || 'Alguien'}` : 'Nadie'
    const estadoCivil = genero === 'Mujer' ? 'Casada con' : 'Casado con'
    const desc = user.description ? `\n\n${user.description}` : ''
    const pasatiempo = user.pasatiempo || 'No definido'
    
    // Economía GLOBAL
    const exp = user.exp || 0
    const nivel = user.level || 0
    const chocolates = user.coins || 0
    const banco = user.bank || 0
    const totalCoins = chocolates + banco
    const harem = user.characters?.length || 0

    const perfil = await client.profilePictureUrl(userId, 'image').catch((_) => 'https://cdn.stellarwa.xyz/files/1751246122292.jpg')

    // Calcular Rank Global
    const usersArr = Object.entries(globalUsers).map(([key, value]) => ({ ...value, jid: key }))
    const sortedLevel = usersArr.sort((a, b) => (b.level || 0) - (a.level || 0))
    const rank = sortedLevel.findIndex((u) => u.jid === userId) + 1

    const profileText = `「✿」 *Perfil* ◢ ${name} ◤

♛ Cumpleaños › *${birth}*
♛ Pasatiempo › *${pasatiempo}*
♛ Género › *${genero}*
♡ ${estadoCivil} › *${pareja}*${desc}

✿ Nivel › *${nivel}*
❀ Experiencia › *${exp.toLocaleString()}*
☆ Puesto › *#${rank}*

ꕥ Harem › *${harem.toLocaleString()}*
✰ Dinero Total › *¥${totalCoins.toLocaleString()} ${currency}*
❒ Comandos ejecutados › *${comandos.toLocaleString()}*`

    await client.sendMessage(m.chat, { image: { url: perfil }, caption: profileText }, { quoted: m })
  }
};
