import axios from 'axios';

export default {
  command: ['spotify'],
  category: 'downloader',
  run: async ({client, m, text, }) => {

  if (!text) return m.reply(`🐲 Ingresa el nombre o URL de Spotify (◕ᴗ◕)`);

  try {
    let song;
    const isSpotifyUrl = text.startsWith('https://open.spotify.com/');
    if (isSpotifyUrl) {
      song = { url: text };
    } else {
      const results = await spotifyxv(text);
      if (!results.length) return m.reply('🐲 No se encontró la canción (╥﹏╥)');
      song = results[0];
    }

    const res = await axios.get(`${api.url}/dl/spotify?url=${song.url}&key=${api.key}`);
    const data = res.data?.data;
    if (!data?.download) return m.reply('🐲 No se pudo obtener el enlace (╥﹏╥)');

    if (!data || !res.data.status) return m.reply('🐲 No se pudo obtener resultados (╥﹏╥)')

    const info = `╭─── ⋆🐉⋆ ───\n│ 🎧 *Spotify Download*\n├───────────────\n│ ❀ *${data.title}*\n│ ❀ Artista: *${data.artist}*\n` +
                 (song.album ? `│ ❀ Álbum: *${song.album}*\n` : '') +
                 `│ ❀ Duración: *${data.duration}*\n╰─── ⋆✨⋆ ───`;

    await conn.sendMessage(m.chat, { image: { url: data.image }, caption: info }, { quoted: m });

    await conn.sendMessage(m.chat, {
      audio: { url: data.download },
      ptt: true,
      fileName: `${data.title}.mp3`,
      mimetype: 'audio/mpeg'
    }, { quoted: m });

  } catch (e) {
    // console.error(e);
    await m.reply(`${msgglobal}`);
  }
}}

async function spotifyxv(query) {
  const res = await axios.get(`${api.url}/search/spotify?query=${encodeURIComponent(query)}&key=${api.key}`);
  if (!res.data?.status || !res.data?.data?.length) return [];

  const firstTrack = res.data.data[0];

  return [{
    name: firstTrack.title,
    artista: [firstTrack.artist],
    album: firstTrack.album,
    duracion: firstTrack.duration,
    url: firstTrack.url,
    imagen: firstTrack.image || ''
  }];
}