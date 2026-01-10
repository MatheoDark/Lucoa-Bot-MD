import chalk from 'chalk'
import moment from 'moment-timezone'

// Helper para extraer datos del participante
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
      
      // IDs de los bots (para evitar conflictos)
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const primaryBotId = chat?.primaryBot

      if (primaryBotId && primaryBotId !== botId) return

      // Datos
      const time = moment.tz('America/Bogota').format('hh:mm A')
      const memberCount = metadata?.participants?.length || 0
      
      // 🔗 TU CANAL (Definido aquí para usarlo en texto y tarjeta)
      const channelLink = 'https://whatsapp.com/channel/0029Vb7LZZD5K3zb3S98eA1j'

      for (const p of anu.participants) {
        const { jid, phone } = extractPhoneNumber(p)
        
        // Foto de perfil
        const pp = await client.profilePictureUrl(jid, 'image')
          .catch(() => 'https://i.ibb.co/9Hc0y97/default-group.png')

        // 🟢 CONFIGURACIÓN DE LA TARJETA
        const fakeContext = {
          contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363323067339794@newsletter',
              serverMessageId: '100',
              newsletterName: '✨ Lucoa Updates ✨'
            },
            externalAdReply: {
              title: `Bienvenido a ${metadata.subject}`,
              body: '¡Clic aquí para unirte al Canal!',
              mediaUrl: channelLink, 
              description: 'Unete',
              previewType: 'PHOTO',
              thumbnailUrl: pp, 
              sourceUrl: channelLink, // Enlace en la tarjeta
              mediaType: 1,
              renderLargerThumbnail: true
            },
            mentionedJid: [jid]
          }
        }

        // 🌟 MENSAJE DE BIENVENIDA (ADD)
        if (anu.action === 'add' && chat?.welcome) {
          const caption = `
╭━─━─━─≪ 🐉 ≫─━─━─━╮
│ 🧧 *WELCOME / BIENVENIDO*
│
│ 👤 *Usuario:* @${phone}
│ 🏰 *Grupo:* ${metadata.subject}
│ 👥 *Miembros:* ${memberCount}
│ ⌚ *Hora:* ${time}
│
│ 🔗 *Canal Oficial:*
│ ${channelLink}
│
│ 📜 *Descripción:*
│ ${metadata.desc ? metadata.desc.toString().slice(0, 100) + '...' : 'Sin descripción'}
╰━─━─━─≪ 🐉 ≫─━─━─━╯

> _Disfruta tu estancia y respeta las reglas._ ✨`
          
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
│ 🗑️ *GOODBYE / ADIÓS*
│
│ 👤 *Usuario:* @${phone}
│ 🏰 *Grupo:* ${metadata.subject}
│ 👥 *Miembros:* ${memberCount}
│
│ _"Nadie es indispensable, pero_
│ _todos somos necesarios..."_
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
            text: `👑 *NUEVO ADMIN DETECTADO*\n\n👤 *Usuario:* @${phone}\n🎉 *Cargo:* Administrador\n\n> _¡Ahora tienes el poder! Úsalo con responsabilidad._`,
            mentions: [jid]
          })
        }

        // 🤡 DEMOTE
        if (anu.action === 'demote' && chat?.alerts) {
          await client.sendMessage(anu.id, {
            text: `🤡 *ADMIN DEGRADADO*\n\n👤 *Usuario:* @${phone}\n📉 *Estado:* Miembro común\n\n> _F por ti._`,
            mentions: [jid]
          })
        }
      }
    } catch (err) {
      console.log(chalk.red(`[ ERROR EVENT ] ${err}`))
    }
  })
}
