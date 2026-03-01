import fetch from 'node-fetch';
import FormData from 'form-data';

export default {
  command: ['tofigure', 'tf'],
  category: 'utils',
  run: async ({client, m, args, command}) => {

    try {
      const q = m.quoted || m;
      const mime = q.mimetype || q.msg?.mimetype || '';

      if (!mime) return m.reply(`🐲 Envía una *imagen* junto al *comando* ${prefa}tofigure (◕ᴗ◕)`);
      if (!/image\/(jpe?g|png)/.test(mime)) {
        return m.reply(`🐲 Formato *${mime}* no compatible (◕︿◕)`);
      }

      const buffer = await q.download();
      const uploadedUrl = await uploadToUguu(buffer);
      if (!uploadedUrl) {
        return m.reply('🐲 No se pudo *subir* la imagen (╥﹏╥)');
      }

      const figureBuffer = await getFigureBuffer(uploadedUrl);
      if (!figureBuffer) {
        return m.reply('🐲 No se pudo *generar* la figura (╥﹏╥)');
      }

      await client.sendMessage(m.chat, { image: figureBuffer, caption: null }, { quoted: m });
    } catch (err) {
      // console.error(err);
      await m.reply(msgglobal);
    }
  },
};

async function uploadToUguu(buffer) {
  const body = new FormData();
  body.append('files[]', buffer, 'image.jpg');

  const res = await fetch('https://uguu.se/upload.php', {
    method: 'POST',
    body,
    headers: body.getHeaders(),
  });

  const json = await res.json();
  return json.files?.[0]?.url;
}

async function getFigureBuffer(url) {
  const res = await fetch(`${api.url}/tools/tofigure?url=${url}&key=${api.key}`);
  if (!res.ok) return null;

  return Buffer.from(await res.arrayBuffer());
}
