import chalk from 'chalk'
import moment from 'moment-timezone'

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
      
      // 1. Obtener configuración del Bot (Desde InitDB)
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const settings = global.db.data.settings?.[botId] || {}
      
      const primaryBotId = chat?.primaryBot
      if (primaryBotId && primaryBotId !== botId) return

      const time = moment.tz('America/Bogota').format('hh:mm A')
      const memberCount = metadata?.participants?.length || 0
      
      // 2. Variables Definitivas (Prioridad: Base de Datos > Respaldo Fijo)
      const channelLink = settings.link || 'https://whatsapp.com/channel/0029Vb7LZZD5K3zb3S98eA1j'
      const channelId = settings.id || '120363423354513567@newsletter'
      const channelName = settings.nameid || '✨ Lucoa Updates ✨'
      
      for (const p of anu.participants) {
        const { jid, phone } = extractPhoneNumber(p)
        
        // Foto de perfil del usuario
        const pp = await client.profilePictureUrl(jid, 'image')
          .catch(() => 'https://i.ibb.co/9Hc0y97/default-group.png')

        // 🟢 CONFIGURACIÓN DE LA TARJETA (ESTILO BOTÓN QUE FUNCIONA)
        const fakeContext = {
          contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: channelId,   // ID Real para la finta
              serverMessageId: '100',
              newsletterName: channelName // Nombre de la finta
            },
            externalAdReply: {
              title: `Bienvenido a ${metadata.subject}`,
              body: '¡Clic aquí para unirte al Canal!', // Texto de llamada a la acción
              mediaUrl: null, 
              description: null,
              previewType: 'PHOTO',
              thumbnailUrl: pp,        // FOTO DEL USUARIO (O puedes poner settings.icon para la del bot)
              sourceUrl: channelLink,  // 🔗 EL ENLACE QUE ABRE AL TOCAR
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
│ 🧧 *BIENVENIDO / WELCOME*
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
│ _"Nadie es indispensable..."_
╰━─━─━─≪ 🥀 ≫─━─━─━╯`

          await client.sendMessage(anu.id, { 
            image: { url: pp }, 
            caption: caption, 
            ...fakeContext 
          })
        }
        
        // 👮 ALERTAS DE ADMIN
        if (anu.action === 'promote' && chat?.alerts) {
            client.sendMessage(anu.id, { text: `👑 *@${phone}* ahora es admin.`, mentions: [jid] })
        }
        if (anu.action === 'demote' && chat?.alerts) {
            client.sendMessage(anu.id, { text: `🤡 *@${phone}* ya no es admin.`, mentions: [jid] })
        }
      }
    } catch (err) {
      console.log(chalk.red(`[ ERROR EVENT ] ${err}`))
    }
  })
}
