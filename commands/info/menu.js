// commands/info/menu.js
import fetch from 'node-fetch'
import moment from 'moment-timezone'
import { commands } from '../../lib/commands.js'
import fs from 'fs'
import path from 'path'

export default {
  command: ['menu', 'help', 'menú'],
  category: 'info',
  run: async ({ client, m, usedPrefix }) => {
    try {
      const cmdsList = commands || []
      const plugins = cmdsList.length

      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const botSettings = global.db?.data?.settings?.[botId] || {}

      const botname = global.botname || botSettings.namebot || 'Lucoa-Bot-MD'
      const botVersion = botSettings.namebot2 || '3.5'
      const owner = botSettings.owner || 'MatheoDark'

      // =========================
      // BANNER: URL o /media
      // =========================
      // Si en settings.banner pone una URL (http/https) la usará.
      // Si pone un nombre de archivo (ej: "banner.gif" o "3.mp4") lo buscará en /media.
      // Si no pone nada, elegirá uno random de esta lista:
      const medias = [
        '1.gif',
        '2.gif',
        '3.mp4',
        '4.mp4',
        '5.gif',
        '6.gif',
        '7.mp4',
        'banner.gif'
      ]

      const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]
      const banner = botSettings.banner || pickRandom(medias)

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

      const tiempo = moment.tz('America/Bogota').format('DD/MM/YYYY')
      const tiempo2 = moment.tz('America/Bogota').format('hh:mm A')
      const jam = moment.tz('America/Bogota').format('HH:mm:ss')
      const ucapan =
        jam < '12:00:00' ? 'Buenos días' :
        jam < '18:00:00' ? 'Buenas tardes' :
        'Buenas noches'

      // Prefijo limpio (igual lógica megumin)
      const match = (usedPrefix || '').match(/[#\/+.!-]$/)
      const cleanPrefix = match ? match[0] : (usedPrefix || '#')

      // =========================
      // LUCOA DISEÑO
      // =========================
      let menu = `\n\n`
      menu += `....․⁀⸱⁀⸱︵⸌⸃૰⳹․💥․⳼૰⸂⸍︵⸱⁀⸱⁀․....\n`
      menu += `𔓕꯭ ꯭ 𓏲꯭֟፝੭ ꯭⌑ LUCOA-BOT-MD ⌑꯭ 𓏲꯭֟፝੭꯭  ꯭𔓕\n`
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

      // ✅ MEGUMIN STYLE: usar alias reales, NO traducciones
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

      // =========================
      // ENVIAR (igual a su estilo)
      // =========================
      const bannerBuffer = await getBuffer(banner)

      await client.sendMessage(m.chat, {
        // Mantengo su “truco” de documento para que se vea como antes
        document: bannerBuffer,
        fileName: '🐉 LUCOA V3.5 🐉',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileLength: '99999999999999',
        pageCount: 2026,
        caption: menu.trim(),
        contextInfo: {
          mentionedJid: [m.sender],
          forwardingScore: 999,
          isForwarded: true,
          externalAdReply: {
            title: botname,
            body: `Powered by ${owner}`,
            showAdAttribution: true,
            thumbnailUrl: 'https://images3.alphacoders.com/814/814389.jpg',
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: 'https://github.com/MatheoDark/Lucoa-Bot-MD'
          }
        }
      }, { quoted: m })

    } catch (e) {
      console.error(e)
      await m.reply(`❌ Error: ${e?.message || e}`)
    }
  }
}
