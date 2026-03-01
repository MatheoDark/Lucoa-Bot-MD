export default {
  command: ['fb', 'facebook'],
  category: 'downloader',
  run: async ({client, m, args}) => {

    if (!args[0]) {
      return m.reply('🐲 Ingresa un enlace de *Facebook* (◕ᴗ◕)')
    }

    if (!args[0].match(/facebook\.com|fb\.watch|video\.fb\.com/)) {
      return m.reply('🐲 Envía un link de Facebook válido (◕︿◕)')
    }

    try {
      const videoUrl = `${api.url}/dl/facebookv2?url=${args[0]}&key=${api.key}`

      const response = await fetch(videoUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const buffer = Buffer.from(await response.arrayBuffer())

      const caption = `╭─── ⋆🐉⋆ ───
│ 📘 *Facebook Download*
├───────────────
│ 🔗 ${args[0]}
╰─── ⋆✨⋆ ───`

      await client.sendMessage(
        m.chat,
        { video: buffer, caption, mimetype: 'video/mp4', fileName: 'fb.mp4' },
        { quoted: m }
      )
    } catch (e) {
      await m.reply(`🐲 Error: ${e.message} (╥﹏╥)`)
    }
  }
}