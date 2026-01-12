import fetch from 'node-fetch'
import https from 'https'
import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

// ==========================================================
// CONFIGURACIÓN (Agente SSL para Rule34)
// ==========================================================
const agent = new https.Agent({ rejectUnauthorized: false })
const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }

// ==========================================================
// FRASES
// ==========================================================
const captions = {
  anal: (from, to) => from === to ? 'se la metió en el ano.' : 'se la metió en el ano a',
  cum: (from, to) => from === to ? 'se vino... Omitiremos eso.' : 'se vino dentro de',
  fuck: (from, to) => from === to ? 'se entrega al deseo.' : 'se está cogiendo a',
  lickpussy: (from, to) => from === to ? 'está lamiendo un coño.' : 'le está lamiendo el coño a',
  fap: (from, to) => from === to ? 'se está masturbando.' : 'se está masturbando pensando en',
  blowjob: (from, to) => from === to ? 'está dando una rica mamada.' : 'le dio una mamada a',
  threesome: (from, to) => from === to ? 'quiere un trío.' : 'está haciendo un trío con',
  yuri: (from, to) => from === to ? 'está tijereteando.' : 'está tijereteando con',
  sixnine: (from, to) => from === to ? 'está haciendo un 69.' : 'está haciendo un 69 con',
  undress: (from, to) => from === to ? 'se está quitando la ropa.' : 'le está quitando la ropa a',
  spank: (from, to) => from === to ? 'se dio una nalgada.' : 'le dio una nalgada a',
  grope: (from, to) => from === to ? 'se está toqueteando.' : 'está manoseando a',
  boobjob: (from, to) => from === to ? 'está haciendo una rusa.' : 'le hizo una rusa a',
  footjob: (from, to) => from === to ? 'está haciendo una paja con los pies.' : 'le hizo una paja con los pies a',
  suckboobs: (from, to) => from === to ? 'se chupa las tetas.' : 'le está chupando las tetas a',
  grabboobs: (from, to) => from === to ? 'se agarra las tetas.' : 'le está agarrando las tetas a',
  tentacle: (from, to) => from === to ? 'está siendo profanado por tentáculos.' : 'usó tentáculos contra',
  fingering: (from, to) => from === to ? 'se está dedeando.' : 'le está metiendo los dedos a',
  squirt: (from, to) => from === to ? 'hizo un squirt a chorro.' : 'hizo que se mojara toda',
  deepthroat: (from, to) => from === to ? 'se la metió hasta la garganta.' : 'le hizo garganta profunda a',
  bondage: (from, to) => from === to ? 'se amarró.' : 'amarró completamente a',
  creampie: (from, to) => from === to ? 'se llenó de leche.' : 'le llenó el coño de leche a',
  gangbang: (from, to) => from === to ? 'está siendo rodeada por todos.' : 'organizó una orgía con',
  facesitting: (from, to) => from === to ? 'se sentó en la cara de alguien.' : 'se sentó en la cara de',
  rimjob: (from, to) => from === to ? 'se está lamiendo el culo.' : 'le está lamiendo el culo a'
}

const symbols = ['(⁠◠⁠‿⁠◕⁠)', '(✿◡‿◡)', '(✿✪‿✪｡)', '(*≧ω≦)', '(✧ω◕)', '(¬‿¬)', '(✧ω✧)', '(•̀ᴗ•́)و ̑̑']
function getRandomSymbol() { return symbols[Math.floor(Math.random() * symbols.length)] }

// ==========================================================
// HERRAMIENTAS TÉCNICAS
// ==========================================================
async function gifToMp4(gifBuffer) {
    try {
        if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')
        const filename = Math.floor(Math.random() * 10000)
        const gifPath = `./tmp/${filename}.gif`
        const mp4Path = `./tmp/${filename}.mp4`
        await fs.promises.writeFile(gifPath, gifBuffer)
        await execPromise(`ffmpeg -y -i "${gifPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${mp4Path}"`)
        const mp4Buffer = await fs.promises.readFile(mp4Path)
        await fs.promises.unlink(gifPath); await fs.promises.unlink(mp4Path)
        return mp4Buffer
    } catch (e) {
        try { if (fs.existsSync(`./tmp/${filename}.gif`)) fs.unlinkSync(`./tmp/${filename}.gif`) } catch {}
        return gifBuffer 
    }
}

function getBufferType(buffer) {
    try {
        if (!Buffer.isBuffer(buffer)) return 'unknown'
        const magic = buffer.toString('hex', 0, 8).toUpperCase()
        if (magic.startsWith('474946')) return 'gif'
        if (magic.startsWith('89504E47')) return 'png'
        if (magic.startsWith('FFD8FF')) return 'jpg'
        if (magic.includes('66747970')) return 'mp4'
        if (magic.startsWith('1A45DFA3')) return 'webm'
        return 'unknown'
    } catch (e) { return 'unknown' }
}

// ==========================================================
// MAPAS (Tags Base)
// ==========================================================
const purrBotMap = {
    anal: 'anal', cum: 'cum', fuck: 'fuck', lickpussy: 'pussylick',
    fap: 'solo', blowjob: 'blowjob', threesome: 'threesome_fff', yuri: 'yuri'
}

const r34Map = {
    sixnine: '69', 
    undress: 'undressing',
    spank: 'spanking',
    grope: 'groping',
    boobjob: 'paizuri',
    footjob: 'footjob',
    suckboobs: 'breast_sucking',
    grabboobs: 'grabbing_breast',
    tentacle: 'tentacle',
    fingering: 'fingering',
    squirt: 'squirting',
    deepthroat: 'deepthroat',
    bondage: 'bondage',
    creampie: 'creampie',
    gangbang: 'gangbang',
    facesitting: 'facesitting',
    rimjob: 'rimjob'
}

const commandAliases = {
  coger: 'fuck', paja: 'fap', bj: 'blowjob', mamada: 'blowjob', anal: 'anal', venirse: 'cum', trio: 'threesome',
  tijeras: 'yuri', rusa: 'boobjob', pies: 'footjob', tentaculos: 'tentacle',
  encuerar: 'undress', desnudar: 'undress', nalgada: 'spank', azotar: 'spank',
  manosear: 'grope', toquetear: 'grope', chupartetas: 'suckboobs', agarrartetas: 'grabboobs',
  69: 'sixnine',
  dedos: 'fingering', dedear: 'fingering',
  mojarse: 'squirt', chorro: 'squirt',
  garganta: 'deepthroat', profunda: 'deepthroat',
  amarrar: 'bondage', atar: 'bondage', bdsm: 'bondage',
  leche: 'creampie', llenar: 'creampie',
  orgia: 'gangbang', 
  sentarse: 'facesitting', culo: 'rimjob', besoanal: 'rimjob'
}

const mainCommands = Object.keys(captions)

export default {
  command: mainCommands.concat(Object.keys(commandAliases)),
  category: 'nsfw',
  tags: ['nsfw'], 
  help: mainCommands,
  desc: 'Interacciones NSFW Ultimate (Prioridad Video).',

  run: async ({ client, m }) => {
    const db = global.db
    if (m.isGroup && !db.data.chats[m.chat]?.nsfw) {
        return m.reply('🚫 Los comandos *NSFW* están desactivados en este Grupo.')
    }

    if (!m.text) return
    const match = (globalThis.prefix || /^[\/#]/).exec(m.text)
    if (!match) return
    const usedPrefix = match[0]
    const commandRaw = m.text.slice(usedPrefix.length).trim().split(' ')[0].toLowerCase()
    const command = commandAliases[commandRaw] || commandRaw
    if (!captions[command]) return

    let who = m.isGroup ? (m.mentionedJid[0] ? m.mentionedJid[0] : (m.quoted ? m.quoted.sender : m.sender)) : (m.quoted ? m.quoted.sender : m.sender)
    const fromName = db.data.users[m.sender]?.name || m.pushName || 'Alguien'
    const toName = db.data.users[who]?.name || 'alguien'
    const txt = captions[command](fromName, toName)
    const caption = who !== m.sender
        ? `@${m.sender.split('@')[0]} ${txt} @${who.split('@')[0]} ${getRandomSymbol()}`
        : `${fromName} ${txt} ${getRandomSymbol()}`

    try {
      let url = null

      // ESTRATEGIA 1: PurrBot (Suelen ser gifs/videos de buena calidad)
      if (purrBotMap[command]) {
          try {
              const res = await fetch(`https://purrbot.site/api/img/nsfw/${purrBotMap[command]}/gif`)
              const json = await res.json()
              if (!json.error) url = json.link
          } catch (e) { }
      }

      // ESTRATEGIA 2: Rule34 con PRIORIDAD DE VIDEO
      if (!url && r34Map[command]) {
          const baseTag = r34Map[command]
          
          // Creamos 3 variantes de búsqueda
          const searchAttempts = [
              { tag: baseTag + '+video', desc: 'VIDEO' },      // 1. Prioridad máxima (lo que pediste)
              { tag: baseTag + '+animated', desc: 'ANIMATED' }, // 2. Si no hay "video", buscamos "animated"
              { tag: baseTag, desc: 'GENERAL' }                 // 3. Fallback general (y filtramos abajo)
          ]

          for (let attempt of searchAttempts) {
              if (url) break // Si ya encontramos, salimos
              
              try {
                  console.log(`[NSFW] Intento R34 (${attempt.desc}): ${attempt.tag}`)
                  
                  // Usamos la API principal con JSON
                  const r34Url = `https://rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${attempt.tag}`
                  
                  const res = await fetch(r34Url, { agent, headers })
                  const posts = await res.json().catch(() => [])

                  if (Array.isArray(posts) && posts.length > 0) {
                      // 1. Buscamos MP4/WebM específicamente
                      const videoPosts = posts.filter(p => p.file_url && (p.file_url.endsWith('.mp4') || p.file_url.endsWith('.webm')))
                      
                      // 2. Buscamos GIFs
                      const gifPosts = posts.filter(p => p.file_url && p.file_url.endsWith('.gif'))
                      
                      if (videoPosts.length > 0) {
                          const randomPost = videoPosts[Math.floor(Math.random() * videoPosts.length)]
                          url = randomPost.file_url
                          console.log(`✅ VIDEO ENCONTRADO en intento ${attempt.desc}`)
                      } else if (gifPosts.length > 0) {
                          const randomPost = gifPosts[Math.floor(Math.random() * gifPosts.length)]
                          url = randomPost.file_url
                          console.log(`✅ GIF ENCONTRADO en intento ${attempt.desc}`)
                      } else if (attempt.desc === 'GENERAL') {
                          // Solo si estamos en el último intento aceptamos imágenes estáticas
                          const randomPost = posts[Math.floor(Math.random() * posts.length)]
                          url = randomPost.file_url
                      }
                  }
              } catch (e) {
                  console.log(`Error en intento ${attempt.desc}:`, e.message)
              }
          }
      }

      // ESTRATEGIA 3: Fallback final (Waifu.pics)
      if (!url) {
          try {
              console.log('[NSFW] Fallback a Waifu.pics')
              const backupTag = command === 'boobjob' ? 'blowjob' : 'waifu'
              const res = await fetch(`https://api.waifu.pics/nsfw/${backupTag}`)
              const json = await res.json()
              url = json.url
          } catch (e) {}
      }

      if (!url) return m.reply('❌ No encontré nada, ni siquiera imágenes.')

      // DESCARGAR Y ENVIAR
      console.log(`[NSFW] Enviando: ${url}`)
      const response = await fetch(url, { agent, headers })
      let buffer = await response.buffer()
      
      const type = getBufferType(buffer)
      let msgOptions = { caption: caption, mentions: [who, m.sender] }

      if (type === 'gif') {
          buffer = await gifToMp4(buffer) 
          msgOptions.video = buffer
          msgOptions.gifPlayback = true 
      } 
      else if (type === 'mp4' || type === 'webm') {
          msgOptions.video = buffer
          msgOptions.mimetype = 'video/mp4'
          msgOptions.gifPlayback = true 
      } 
      else {
          msgOptions.image = buffer
      }

      await client.sendMessage(m.chat, msgOptions, { quoted: m })

    } catch (e) {
      console.error(e)
      m.reply(`❌ Error: ${e.message}`)
    }
  }
}
