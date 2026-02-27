import fetch from 'node-fetch';

export default {
  command: ['imagen', 'img', 'image'],
  category: 'search',
  run: async ({ client, m, args }) => {
    const text = args.join(' ')
    if (!text) {
      return m.reply(`《✧》 Ingresa un *término* de búsqueda.`)
    }

    // Lista de palabras prohibidas (Filtro NSFW)
    const bannedWords = [
      '+18', '18+', 'contenido adulto', 'contenido explícito', 'contenido sexual',
      'actriz porno', 'actor porno', 'estrella porno', 'pornstar', 'video xxx', 'xxx', 'x x x',
      'pornhub', 'xvideos', 'xnxx', 'redtube', 'brazzers', 'onlyfans', 'cam4', 'chaturbate',
      'myfreecams', 'bongacams', 'livejasmin', 'spankbang', 'tnaflix', 'hclips', 'fapello',
      'mia khalifa', 'lana rhoades', 'riley reid', 'abella danger', 'brandi love',
      'eva elfie', 'nicole aniston', 'janice griffith', 'alexis texas', 'lela star',
      'gianna michaels', 'adriana chechik', 'asa akira', 'mandy muse', 'kendra lust',
      'jordi el niño polla', 'johnny sins', 'danny d', 'manuel ferrara', 'mark rockwell',
      'porno', 'porn', 'sexo', 'sex', 'desnudo', 'desnuda', 'erótico', 'erotico', 'erotika',
      'tetas', 'pechos', 'boobs', 'boob', 'nalgas', 'culo', 'culos', 'qlos', 'trasero',
      'pene', 'verga', 'vergota', 'pito', 'chocha', 'vagina', 'vaginas', 'coño', 'concha',
      'genital', 'genitales', 'masturbar', 'masturbación', 'masturbacion', 'gemidos',
      'gemir', 'orgía', 'orgy', 'trío', 'trio', 'gangbang', 'creampie', 'facial', 'cum',
      'milf', 'teen', 'incesto', 'incest', 'violación', 'violacion', 'rape', 'bdsm',
      'hentai', 'tentacle', 'tentáculos', 'fetish', 'fetiche', 'sado', 'sadomaso',
      'camgirl', 'camsex', 'camshow', 'playboy', 'playgirl', 'playmate', 'striptease',
      'striptis', 'slut', 'puta', 'putas', 'perra', 'perras', 'whore', 'fuck', 'fucking',
      'fucked', 'cock', 'dick', 'pussy', 'ass', 'shemale', 'trans', 'transgénero',
      'transgenero', 'lesbian', 'lesbiana', 'gay', 'lgbt', 'explicit', 'hardcore',
      'softcore', 'nudista', 'nudismo', 'nudity', 'deepthroat', 'dp', 'double penetration',
      'analplay', 'analplug', 'rimjob', 'spank', 'spanking', 'lick', 'licking', '69',
      'doggystyle', 'reverse cowgirl', 'cowgirl', 'blowjob', 'bj', 'handjob', 'hj',
      'p0rn', 's3x', 'v@gina', 'c0ck', 'd1ck', 'fuk', 'fuking', 'fak', 'boobz', 'pusy',
      'azz', 'cumshot', 'sexcam', 'livecam', 'webcam', 'sexchat', 'sexshow', 'sexvideo',
      'sexvid', 'sexpics', 'sexphoto', 'seximage', 'sexgif', 'pornpic', 'pornimage',
      'pornvid', 'pornvideo', 'only fan', 'only-fans', 'only_fans', 'onlyfans.com',
      'mia khalifha', 'mia khalifah', 'mia khalifaa', 'mia khalif4', 'mia khal1fa',
      'mia khalifa +18', 'mia khalifa xxx', 'mia khalifa desnuda', 'mia khalifa porno'
    ]

    const lowerText = text.toLowerCase()
    
    // Verificamos si el grupo tiene NSFW activado
    const nsfwEnabled = global.db.data.chats[m.chat]?.nsfw === true

    if (!nsfwEnabled && bannedWords.some((word) => lowerText.includes(word))) {
      return m.reply('《✧》 Este comando no *permite* búsquedas de contenido *+18* o *NSFW* en este grupo.\n> Un administrador debe activar el modo NSFW primero.')
    }

    await m.reply('🔍 *Buscando imagen...*')

    try {
      const apiUrl = `${global.api.url}/search/googleimagen?query=${encodeURIComponent(text)}&key=${global.api.key}`

      const res = await fetch(apiUrl)
      const contentType = res.headers.get('content-type') || ''

      // CASO 1: La API devolvió una imagen directa (PNG/JPG/WEBP)
      if (contentType.includes('image/')) {
        const buffer = Buffer.from(await res.arrayBuffer())
        if (buffer.length > 1000) {
          await client.sendMessage(m.chat, {
            image: buffer,
            caption: `🔎 Resultado de: *${text}*`
          }, { quoted: m })
          return
        }
      }

      // CASO 2: La API devolvió JSON con array de URLs
      let images = []
      try {
          const data = contentType.includes('json') ? await res.json() : JSON.parse(await res.text())
          if (data && Array.isArray(data)) images = data
          else if (data?.result && Array.isArray(data.result)) images = data.result
          else if (data?.data && Array.isArray(data.data)) images = data.data
      } catch {}

      if (images.length) {
        const randomImage = images[Math.floor(Math.random() * images.length)]
        await client.sendMessage(m.chat, {
          image: { url: typeof randomImage === 'string' ? randomImage : randomImage.url || randomImage.image },
          caption: `🔎 Resultado de: *${text}*`
        }, { quoted: m })
        return
      }

      // CASO 3: Fallback con DuckDuckGo
      const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(text)}&iax=images&ia=images`
      const tokenRes = await fetch(tokenUrl, { headers: { 'User-Agent': UA }, timeout: 15000 })
      const tokenHtml = await tokenRes.text()
      const vqdMatch = tokenHtml.match(/vqd=['"]([^'"]+)['"]/)
      
      if (vqdMatch) {
        const imgUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(text)}&o=json&p=1&s=0&u=bing&f=,,,,,&l=wt-wt&vqd=${vqdMatch[1]}`
        const imgRes = await fetch(imgUrl, {
          headers: { 'User-Agent': UA, 'Referer': 'https://duckduckgo.com/' },
          timeout: 15000
        })
        const imgData = await imgRes.json()
        const results = imgData.results?.filter(r => r.image) || []
        
        if (results.length) {
          const pick = results[Math.floor(Math.random() * results.length)]
          await client.sendMessage(m.chat, {
            image: { url: pick.image },
            caption: `🔎 Resultado de: *${text}*`
          }, { quoted: m })
          return
        }
      }

      return m.reply(`ꕥ No se encontraron resultados para *${text}*.`)

    } catch (e) {
      console.error(e)
      await m.reply(global.msgglobal || 'Ocurrió un error al buscar la imagen.')
    }
  },
};
