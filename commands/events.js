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
      
      // IDs de los bots (para evitar conflictos si hay varios)
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const primaryBotId = chat?.primaryBot

      // Filtro: Si hay un bot principal definido y no soy yo, ignoro el evento.
      if (primaryBotId && primaryBotId !== botId) return

      // Datos de tiempo y grupo
      const time = moment.tz('America/Bogota').format('hh:mm A')
      const memberCount = metadata?.participants?.length || 0

      for (const p of anu.participants) {
        const { jid, phone } = extractPhoneNumber(p)
        
        // Foto de perfil (Intentar obtenerla, si falla usar una por defecto)
        const pp = await client.profilePictureUrl(jid, 'image')
          .catch(() => 'https://i.ibb.co/9Hc0y97/default-group.png')

        // 🟢 CONFIGURACIÓN DE LA TARJETA (AQUÍ VA TU CANAL)
        const fakeContext = {
          contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363323067339794@newsletter', // ID genérico para que se vea bonito
              serverMessageId: '100',
              newsletterName: '✨ Lucoa Updates ✨'
            },
            externalAdReply: {
              title: `Bienvenido a ${metadata.subject}`,
              body: '¡Únete a nuestro canal oficial!', 
              mediaUrl: null,
              description: null,
              previewType: 'PHOTO',
              thumbnailUrl: pp, 
              sourceUrl: 'https://whatsapp.com/channel/0029Vb7LZZD5K3zb3S98eA1j', // 🔗 TU CANAL AQUÍ
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

        // 👮 PROMOTE (Hacer Admin)
        if (anu.action === 'promote' && chat?.alerts) {
          await client.sendMessage(anu.id, {
            text: `👑 *NUEVO ADMIN DETECTADO*\n\n👤 *Usuario:* @${phone}\n🎉 *Cargo:* Administrador\n\n> _¡Ahora tienes el poder! Úsalo con responsabilidad._`,
            mentions: [jid]
          })
        }

        // 🤡 DEMOTE (Quitar Admin)
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
