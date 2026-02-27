import axios from 'axios';
import crypto from 'crypto';

const ogmp3 = {
  api: {
    base: "https://api3.apiapi.lat",
    endpoints: {
      a: "https://api5.apiapi.lat",
      b: "https://api.apiapi.lat",
      c: "https://api3.apiapi.lat"
    }
  },

  headers: {
    'authority': 'api.apiapi.lat',
    'content-type': 'application/json',
    'origin': 'https://ogmp3.lat',
    'referer': 'https://ogmp3.lat/',
    'user-agent': 'Postify/1.0.0'
  },

  formats: {
    video: ['240', '360', '480', '720', '1080'],
    audio: ['64', '96', '128', '192', '256', '320']
  },

  default_fmt: {
    video: '720',
    audio: '320'
  },

  restrictedTimezones: new Set(["-330", "-420", "-480", "-540"]),

  utils: {
    hash: () => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
    },

    encoded: (str) => {
      let result = "";
      for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) ^ 1);
      }
      return result;
    },

    enc_url: (url, separator = ",") => {
      const codes = [];
      for (let i = 0; i < url.length; i++) {
        codes.push(url.charCodeAt(i));
      }
      return codes.join(separator).split(separator).reverse().join(separator);
    }
  },

  isUrl: str => {
    try {
      const url = new URL(str);
      const hostname = url.hostname.toLowerCase();
      const b = [/^(.+\.)?youtube\.com$/, /^(.+\.)?youtube-nocookie\.com$/, /^youtu\.be$/];
      return b.some(a => a.test(hostname)) && !url.searchParams.has("playlist");
    } catch (_) {
      return false;
    }
  },

  youtube: url => {
    if (!url) return null;
    const b = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];
    for (let a of b) {
      if (a.test(url)) return url.match(a)[1];
    }
    return null;
  },

  request: async (endpoint, data = {}, method = 'post') => {
    try {
      const ae = Object.values(ogmp3.api.endpoints);
      const be = ae[Math.floor(Math.random() * ae.length)];
      const fe = endpoint.startsWith('http') ? endpoint : `${be}${endpoint}`;

      const { data: response } = await axios({
        method,
        url: fe,
        data: method === 'post' ? data : undefined,
        headers: ogmp3.headers
      });
      return { status: true, code: 200, data: response };
    } catch (error) {
      return { status: false, code: error.response?.status || 500, error: error.message };
    }
  },

  async checkStatus(id) {
    try {
      const c = this.utils.hash();
      const d = this.utils.hash();
      const endpoint = `/${c}/status/${this.utils.encoded(id)}/${d}/`;
      return await this.request(endpoint, { data: id });
    } catch (error) {
      return { status: false, code: 500, error: error.message };
    }
  },

  async checkProgress(data) {
    try {
      let attempts = 0;
      const maxAttempts = 300;

      while (attempts < maxAttempts) {
        attempts++;
        const res = await this.checkStatus(data.i);
        if (!res.status) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        const stat = res.data;
        if (stat.s === "C") return stat;
        if (stat.s === "P") {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        return null;
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  download: async (link, format, type = 'video') => {
    if (!link) return { status: false, code: 400, error: "Proporciona un enlace de YouTube." };

    if (!ogmp3.isUrl(link)) return { status: false, code: 400, error: "Enlace de YouTube inválido." };

    if (type !== 'video' && type !== 'audio') return { status: false, code: 400, error: "Tipo debe ser 'video' o 'audio'." };

    if (!format) {
      format = type === 'audio' ? ogmp3.default_fmt.audio : ogmp3.default_fmt.video;
    }

    const valid_fmt = type === 'audio' ? ogmp3.formats.audio : ogmp3.formats.video;
    if (!valid_fmt.includes(format)) {
      return { status: false, code: 400, error: `Formato ${format} no válido para ${type}. Usa: ${valid_fmt.join(', ')}` };
    }

    const id = ogmp3.youtube(link);
    if (!id) return { status: false, code: 400, error: "No se pudo extraer el ID del video." };

    try {
      let retries = 0;
      const maxRetries = 20;

      while (retries < maxRetries) {
        retries++;
        const c = ogmp3.utils.hash();
        const d = ogmp3.utils.hash();
        const req = {
          data: ogmp3.utils.encoded(link),
          format: type === 'audio' ? "0" : "1",
          referer: "https://ogmp3.cc",
          mp3Quality: type === 'audio' ? format : null,
          mp4Quality: type === 'video' ? format : null,
          userTimeZone: new Date().getTimezoneOffset().toString()
        };

        const resx = await ogmp3.request(`/${c}/init/${ogmp3.utils.enc_url(link)}/${d}/`, req);

        if (!resx.status) {
          if (retries === maxRetries) return resx;
          continue;
        }

        const data = resx.data;
        if (data.le) return { status: false, code: 400, error: "El video es demasiado largo (máx 3 horas)." };
        if (data.i === "blacklisted") {
          const limit = ogmp3.restrictedTimezones.has(new Date().getTimezoneOffset().toString()) ? 5 : 100;
          return { status: false, code: 429, error: `Límite de descargas diarias (${limit}) alcanzado.` };
        }
        if (data.e || data.i === "invalid") return { status: false, code: 400, error: "El video no existe o fue eliminado." };

        if (data.s === "C") {
          return {
            status: true, code: 200,
            result: {
              title: data.t || "Sin título",
              type, format,
              thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
              download: `${ogmp3.api.base}/${ogmp3.utils.hash()}/download/${ogmp3.utils.encoded(data.i)}/${ogmp3.utils.hash()}/`,
              id, quality: format
            }
          };
        }

        const prod = await ogmp3.checkProgress(data);
        if (prod && prod.s === "C") {
          return {
            status: true, code: 200,
            result: {
              title: prod.t || "Sin título",
              type, format,
              thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
              download: `${ogmp3.api.base}/${ogmp3.utils.hash()}/download/${ogmp3.utils.encoded(prod.i)}/${ogmp3.utils.hash()}/`,
              id, quality: format
            }
          };
        }
      }

      return { status: false, code: 500, error: "No se pudo completar la descarga después de varios intentos." };

    } catch (error) {
      return { status: false, code: 500, error: error.message };
    }
  }
};

export { ogmp3 };
