import sharp from 'sharp'

export default {
  command: ['toimage'],
  category: 'utils',
  run: async ({ client, m }) => {
    try {
      const q = m.quoted || m
      const mime = (q.msg || q).mimetype || ''

      if (!mime) {
        return m.reply('🐲 Responde a un *sticker* usando *#toimage* (◕ᴗ◕)')
      }

      if (!/webp/i.test(mime)) {
        return m.reply('🐲 El mensaje respondido no es un *sticker* válido (◕︿◕)')
      }

      await m.react('⏳')

      const stickerBuffer = await q.download()
      if (!stickerBuffer?.length) {
        return m.reply('❌ No pude descargar ese sticker.')
      }

      const imageBuffer = await sharp(stickerBuffer, { animated: true }).png().toBuffer()

      await client.sendMessage(
        m.chat,
        { image: imageBuffer, caption: '✅ Sticker convertido a imagen.' },
        { quoted: m }
      )

      await m.react('✅')
    } catch (e) {
      console.error('Error en toimage:', e)
      await m.react('❌')
      m.reply(`❌ Error al convertir sticker: ${e.message}`)
    }
  }
}