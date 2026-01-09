import axios from 'axios';
import crypto from 'crypto';

const ogmp3 = {
  api: { base: "https://api3.apiapi.lat", endpoints: { a: "https://api5.apiapi.lat" } },
  headers: { 'content-type': 'application/json', 'user-agent': 'Postify/1.0.0' },
  
  utils: {
    hash: () => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
    },
    encoded: (str) => {
      let result = "";
      for (let i = 0; i < str.length; i++) { result += String.fromCharCode(str.charCodeAt(i) ^ 1); }
      return result;
    },
    enc_url: (url) => {
      const codes = [];
      for (let i = 0; i < url.length; i++) { codes.push(url.charCodeAt(i)); }
      return codes.join(",").split(",").reverse().join(",");
    }
  },

  request: async (endpoint, data = {}) => {
    try {
      const { data: response } = await axios({
        method: 'post',
        url: `https://api5.apiapi.lat${endpoint}`,
        data: data,
        headers: ogmp3.headers
      });
      return { status: true, data: response };
    } catch (error) { return { status: false, error: error.message }; }
  },

  download: async (link, format, type = 'video') => {
    try {
        const c = ogmp3.utils.hash();
        const d = ogmp3.utils.hash();
        const req = {
          data: ogmp3.utils.encoded(link),
          format: type === 'audio' ? "0" : "1",
          mp3Quality: type === 'audio' ? format : null,
          mp4Quality: type === 'video' ? format : null,
          userTimeZone: "0"
        };
        
        const resx = await ogmp3.request(`/${c}/init/${ogmp3.utils.enc_url(link)}/${d}/`, req);
        if (!resx.status || !resx.data || resx.data.s !== "C") return { status: false };
        
        return {
            status: true,
            result: {
              title: resx.data.t || "Media",
              download: `${ogmp3.api.base}/${ogmp3.utils.hash()}/download/${ogmp3.utils.encoded(resx.data.i)}/${ogmp3.utils.hash()}/`
            }
        };
    } catch (e) { return { status: false }; }
  }
};
export { ogmp3 };
