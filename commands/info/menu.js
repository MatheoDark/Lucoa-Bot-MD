// commands/info/menu.js
import fetch from 'node-fetch'
import moment from 'moment-timezone'
import { commands } from '../../lib/commands.js'
import fs from 'fs'
import path from 'path'

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

export default {
  command: ['menu', 'help', 'menú'],
  category: 'info',
  run: async ({ client, m, usedPrefix }) => {
    try {
      const cmdsList = commands || []
      const plugins = cmdsList.length

      const botId = getSelfId(client)
      if (!botId) return m.reply('❌ No pude obtener el ID del bot.')

      const botSettings = global.db?.data?.settings?.[botId] || {}

      // ✅ NOMBRE / CREADOR (como pidió)
      const botname = 'Lucoa Bot'
      const owner = 'MatheoDark'

      // Si quiere mantener versión desde settings:
      const botVersion = botSettings.version || botSettings.namebot2 || '3.5'

      // =========================
      // BANNER: VIDEO desde /media
      // =========================
      // Si settings.banner es URL http/https -> lo usa
      // Si settings.banner es "3.mp4" -> lo busca en /media
      // Si no hay settings.banner -> elige un mp4 random
      const mediasVideo = ['3.mp4', '4.mp4', '7.mp4']

      const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]
      const banner = botSettings.banner || pickRandom(mediasVideo)

      const getBuffer = async (src) => {
        // URL
        if (/^https?:\/\//i.test(src)) {
          return await (await fetch(src)).buffer()
        }

        // Archivo local en /media
        const localPath = path.join(process.cwd(), 'media', src)
        if (!fs.existsSync(localPath)) {
          throw new Error(`No existe el archivo: /media/${src}`)
        }
        return fs.readFileSync(localPath)
      }

      const tiempo = moment.tz('America/Santiago').format('DD/MM/YYYY')
      const tiempo2 = moment.tz('America/Santiago').format('hh:mm A')
      const jam = moment.tz('America/Santiago').format('HH:mm:ss')
      const ucapan =
        jam < '12:00:00' ? 'Buenos días' :
        jam < '18:00:00' ? 'Buenas tardes' :
        'Buenas noches'

      // Prefijo limpio
      const match = (usedPrefix || '').match(/[#\/+.!-]$/)
      const cleanPrefix = match ? match[0] : (usedPrefix || '#')

      // =========================
      // DISEÑO MENÚ
      // =========================
      let menu = `\n\n`
      menu += `....․⁀⸱⁀⸱︵⸌⸃૰⳹․💥․⳼૰⸂⸍︵⸱⁀⸱⁀․....\n`
      menu += `𔓕꯭ ꯭ 𓏲꯭֟፝੭ ꯭⌑ LUCOA BOT ⌑꯭ 𓏲꯭֟፝੭꯭  ꯭𔓕\n`
      menu += `▬͞▭͞▬͞▭͞▬͞▭͞▬͞▭͞▬͞▭͞▬͞▭͞▬͞▭͞▬\n`
      menu += `> ${ucapan}  *${m.pushName ? m.pushName : 'Sin nombre'}*\n\n`
      menu += `.    ╭─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎⃪𐇽۫۬🍨⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╮\n`
      menu += `. ☁️⬪࣪ꥈ𑁍⃪࣭۪ٜ݊݊݊݊݊໑ٜ࣪ 🄼🄴🄽🅄-🄱🄾🅃໑⃪࣭۪ٜ݊݊݊݊𑁍ꥈ࣪⬪\n`
      menu += `֪࣪    ╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎⃪𐇽۫۬🍧⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯\n`
      menu += `ׅㅤ𓏸𓈒ㅤׄ *Creador ›* ${owner}\n`
      menu += `ׅㅤ𓏸𓈒ㅤׄ *Plugins ›* ${plugins}\n`
      menu += `ׅㅤ𓏸𓈒ㅤׄ *Versión ›* ^${botVersion} ⋆. 𐙚 ˚\n`
      menu += `ׅㅤ𓏸𓈒ㅤׄ *Fecha ›* ${tiempo}, ${tiempo2}\n`
      menu += `╚▭࣪▬ִ▭࣪▬ִ▭࣪▬ִ▭࣪▬ִ▭࣪▬ִ▭࣪▬▭╝\n`

      // =========================
      // CATEGORÍAS
      // =========================
      const categories = {}
      for (const command of cmdsList) {
        const category = command.category || 'otros'
        if (!categories[category]) categories[category] = []
        categories[category].push(command)
      }

      // estilo megumin
      const getMeguminCmd = (cmd) => {
        const aliasArr = Array.isArray(cmd.alias) ? cmd.alias : []
        let main = aliasArr[0]

        if (!main) {
          if (Array.isArray(cmd.command) && cmd.command.length) main = cmd.command[0]
          else main = cmd.command || cmd.name || '???'
        }

        const aliasClean = String(main).split(/[\/#!+.\-]+/).pop().toLowerCase()
        return `[${cleanPrefix}${aliasClean}]`
      }

      for (const [category, cmds] of Object.entries(categories)) {
        const catName = category.charAt(0).toUpperCase() + category.slice(1)

        menu += `\n.    ╭─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎⃪𐇽۫۬🔥⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╮\n`
        menu += `.   ☁️⬪࣪ꥈ𑁍⃪࣭۪ٜ݊݊݊݊݊໑ٜ࣪ *${catName}* ໑⃪࣭۪ٜ݊݊݊݊𑁍ꥈ࣪⬪☁️ׅ\n`
        menu += `֪࣪    ╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎⃪𐇽۫۬🔥⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯\n`

        cmds.forEach(cmd => {
          const cmdShow = getMeguminCmd(cmd)
          menu += `֯　ׅ🫟ֶ֟፝֯ㅤ *${cmdShow}*\n`
          menu += `> _*${cmd.desc || ''}*_\n\n`
        })
      }

      const menuText = menu.trim()

      // =========================
      // ENVIAR: VIDEO + MENÚ
      // =========================
      const bannerBuffer = await getBuffer(banner)

      // WhatsApp a veces recorta captions muy largas.
      // Para que NO se corte, enviamos 2 mensajes si el menú es grande.
      const MAX_CAPTION = 900

      const commonContext = {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        externalAdReply: {
          title: botname,
          body: `Creador: ${owner}`,
          showAdAttribution: true,
          thumbnailUrl: 'https://images3.alphacoders.com/814/814389.jpg',
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: 'https://github.com/MatheoDark/Lucoa-Bot-MD'
        }
      }

      if (menuText.length <= MAX_CAPTION) {
        // 1 solo mensaje: video con caption
        await client.sendMessage(m.chat, {
          video: bannerBuffer,
          mimetype: 'video/mp4',
          caption: menuText,
          contextInfo: commonContext
        }, { quoted: m })
      } else {
        // 2 mensajes: primero video, luego menú completo
        await client.sendMessage(m.chat, {
          video: bannerBuffer,
          mimetype: 'video/mp4',
          caption: `🐉 ${botname} — Menú`,
          contextInfo: commonContext
        }, { quoted: m })

        await client.sendMessage(m.chat, {
          text: menuText,
          contextInfo: commonContext
        }, { quoted: m })
      }

    } catch (e) {
      console.error(e)
      await m.reply(`❌ Error: ${e?.message || e}`)
    }
  }
}
