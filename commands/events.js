import chalk from 'chalk'
import moment from 'moment-timezone'

// Función helper para extraer número de teléfono del participante
function extractPhoneNumber(participant) {
  const jid = participant?.phoneNumber || participant
  const phone = (typeof jid === 'string' ? jid : '').split('@')[0] || 'Usuario'
  return { jid, phone }
}

export default async (client, m) => {
  client.ev.on('group-participants.update', async (anu) => {
    try {
      const metadata = await client.groupMetadata(anu.id)
      const chat = global.db.data.chats?.[anu.id] || {}
      
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const primaryBotId = chat?.primaryBot

      if (primaryBotId && primaryBotId !== botId) return

      const time = moment.tz('America/Bogota').format('hh:mm A')
      const memberCount = metadata?.participants?.length || 0
      
      // 🔗 TU CANAL (AQUÍ ESTÁ LA CLAVE)
      const channelLink = 'https://whatsapp.com/channel/0029Vb7LZZD5K3zb3S98eA1j'

      for (const p of anu.participants) {
        const { jid, phone } = extractPhoneNumber(p)
        
        // Foto de perfil
        const pp = await client.profilePictureUrl(jid, 'image')
          .catch(() => 'https://i.ibb.co/9Hc0y97/default-group.png')

        // 🟢 CONTEXTO (TARJETA)
        const fakeContext = {
          contextInfo: {
            mentionedJid: [jid],
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363323067339794@newsletter',
              serverMessageId: '100',
              newsletterName: '✨ Lucoa Updates ✨'
            },
            externalAdReply: {
              title: `Bienvenido a ${metadata.subject}`,
              body: '¡Únete a nuestro Canal Oficial!',
              thumbnailUrl: pp,
              sourceUrl: channelLink, // Link al hacer clic en título/foto
              mediaType: 1, // 1 = Imagen
              renderLargerThumbnail: true, // Foto Grande
              showAdAttribution: true // ⚠️ ESTO HACE QUE EL LINK FUNCIONE MEJOR
            }
          }
        }

        // 🌟 MENSAJE DE BIENVENIDA (ADD)
        if (anu.action === 'add' && chat?.welcome) {
          const caption = `
╭━─━─━─≪ 🐉 ≫─━─━─━╮
│ 🧧 *BIENVENIDO / WELCOME*
│
│ 👤 *Usuario:* @${phone}
│ 🏰 *Grupo:* ${metadata.subject}
│ 👥 *Miembros:* ${memberCount}
│ ⌚ *Hora:* ${time}
│
│ 🔗 *CANAL OFICIAL:*
│ ${channelLink}
│
│ 📜 *Descripción:*
│ ${metadata.desc ? metadata.desc.toString().slice(0, 100) + '...' : 'Sin descripción'}
╰━─━─━─≪ 🐉 ≫─━─━─━╯`
          
          await client.sendMessage(anu.id, { 
            image: { url: pp }, 
            caption: caption, 
            ...fakeContext 
          })
        }

        // 💀 MENSAJE DE DESPEDIDA (REMOVE/LEAVE)
        if ((anu.action === 'remove' || anu.action === 'leave') && chat?.welcome) {
          const caption = `
╭━─━─━─≪ 🥀 ≫─━─━─━╮
│ 🗑️ *ADIÓS / GOODBYE*
│
│ 👤 *Usuario:* @${phone}
│ 🏰 *Grupo:* ${metadata.subject}
│ 👥 *Miembros:* ${memberCount}
│
│ 🔗 *No te pierdas de nada:*
│ ${channelLink}
│
│ _"Esperamos verte pronto..."_
╰━─━─━─≪ 🥀 ≫─━─━─━╯`

          await client.sendMessage(anu.id, { 
            image: { url: pp }, 
            caption: caption, 
            ...fakeContext 
          })
        }

        // 👮 PROMOTE
        if (anu.action === 'promote' && chat?.alerts) {
          await client.sendMessage(anu.id, {
            text: `👑 *NUEVO ADMIN DETECTADO*\n\n👤 *Usuario:* @${phone}\n🎉 *Cargo:* Administrador`,
            mentions: [jid]
          })
        }

        // 🤡 DEMOTE
        if (anu.action === 'demote' && chat?.alerts) {
          await client.sendMessage(anu.id, {
            text: `🤡 *ADMIN DEGRADADO*\n\n👤 *Usuario:* @${phone}\n📉 *Estado:* Miembro común`,
            mentions: [jid]
          })
        }
      }
    } catch (err) {
      console.log(chalk.red(`[ ERROR EVENT ] ${err}`))
    }
  })
}
