import { igdl } from 'ruhend-scraper';

/* ──────────────────────────────────────────────────────────────
 *  IG Downloader (ruhend-scraper)
 *  - Compatible con tu main.js: run({ client, m, args, text, usedPrefix })
 *  - Forza reels/tv/stories como VIDEO
 *  - Evita fallback “PDF”: si cae a documento, siempre .mp4
 * ────────────────────────────────────────────────────────────── */

const COMMANDS = ['ig', 'instagram', 'igdl', 'instadl'];
const CATEGORY = 'downloader';

const UI = {
  downloading: '❤️ Descargando contenido de Instagram…',
  invalid: '🚩 Enlace no válido.',
  missing: (p = '#') => `🚩 Ingrese un enlace de Instagram.\nEjemplo: ${p}ig https://www.instagram.com/reel/xxxx`,
  notFound: '❌ No se encontró contenido para descargar.',
  error: '❌ Ocurrió un error al descargar desde Instagram.',
  done: '✅ Contenido listo.'
};

/* ───────────────────────── Helpers ───────────────────────── */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function replySafe(client, m, text) {
  if (m?.reply && typeof m.reply === 'function') return m.reply(text);
  return client.reply(m?.chat || m?.key?.remoteJid, text, m);
}

function extractUrl(text = '') {
  const t = String(text || '').trim();
  const match = t.match(/https?:\/\/[^\s]+/i);
  return match ? match[0].replace(/[<>]/g, '') : null;
}

function isInstagram(url = '') {
  return /(instagram\.com|instagr\.am|ig\.me)/i.test(url);
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

function inferKindFromIgUrl(igUrl = '') {
  const p = String(igUrl).toLowerCase();
  if (p.includes('/reel/') || p.includes('/tv/') || p.includes('/stories/')) return 'video';
  // /p/ puede ser imagen o video
  return 'unknown';
}

function pickBestMediaUrl(media) {
  // Prioriza descarga/video antes que thumbnails
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
  return (
    u.includes('.mp4') ||
    u.includes('/mp4') ||
    u.includes('mime=video') ||
    u.includes('video')
  );
}

function getQuotedText(m) {
  // Soporta quoted “normal” y contextInfo quotedMessage (Baileys)
  return (
    m?.quoted?.text ||
    m?.quoted?.caption ||
    m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
    m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
    m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption ||
    m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage?.caption ||
    ''
  );
}

/* ───────────────────────── Command ───────────────────────── */

export default {
  command: COMMANDS,
  category: CATEGORY,

  run: async ({ client, m, args = [], usedPrefix = '#', text = '' }) => {
    // 1) Tomar URL desde: text / args / quoted
    const input = text?.trim()
      ? text
      : (Array.isArray(args) ? args.join(' ') : String(args || ''));

    const quoted = getQuotedText(m);

    let igUrl =
      extractUrl(input) ||
      extractUrl(quoted) ||
      (Array.isArray(args) ? args[0] : null);

    if (!igUrl) return replySafe(client, m, UI.missing(usedPrefix));
    if (!isInstagram(igUrl)) return replySafe(client, m, UI.invalid);

    igUrl = cleanInstagramUrl(igUrl);

    // 2) Aviso “descargando”
    await client.reply(m.chat, UI.downloading, m);

    try {
      // 3) Scrape
      const res = await igdl(igUrl);
      const data = res?.data ?? res;

      if (!data || (Array.isArray(data) && data.length === 0)) {
        return client.reply(m.chat, UI.notFound, m);
      }

      const items = Array.isArray(data) ? data : [data];
      const forced = inferKindFromIgUrl(igUrl); // reels/tv/stories => video

      // 4) Enviar cada media (carrusel)
      for (let i = 0; i < items.length; i++) {
        const media = items[i];
        const mediaUrl = pickBestMediaUrl(media);

        if (!mediaUrl) continue;

        const declared = String(
          media?.type || media?.media_type || media?.mimetype || ''
        ).toLowerCase();

        const kind =
          forced === 'video' ? 'video'
          : declared.includes('video') ? 'video'
          : declared.includes('image') ? 'image'
          : isProbablyVideo(mediaUrl) ? 'video'
          : 'image';

        if (kind === 'video') {
          // Primero intentamos como VIDEO
          try {
            await client.sendMessage(
              m.chat,
              {
                video: { url: mediaUrl },
                mimetype: 'video/mp4',
                caption: UI.done
              },
              { quoted: m }
            );
          } catch {
            // Fallback: DOCUMENTO pero SIEMPRE .mp4 (para evitar “PDF”)
            await client.sendMessage(
              m.chat,
              {
                document: { url: mediaUrl },
                fileName: `instagram_${Date.now()}.mp4`,
                mimetype: 'video/mp4',
                caption: UI.done
              },
              { quoted: m }
            );
          }
        } else {
          await client.sendMessage(
            m.chat,
            {
              image: { url: mediaUrl },
              caption: UI.done
            },
            { quoted: m }
          );
        }

        await sleep(600);
      }
    } catch (e) {
      console.log('[IGDL] Error:', e?.message || e);
      return client.reply(m.chat, UI.error, m);
    }
  }
};
