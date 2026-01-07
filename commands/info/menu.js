import fetch from 'node-fetch'
import moment from 'moment-timezone'
import { commands } from '../../lib/commands.js'

export default {
  command: ['menu', 'help', 'menú'],
  category: 'info',
  run: async ({client, m, text, args, usedPrefix}) => {
    try {
      // --- CONFIGURACIÓN ---
      const cmdsList = commands
      let tiempo = moment.tz('America/Bogota').format('DD/MM/YYYY')
      let tiempo2 = moment.tz('America/Bogota').format('hh:mm A')
      let jam = moment.tz('America/Bogota').format('HH:mm:ss')
      let _uptime = process.uptime() * 1000
      let uptime = clockString(_uptime)

      // --- DATOS DEL BOT ---
      let plugins = commands.length
      const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
      let botSettings = global.db.data.settings[botId] || {}
      
      let botname = botSettings.namebot || 'Lucoa-Bot'
      let bannerVideo = 'https://i.imgur.com/OvoF1QZ.mp4' // Video de Lucoa (MP4)
      const link = 'https://github.com/MatheoDark/Lucoa-Bot-MD'

      // Saludo dinámico
      const saludo = jam < '12:00:00' ? 'Buenos días 🌄' : jam < '18:00:00' ? 'Buenas tardes 🌇' : 'Buenas noches 🌃';

      // --- CABECERA ESTILO RUBY ---
      let menu = `
୨୧‿̥̣‿̣̥̣̇‿̥̣୨୧‿̥̣‿̣̥̣̇‿̥̣୨୧‿̥̣‿̣̥̣̇‿̥̣୨୧୧‿̥̣‿̣̥̣̇‿̥̣୨୧
ᰔ🐉 ${saludo} *${m.pushName || 'Usuario'}*! Soy *Lucoa* (≧◡≦)

╔═══════⩽✦✰✦⩾═══════╗
       「 𝙄𝙉𝙁𝙊 𝘿𝙀 𝙇𝘼 𝘽𝙊𝙏 」
╚═══════⩽✦✰✦⩾═══════╝
║ ☆ 🐉 *𝖡𝖮𝖳*: ${botname}
║ ☆ 📚 *𝖡𝖠𝖲𝖤*: Lucoa V3.5
║ ☆ 🌐 *𝖢𝖮𝖬𝖠𝖭𝖣𝖮𝖲*: ${plugins}
║ ☆ ⏱️ *𝖠𝖢𝖳𝖨𝖵𝖮*: ${uptime}
║ ☆ 📅 *𝖥𝖤𝖢𝖧𝖠*: ${tiempo}
╚════════════════════════

🔥 *NOVEDADES V3.5*
> 🔞 *#r34 <tag>* (Packs de 5)
> 🎥 *#hentaivid* (Video Random)

✞͙͙͙͙͙͙͙͙͙͙⏜❟︵ֹ̩̥̩̥̩̥̩̩̥⏜੭🏮୧ֹ⏜︵ֹ̩̥̩̥̩̥̩̥̩̥̩̥̩̥❟⏜፞✞͙͙͙͙͙͙͙͙͙͙
`

      // --- GENERADOR AUTOMÁTICO DE COMANDOS ---
      const categories = {};
      for (const command of cmdsList) {
        const category = command.category || 'otros';
        if (!categories[category]) categories[category] = [];
        categories[category].push(command);
      }

      for (const [category, cmds] of Object.entries(categories)) {
        const catName = category.charAt(0).toUpperCase() + category.slice(1)
        
        // Cabecera de Categoría
        menu += `\n├┈ ↷ 𝙈𝙀𝙉𝙐 ${catName.toUpperCase()}\n├• ✐; ₊˚✦୧︰\n├┈・──・──・﹕₊˚ ✦・୨୧・\n`
        
        cmds.forEach(cmd => {
            const mainCmd = Array.isArray(cmd.command) ? cmd.command[0] : cmd.command;
            // Estilo de comando tipo Ruby
            menu += `┣ ☃️ *${usedPrefix}${mainCmd}*\n> ✦ ${cmd.desc || 'Sin descripción'}\n`
        });
        menu += `╚▭࣪▬ִ▭࣪▬ִ▭࣪▬ִ▭࣪▬ִ▭࣪▬ִ▭࣪▬▭╝\n`
      }

      menu += `\n> 🐉 Powered by MatheoDark`

      // --- ENVIAR MENÚ CON VIDEO ---
      await client.sendMessage(m.chat, {
        video: { url: bannerVideo },
        caption: menu.trim(),
        gifPlayback: true, // Se reproduce como GIF
        contextInfo: {
          mentionedJid: [m.sender],
          isForwarded: true,
          forwardingScore: 999,
          externalAdReply: {
            title: `🐉 ${botname} MD`,
            body: '¡Disfruta los comandos!',
            thumbnailUrl: 'https://i.imgur.com/Tyf8g9A.jpeg', // Imagen estática para la miniatura
            sourceUrl: link,
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: m })

    } catch (e) {
      console.error(e)
      await m.reply(`❌ Error: ${e.message}`)
    }
  }
}

function clockString(ms) {
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}
