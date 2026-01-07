import { igdl } from 'ruhend-scraper';

function extractUrl(text = '') {
  const t = String(text || '').trim();
  const match = t.match(/https?:\/\/[^\s]+/i);
  return match ? match[0].replace(/[<>]/g, '') : null;
}

function cleanInstagramUrl(u) {
  try {
    const url = new URL(u);
    url.search = '';
    url.hash = '';
    url.hostname = 'www.instagram.com';
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url.toString();
  } catch {
    return u;
  }
}

function isInstagram(url = '') {
  return /(instagram\.com|instagr\.am|ig\.me)/i.test(url);
}

function replySafe(client, m, text) {
  if (m?.reply && typeof m.reply === 'function') return m.reply(text);
  return client.reply(m?.chat || m?.key?.remoteJid, text, m);
}

function inferFromIgUrl(igUrl = '') {
  const p = String(igUrl).toLowerCase();
  if (p.includes('/reel/') || p.includes('/tv/')) return 'video';
  if (p.includes('/stories/')) return 'video';
  // /p/ puede ser foto o video
  return 'unknown';
}

function pickBestMediaUrl(media) {
  // Priorizamos campos típicos de video/descarga por sobre thumbnails
  const candidates = [
    media?.download,
    media?.downloadUrl,
    media?.video,
    media?.videoUrl,
    media?.url,
    media
  ].filter(Boolean);

  return String(candidates[0] || '');
}

function isProbablyVideo(url = '') {
  const u = String(url).toLowerCase();
  return u.includes('.mp4') || u.includes('video') || u.includes('/mp4') || u.includes('mime=video');
}

export default {
  command: ['ig', 'instagram', 'igdl', 'instadl'],
  category: 'downloader',

  run: async ({ client, m, args = [], usedPrefix = '#', text = '' }) => {
    const input = text?.trim()
      ? text
      : (Array.isArray(args) ? args.join(' ') : String(args || ''));

    const fromQuoted =
      m?.quoted?.text ||
      m?.quoted?.caption ||
      m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
      m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
      m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption ||
      m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage?.caption ||
      '';

    let igUrl = extractUrl(input) || extractUrl(fromQuoted) || (Array.isArray(args) ? args[0] : null);

    if (!igUrl) {
      return replySafe(
        client,
        m,
        `🚩 Ingrese un enlace de Instagram.\nEjemplo: ${usedPrefix}ig https://www.instagram.com/reel/xxxx`
      );
    }

    if (!isInstagram(igUrl)) return replySafe(client, m, '🚩 Enlace no válido.');

    igUrl = cleanInstagramUrl(igUrl);

    const forcedKind = inferFromIgUrl(igUrl); // reel/tv => video

    await client.reply(m.chat, '❤️ Descargando contenido de Instagram…', m);

    try {
      const res = await igdl(igUrl);
      const data = res?.data ?? res;

      if (!data || (Array.isArray(data) && data.length === 0)) {
        return client.reply(m.chat, '❌ No se encontró contenido para descargar.', m);
      }

      const items = Array.isArray(data) ? data : [data];

      for (let i = 0; i < items.length; i++) {
        const media = items[i];
        const mediaUrl = pickBestMediaUrl(media);

        if (!mediaUrl) continue;

        // ✅ Si es reel/tv, forzamos video.
        // Si no, intentamos deducir por url o por campos.
        const declared = String(media?.type || media?.media_type || media?.mimetype || '').toLowerCase();
        const kind =
          forcedKind === 'video' ? 'video'
          : declared.includes('video') ? 'video'
          : declared.includes('image') ? 'image'
          : isProbablyVideo(mediaUrl) ? 'video'
          : 'image'; // para /p/ sin info, asumimos imagen antes que documento

        const caption = '✅ Contenido listo.';

        if (kind === 'video') {
          try {
            await client.sendMessage(
              m.chat,
              { video: { url: mediaUrl }, mimetype: 'video/mp4', caption },
              { quoted: m }
            );
          } catch (e) {
            // fallback: documento MP4 (NO PDF)
            await client.sendMessage(
              m.chat,
              { document: { url: mediaUrl }, fileName: `instagram_${Date.now()}.mp4`, mimetype: 'video/mp4', caption },
              { quoted: m }
            );
          }
        } else {
          await client.sendMessage(
            m.chat,
            { image: { url: mediaUrl }, caption },
            { quoted: m }
          );
        }

        await new Promise(r => setTimeout(r, 600));
      }
    } catch (e) {
      console.log('[IGDL] Error:', e?.message || e);
      return client.reply(m.chat, '❌ Ocurrió un error al descargar desde Instagram.', m);
    }
  }
};
