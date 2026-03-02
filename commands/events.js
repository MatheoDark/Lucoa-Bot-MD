import chalk from 'chalk'
import moment from 'moment-timezone'
import { getCachedGroupMetadata } from '../lib/groupCache.js'

function extractPhoneNumber(participant) {
  const jid = participant?.phoneNumber || participant
  const phone = (typeof jid === 'string' ? jid : '').split('@')[0] || 'Usuario'
  return { jid, phone }
}

export default async (client, m) => {
  client.ev.on('group-participants.update', async (anu) => {
    try {
      // 🔧 FIX: Usar cache centralizado en vez de llamar API directamente
      const metadata = await getCachedGroupMetadata(client, anu.id)
      if (!metadata) return
      const chat = global.db.data.chats?.[anu.id] || {}
      
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const settings = global.db.data.settings?.[botId] || {}
      
      const primaryBotId = chat?.primaryBot
      if (primaryBotId && primaryBotId !== botId) return

      const time = moment.tz('America/Bogota').format('hh:mm A')
      const memberCount = metadata?.participants?.length || 0
      
      // CONFIGURACIÓN
      const channelLink = settings.link || 'https://whatsapp.com/channel/0029Vb7LZZD5K3zb3S98eA1j'
      const channelId = settings.id || '120363423354513567@newsletter'
      const channelName = settings.nameid || '✨ Lucoa Updates ✨'
      
      for (const p of anu.participants) {
        const { jid, phone } = extractPhoneNumber(p)
        const pp = await client.profilePictureUrl(jid, 'image')
          .catch(() => 'https://i.ibb.co/9Hc0y97/default-group.png')

        // 🟢 TARJETA (Aquí va la única foto)
        const fakeContext = {
          contextInfo: {
            mentionedJid: [jid],
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: channelId,
              serverMessageId: '100',
              newsletterName: channelName
            },
            externalAdReply: {
              title: `Bienvenido a ${metadata.subject}`,
              body: '¡Clic para unirte al Canal!',
              mediaUrl: null, 
              previewType: 'PHOTO',
              thumbnailUrl: pp,        
              sourceUrl: channelLink,  
              mediaType: 1,
              renderLargerThumbnail: true // FOTO GRANDE EN LA TARJETA
            }
          }
        }

        // 🌟 BIENVENIDA (Texto con Cajas + Tarjeta)
        if (anu.action === 'add' && chat?.welcome) {
          const txt = `
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
          
          // CAMBIO CLAVE: Usamos 'text' en lugar de 'image'
          // Esto evita que salga la foto doble. Solo saldrá la tarjeta.
          await client.sendMessage(anu.id, { 
            text: txt, 
            ...fakeContext 
          })
        }

        // 💀 DESPEDIDA
        if ((anu.action === 'remove' || anu.action === 'leave') && chat?.welcome) {
          const txt = `
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
            text: txt, 
            ...fakeContext 
          })
        }
        
        // 👮 ADMINS
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
