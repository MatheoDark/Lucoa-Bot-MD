import fs from 'fs'
import fetch from 'node-fetch'
import path from 'path' // Necesario para rutas
import { resolveLidToRealJid } from '../../lib/utils.js'
// npm install canvas
import { createCanvas, loadImage } from 'canvas'

const charactersFilePath = './lib/characters.json'

// Asegurarse de que existe la carpeta tmp
const tmpDir = './tmp'
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true })
}

// --- 1. FUNCIÓN PARA BUSCAR IMÁGENES ---
const obtenerImagenGelbooru = async (keyword) => {
  if (!keyword) return null
  const tag = encodeURIComponent(keyword)

  // 1. SafeBooru (funcional y sin auth)
  try {
    const res = await fetch(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
    const data = await res.json()
    const posts = Array.isArray(data) ? data : (data?.post || [])
    const valid = posts.filter(p => (p.file_url || p.image) && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url || p.image))
    if (valid.length) {
      const post = valid[Math.floor(Math.random() * valid.length)]
      const url = post.file_url || `https://safebooru.org/images/${post.directory}/${post.image}`
      return url.startsWith('http') ? url : `https://safebooru.org${url}`
    }
  } catch {}

  // 2. Gelbooru fallback
  try {
    const res = await fetch(`https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`)
    const data = await res.json()
    const posts = data?.post || []
    const valid = posts.filter(p => p.file_url && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url))
    if (valid.length) return valid[Math.floor(Math.random() * valid.length)].file_url
  } catch {}

  // 3. Danbooru fallback
  try {
    const res = await fetch(`https://danbooru.donmai.us/posts.json?tags=${tag}&limit=50`)
    const data = await res.json()
    const valid = data.filter(p => (p.file_url || p.large_file_url))
    if (valid.length) {
      const post = valid[Math.floor(Math.random() * valid.length)]
      return post.file_url || post.large_file_url
    }
  } catch {}

  return null
}

async function loadCharacters() {
    try {
        if (fs.existsSync(charactersFilePath)) {
            return JSON.parse(fs.readFileSync(charactersFilePath, 'utf-8'))
        }
        return []
    } catch (e) {
        return []
    }
}

// --- 2. GENERADOR DE COLLAGE (Ahora guarda en disco) ---
async function generateCollage(charactersOnPage, charactersData, userName, page, totalPages) {
    const count = charactersOnPage.length;
    if (count === 0) return null;

    const cols = 4; 
    const rows = Math.ceil(count / cols); 
    
    const cardW = 200; 
    const cardH = 260; 
    const gap = 15;    
    const margin = 40; 
    const headerH = 80; 

    const width = margin * 2 + (cols * cardW) + ((cols - 1) * gap);
    const height = margin * 2 + headerH + (rows * cardH) + ((rows - 1) * gap);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fondo
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 0, width, height);

    // Texto Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Sans';
    ctx.fillText(`Harén de ${userName}`, margin, 60);
    
    ctx.font = '25px Sans';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`Página ${page} / ${totalPages}`, width - margin - 180, 60);

    const defaultImgUrl = 'https://i.imgur.com/K88rQ5k.jpeg'; 

    for (let i = 0; i < count; i++) {
        const char = charactersOnPage[i];
        const charDef = charactersData.find(c => c.name.toLowerCase() === char.name.toLowerCase());
        
        let url = charDef?.image || charDef?.url || charDef?.img;
        
        if (!url && charDef?.keyword) {
            try {
                url = await obtenerImagenGelbooru(charDef.keyword);
            } catch (e) { }
        }
        url = url || defaultImgUrl;

        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = margin + col * (cardW + gap);
        const y = margin + headerH + row * (cardH + gap);

        // Fondo Tarjeta
        ctx.fillStyle = '#303030';
        ctx.fillRect(x, y, cardW, cardH);

        // Imagen
        try {
            const img = await loadImage(url);
            ctx.drawImage(img, x, y, cardW, 180);
        } catch (e) {
            ctx.fillStyle = '#000';
            ctx.fillRect(x, y, cardW, 180);
        }

        // Texto
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Sans';
        ctx.textAlign = 'center';
        let name = char.name;
        if (name.length > 18) name = name.substring(0, 16) + '..';
        ctx.fillText(name, x + cardW / 2, y + 210);

        ctx.fillStyle = '#ffd700'; 
        ctx.font = '16px Sans';
        const val = (char.value || charDef?.value || 0).toLocaleString();
        ctx.fillText(`💎 ${val}`, x + cardW / 2, y + 235);
        
        if (char.protectionUntil > Date.now()) {
            ctx.fillStyle = '#00ff00';
            ctx.fillText(`🛡️ Protegido`, x + cardW / 2, y + 255);
        }
    }

    // --- AQUÍ CAMBIA: GUARDAR EN TMP ---
    const buffer = canvas.toBuffer();
    // Creamos un nombre único: harem_TIMESTAMP_RANDOM.png
    const fileName = `harem_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`
    const filePath = path.join(tmpDir, fileName)
    
    // Escribimos el archivo en disco
    fs.writeFileSync(filePath, buffer)
    
    return filePath; // Retornamos la RUTA, no el buffer
}

let handler = {
    command: ['harem', 'claims', 'waifus', 'miswaifus'],
    category: 'gacha',
    run: async ({ client, m, args }) => {
        let createdFilePath = null; // Variable para guardar la ruta y borrarla luego

        try {
            if (!m.isGroup) return m.reply('❌ Solo en grupos.')

            const chatData = global.db.data.chats[m.chat] || {}
            if (chatData.adminonly || !chatData.gacha) {
                return m.reply(`✎ Gacha desactivado.`)
            }

            let rawUserId = m.sender
            if (m.quoted) rawUserId = m.quoted.sender
            else if (m.mentionedJid && m.mentionedJid[0]) rawUserId = m.mentionedJid[0]
            
            const userId = await resolveLidToRealJid(rawUserId, client, m.chat)
            const globalUser = global.db.data.users[userId]
            const name = globalUser?.name || userId.split('@')[0]

            const localUser = chatData.users[userId] || { characters: [] }
            const userCharacters = localUser.characters || []

            if (userCharacters.length === 0) {
                return m.reply(`❀ *${name}* no tiene personajes en este grupo.`)
            }

            const charactersData = await loadCharacters()

            const perPage = 20 
            const total = userCharacters.length
            const totalPages = Math.ceil(total / perPage)
            let page = parseInt(args.find(a => /^\d+$/.test(a))) || 1
            page = Math.max(1, Math.min(page, totalPages))

            const start = (page - 1) * perPage
            const end = Math.min(start + perPage, total)
            const charsPage = userCharacters.slice(start, end)

            // m.reply('🎨 Generando collage...') 

            // Generar Collage y obtener RUTA
            createdFilePath = await generateCollage(charsPage, charactersData, name, page, totalPages)

            if (!createdFilePath) return m.reply('❌ Error creando imagen.')

            let caption = `❀ *HARÉN DE ${name.toUpperCase()}*\n`
            caption += `📝 Total: ${total} | Pág: ${page}/${totalPages}\n`
            caption += `> Usa *#harem ${page + 1}* para la siguiente.`

            // Enviar leyendo desde el archivo
            await client.sendMessage(m.chat, { 
                image: fs.readFileSync(createdFilePath), // Leemos el archivo temporal
                caption: caption,
                mentions: [userId]
            }, { quoted: m })

        } catch (error) {
            console.error(error)
            await m.reply(`✘ Error: ${error.message}`)
        } finally {
            // --- LIMPIEZA AUTOMÁTICA ---
            // Borramos el archivo temporal pase lo que pase (éxito o error)
            if (createdFilePath && fs.existsSync(createdFilePath)) {
                try {
                    fs.unlinkSync(createdFilePath)
                } catch (e) {
                    console.error('Error borrando archivo temporal:', e)
                }
            }
        }
    }
}

export default handler
