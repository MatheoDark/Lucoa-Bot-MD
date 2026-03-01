import axios from 'axios';

export default {
  command: ['drive', 'gdrive'],
  category: 'downloader',
  run: async (client, m, args) => {
    if (!args[0]) {
      return m.reply(
        '🐲 Ingresa el enlace de *Google Drive* (◕ᴗ◕)',
      )
    }

    const url = args[0]
    const key = api.key

    if (!url.match(/drive\.google\.com\/(file\/d\/|open\?id=|uc\?id=)/)) {
      return m.reply('🐲 URL no válida de Google Drive (◕︿◕)')
    }

   // await m.reply(mess.wait)

    try {
      const response = await axios.get(`${api.url}/dow/gdrive`, {
        params: { url, key },
      })

      const json = response.data

      if (!json.status || !json.data?.dl) {
        return m.reply('🐲 No se pudo obtener el archivo (╥﹏╥)')
      }

      const { fileName, fileSize, mimetype, dl } = json.data

      const caption =
        `╭─── ⋆🐉⋆ ───\n│ 📁 *Google Drive*\n├───────────────\n│ ❀ Nombre: ${fileName}\n│ ❀ Tamaño: ${fileSize}\n│ ❀ Tipo: ${mimetype}\n╰─── ⋆✨⋆ ───\n\n` +
        dev

      await client.sendContextInfoIndex(m.chat, caption, {}, m, true, null, {
        banner: 'https://cdn.stellarwa.xyz/files/1755778404402.jpeg',
        title: '🐉 Google Drive (◕ᴗ◕✿)',
        body: '🐲 Descarga De Google Drive',
        redes: global.db.data.settings[client.user.id.split(':')[0] + "@s.whatsapp.net"].link,
      })

      await client.sendMessage(
        m.chat,
        {
          document: { url: dl },
          mimetype,
          fileName,
          // caption
        },
        { quoted: m },
      )
    } catch (e) {
      console.error(e)
      m.reply(msgglobal)
    }
  },
};
