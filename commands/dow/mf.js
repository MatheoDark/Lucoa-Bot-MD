import axios from 'axios';
import path from 'path';
import { getBuffer } from '../../lib/message.js';
import sharp from 'sharp';

function isValidMediafireUrl(url) {
  try {
    const parsed = new URL(url)
    const hostOk = parsed.hostname.includes('mediafire.com')
    const pathOk = parsed.pathname.includes('/file/')
    const queryOk = parsed.search.length > 1
    return hostOk && (pathOk || queryOk)
  } catch {
    return false
  }
}

export default {
  command: ['mediafire', 'mf'],
  category: 'downloader',
  run: async (client, m, args) => {
    if (!args[0]) {
      return m.reply('� Ingresa un enlace de *Mediafire* o palabra clave (◕ᴗ◕)')
    }

    const input = args.join(' ')
    const isValidUrl = isValidMediafireUrl(input)

    try {
      let mediafireUrl = input

      if (!isValidUrl) {
        const searchRes = await axios.get(`${api.url}/search/mediafire?query=${encodeURIComponent(input)}&key=${api.key}`)
        const searchData = searchRes.data

        if (!searchData.status || !searchData.results?.length) {
          return m.reply('� No se encontraron resultados (╥﹏╥)')
        }

        const result = searchData.results[Math.floor(Math.random() * searchData.results.length)]
        mediafireUrl = result.url
      }

let response, data
try {
  response = await axios.get(`${api.url}/dl/mediafire?url=${mediafireUrl}&key=${api.key}`)
  data = response.data
} catch (err) {
  return m.reply(`� No se pudo descargar de Mediafire (╥﹏╥)`)
}

if (!data || !data.status || !data.data || !data.data.dl) {
  return m.reply(`� No se pudo descargar el archivo (╥﹏╥)`)
}

      const { title, dl } = data.data

const mimeTypes = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.apk': 'application/vnd.android.package-archive',
  '.exe': 'application/vnd.microsoft.portable-executable',
  '.msi': 'application/x-msdownload',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const ext = path.extname(title);
const tipo = mimeTypes[ext.toLowerCase()] || 'application/octet-stream';

      const info = `╭─── ⋆🐉⋆ ───\n│ 📂 *Mediafire*\n├───────────────\n│ ❀ Nombre: ${title}\n│ ❀ Tipo: ${tipo}\n╰─── ⋆✨⋆ ───\n\n${dev}`

      await client.sendContextInfoIndex(m.chat, info, {}, m, true, null, {
        banner: 'https://cdn.stellarwa.xyz/files/1755745696353.jpeg',
        title: '🐉 Mediafire (◕ᴗ◕✿)',
        body: '🐲 Descarga De Mediafire',
        redes: global.db.data.settings[client.user.id.split(':')[0] + "@s.whatsapp.net"].link,
      })

        /*await client.sendMessage(
          m.chat,
          {
            document: { url: dl },
            mimetype: tipo,
            fileName: title,
          },
          { quoted: m },
        )*/

        let jpegThumbnail2 = await getBuffer(`https://cdn.stellarwa.xyz/files/1755745696353.jpeg`)
        let jpegThumbnail = await sharp(jpegThumbnail2)
    .resize(300, 300)
    .jpeg({ quality: 80 })
    .toBuffer();

    await client.sendMessage(m.chat, { document: { url: dl }, mimetype: tipo, fileName: title, jpegThumbnail }, { quoted: m });
    } catch (e) {
      m.reply(msgglobal)
    }
  },
};