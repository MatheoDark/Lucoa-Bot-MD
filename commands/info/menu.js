// commands/info/menu.js
import moment from 'moment-timezone'
import { commands } from '../../lib/commands.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

/* =========================
   Paths (robusto)
========================= */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// /commands/info -> sube 2 niveles al root del proyecto
const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const MEDIA_DIR = path.join(PROJECT_ROOT, 'media')

/* =========================
   Utils
========================= */
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function getSelfId(client) {
  const raw =
    client?.user?.id ||
    client?.user?.jid ||
    client?.authState?.creds?.me?.id ||
    client?.authState?.creds?.me?.jid
  if (!raw) return null
  const cleaned = String(raw).replace(/:\d+/, '')
  return cleaned.includes('@') ? cleaned : `${cleaned}@s.whatsapp.net`
}

function getSenderSafe(m) {
  const sender = m?.sender || m?.key?.participant || ''
  return String(sender || '')
}

function hasFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function gifToMp4Buffer(gifBuffer) {
  if (!hasFfmpeg()) return null

  const tmpDir = path.join(os.tmpdir(), 'lucoa-menu')
  ensureDir(tmpDir)

  const stamp = Date.now()
  const inGif = path.join(tmpDir, `menu_${stamp}.gif`)
  const outMp4 = path.join(tmpDir, `menu_${stamp}.mp4`)

  fs.writeFileSync(inGif, gifBuffer)

  try {
    execSync(
      `ffmpeg -y -i "${inGif}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${outMp4}"`,
      { stdio: 'ignore' }
    )
    const mp4 = fs.readFileSync(outMp4)
    try { fs.unlinkSync(inGif) } catch {}
    try { fs.unlinkSync(outMp4) } catch {}
    return mp4
  } catch {
    try { fs.unlinkSync(inGif) } catch {}
    try { fs.unlinkSync(outMp4) } catch {}
    return null
  }
}

function getArgsFromMessage(m, usedPrefix = '') {
  const raw = (m?.text || m?.body || m?.message?.conversation || '').trim()
  if (!raw) return []

  const p = (usedPrefix || '').trim()
  let t = raw

  if (p && t.startsWith(p)) t = t.slice(p.length).trim()

  const parts = t.split(/\s+/).filter(Boolean)
  parts.shift() // quita comando
  return parts
}

/* =========================
   Command
========================= */
export default {
  command: ['menu', 'help', 'menú'],
  category: 'info',
  run: async ({ client, m, usedPrefix }) => {
    try {
      const botId = getSelfId(client)
      if (!botId) return m.reply('❌ No pude obtener el ID del bot.')

      const botname = 'Lucoa Bot'
      const owner = 'MatheoDark'

      const botSettings = global.db?.data?.settings?.[botId] || {}
      const botVersion = botSettings.version || '3.5'

      const match = (usedPrefix || '').match(/[#\/+.!-]$/)
      const cleanPrefix = match ? match[0] : (usedPrefix || '#')

      // ====== MEDIA RANDOM DESDE /media (SIEMPRE) ======
      const allMedia = fs.existsSync(MEDIA_DIR)
        ? fs.readdirSync(MEDIA_DIR).filter(f => /\.(mp4|gif|jpe?g|png|webp)$/i.test(f))
        : []

      if (!allMedia.length) {
        throw new Error(`No hay archivos en ${MEDIA_DIR} (mp4/gif/jpg/png/webp)`)
      }

      const picked = pickRandom(allMedia)
      const bannerPath = path.join(MEDIA_DIR, picked)
      const bannerBuffer = fs.readFileSync(bannerPath)

      let kind = 'img'
      const low = picked.toLowerCase()
      if (low.endsWith('.mp4')) kind = 'mp4'
      else if (low.endsWith('.gif')) kind = 'gif'

      // ====== TIEMPO / SALUDO ======
      const tz = 'America/Santiago'
      const fecha = moment.tz(tz).format('DD/MM/YYYY')
      const hora = moment.tz(tz).format('hh:mm A')
      const jam = moment.tz(tz).format('HH:mm:ss')
      const saludo =
        jam < '12:00:00' ? 'Buenos días' :
        jam < '18:00:00' ? 'Buenas tardes' :
        'Buenas noches'

      // ====== CATEGORÍAS + FILTRO ======
      const args = getArgsFromMessage(m, cleanPrefix)
      const requestedCat = (args[0] || '').toLowerCase()

      const cmdsList = commands || []
      const plugins = cmdsList.length

      const categories = {}
      for (const cmd of cmdsList) {
        const cat = (cmd.category || 'otros').toLowerCase()
        if (!categories[cat]) categories[cat] = []
        categories[cat].push(cmd)
      }

      let catsToShow = categories
      if (requestedCat) {
        if (!categories[requestedCat]) {
          const disponibles = Object.keys(categories).sort().join(', ')
          return m.reply(`❌ Categoría no encontrada: *${requestedCat}*\n✅ Disponibles: ${disponibles}`)
        }
        catsToShow = { [requestedCat]: categories[requestedCat] }
      }

      const getCmdName = (cmd) => {
        const aliasArr = Array.isArray(cmd.alias) ? cmd.alias : []
        let main = aliasArr[0]
        if (!main) {
          if (Array.isArray(cmd.command) && cmd.command.length) main = cmd.command[0]
          else main = cmd.command || cmd.name || '???'
        }
        return String(main).split(/[\/#!+.\-\s]+/).pop().toLowerCase()
      }

      let menu = `\n\n`
      menu += `⁀⸱⁀⸱︵⸌⸃૰⳹․💥․⳼૰⸂⸍︵⸱⁀⸱⁀․....\n`
      menu += `𔓕꯭ ꯭ 𓏲꯭֟፝੭ ꯭⌑ LUCOA BOT ⌑꯭ 𓏲꯭֟፝੭꯭  ꯭𔓕\n`
      menu += `▬͞▭͞▬͞▭͞▬͞▭͞▬͞▭͞▬͞▭͞▬͞▭͞▬͞▭͞▬\n`
      menu += `> ${saludo}  *${m?.pushName ? m.pushName : 'Sin nombre'}*\n\n`
      menu += `╭──────────────────────────────╮\n`
      menu += `│ 👑 Creador : ${owner}\n`
      menu += `│ 🧩 Plugins : ${plugins}\n`
      menu += `│ 🧷 Versión : ${botVersion}\n`
      menu += `│ 📅 Fecha   : ${fecha}, ${hora}\n`
      menu += `│ ✅ Usa así : ${cleanPrefix}menu / ${cleanPrefix}menu economy\n`
      menu += `╰──────────────────────────────╯\n`

      for (const [category, cmds] of Object.entries(catsToShow)) {
        const catName = category.charAt(0).toUpperCase() + category.slice(1)
        menu += `\n✦━━━━━━━〔 ${catName} (${cmds.length}) 〕━━━━━━━✦\n`
        cmds.forEach(cmd => {
          const name = getCmdName(cmd)
          const desc = (cmd.desc || '').trim()
          menu += `• ${cleanPrefix}${name}${desc ? ` — ${desc}` : ''}\n`
        })
      }

      const senderSafe = getSenderSafe(m)
      const ctx = {
        mentionedJid: senderSafe.includes('@') ? [senderSafe] : [],
        forwardingScore: 999,
        isForwarded: true
      }

      // ====== ENVIAR BANNER RANDOM ======
      const caption = `🐉 ${botname} — Menú (${picked})`

      if (kind === 'mp4') {
        await client.sendMessage(m.chat, {
          video: bannerBuffer,
          mimetype: 'video/mp4',
          caption,
          contextInfo: ctx
        }, { quoted: m })
      } else if (kind === 'gif') {
        const mp4FromGif = gifToMp4Buffer(bannerBuffer)
        if (mp4FromGif) {
          await client.sendMessage(m.chat, {
            video: mp4FromGif,
            mimetype: 'video/mp4',
            gifPlayback: true,
            caption,
            contextInfo: ctx
          }, { quoted: m })
        } else {
          await client.sendMessage(m.chat, {
            document: bannerBuffer,
            mimetype: 'image/gif',
            fileName: picked,
            caption,
            contextInfo: ctx
          }, { quoted: m })
        }
      } else {
        await client.sendMessage(m.chat, {
          image: bannerBuffer,
          caption,
          contextInfo: ctx
        }, { quoted: m })
      }

      // ====== ENVIAR TEXTO ======
      await client.sendMessage(m.chat, {
        text: menu.trim(),
        contextInfo: ctx
      }, { quoted: m })

    } catch (e) {
      console.error(e)
      await m.reply(`❌ Error: ${e?.message || e}`)
    }
  }
}
