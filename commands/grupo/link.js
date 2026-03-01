export default {
  command: ['link', 'enlace', 'linkgc', 'grouplink'],
  category: 'grupo',
  botAdmin: true,

  run: async ({ client, m }) => {
    try {
      await m.react('🔗')

      // 1. Obtener Datos
      const groupMetadata = await client.groupMetadata(m.chat)
      const groupName = groupMetadata.subject
      const participants = groupMetadata.participants.length
      const code = await client.groupInviteCode(m.chat)
      const link = `https://chat.whatsapp.com/${code}`

      // 2. Obtener Foto (Con protección si no tiene)
      let pp
      try {
        pp = await client.profilePictureUrl(m.chat, 'image')
      } catch {
        // Si no tiene foto, usa esta imagen genérica de WhatsApp
        pp = 'https://telegra.ph/file/9b445582c3c97c72f7049.jpg' 
      }

      const txt = `
╭─── ⋆🐉⋆ ───
│ *🔗 Link del Grupo* (◕ᴗ◕✿)
├───────────────
│ ❀ *Nombre:* ${groupName}
│ ❀ *Miembros:* ${participants}
│ ❀ *Enlace:* ${link}
╰─── ⋆✨⋆ ───`

      // 3. Enviar con Tarjeta (Usando URL directa)
      await client.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
          externalAdReply: {
            title: "Invitación Oficial",
            body: groupName,
            thumbnailUrl: pp, // Usa la URL (real o por defecto)
            sourceUrl: link,
            mediaType: 1,
            renderLargerThumbnail: true
          },
          forwardingScore: 999,
          isForwarded: true
        }
      }, { quoted: m })

    } catch (e) {
      console.error(e)
      m.reply('🐲 Error. Asegúrate de que soy Admin. (◕︿◕)')
    }
  },
};
