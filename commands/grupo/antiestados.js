export const before = async (m, { client }) => {
  if (!m.isGroup) return false

  const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
  const chat = global.db.data.chats[m.chat]

  if (!chat?.antistatus) return false

  const isEstado = !!(
    m.message?.groupStatusMentionMessage || 
    m.message?.extendedTextMessage?.contextInfo?.groupStatusMentionMessage ||
    m.type === 'groupStatusMentionMessage'
  )

  if (!isEstado) return false

  const groupMetadata = await client.groupMetadata(m.chat).catch(() => null)
  if (!groupMetadata) return false
  const participants = groupMetadata.participants || []
  const groupAdmins = participants.filter(p => p.admin).map(p => p.id)

  const isBotAdmin = groupAdmins.includes(botId)
  const isAdmin = groupAdmins.includes(m.sender)
  const isSelf = global.db.data.settings[botId]?.self ?? false

  if (isAdmin || !isBotAdmin || isSelf) return false

  try {
    await client.sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        fromMe: false,
        id: m.key.id,
        participant: m.sender
      }
    })

    const userName = m.pushName || 'Usuario'

    await client.sendMessage(m.chat, { text: `❖ @${m.sender.split('@')[0]} ha sido expulsado por intentar forzar vistos de estados.`, mentions: [m.sender] }, { quoted: m })

    setTimeout(async () => {
      await client.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
    }, 1000)

  } catch (error) {
    console.error('Error en Anti-Status:', error)
  }
}
export default {
  command: ['antiestado', 'antistatus'],
  description: 'Activa/desactiva la expulsión por menciones de estados',
  category: 'grupo',
  isAdmin: true,
  botAdmin: true,
  run: async ({ client, m, args, prefa }) => {
    let chat = global.db.data.chats[m.chat]
    if (!chat) return m.reply("El grupo no está registrado en la BD.")

    const param = args[0]?.toLowerCase()
    
    if (param === 'on' || param === '1') {
      if (chat.antistatus) return m.reply("El anti-estados ya estaba *activado*.")
      chat.antistatus = true
      m.reply("✅ *Anti-Estados activado.*\n\nCualquier usuario normal que intente mendigar vistas con la etiqueta global de Estados será eliminado de inmediato.")
    } else if (param === 'off' || param === '0') {
      if (!chat.antistatus) return m.reply("El anti-estados ya estaba *desactivado*.")
      chat.antistatus = false
      m.reply("❌ *Anti-Estados desactivado.*")
    } else {
      m.reply(`⚠️ Uso incorrecto.\nEjemplo:\n${prefa}antiestado on\n${prefa}antiestado off`)
    }
  }
}