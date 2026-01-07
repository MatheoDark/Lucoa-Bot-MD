// commands/utils/qc.js
import axios from 'axios'

const DEFAULT_PP = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'

function cleanText(t) {
  return String(t || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

function getOwnersDigits() {
  const raw = global.owner || globalThis.owner || []
  const nums = []

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (Array.isArray(item) && item[0]) nums.push(String(item[0]))
      else if (typeof item === 'string') nums.push(item)
      else if (item?.number) nums.push(String(item.number))
    }
  } else if (typeof raw === 'string') {
    nums.push(raw)
  }

  return nums
    .map(n => String(n).replace(/[^0-9]/g, ''))
    .filter(Boolean)
}

// Busca el helper sticker en rutas típicas de bots Megumin/Gata
async function resolveStickerHelper() {
  const candidates = [
    // si tu base lo tiene acá:
    '../../lib/sticker.js',
    '../../lib/sticker/sticker.js',
    '../../lib/sticker/index.js',
    // si tu base exporta funciones en lib/convert o similares:
    '../../lib/convert.js',
    '../../lib/converter.js',
  ]

  for (const path of candidates) {
    try {
      const mod = await import(path)
      if (typeof mod.sticker === 'function') return mod.sticker
      if (typeof mod.default === 'function') return mod.default
    } catch {}
  }
  return null
}

export default {
  command: ['qc'],
  category: 'utils',
  group: true,
  register: true,

  run: async ({ client, m, args }) => {
    try {
      if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos.')

      // Texto
      let text = ''
      if (args?.length) text = args.join(' ')
      else if (m.quoted?.text) text = m.quoted.text
      else return m.reply('📌 Te faltó el texto (o responde un mensaje con #qc).')

      text = cleanText(text)
      if (!text) return m.reply('📌 Te faltó el texto (o responde un mensaje con #qc).')

      // Restricción owners (igual a tu comando original)
      const senderNum = (m.sender || '').split('@')[0]
      const owners = getOwnersDigits()
      const esOwner = owners.includes(String(senderNum).replace(/[^0-9]/g, ''))

      if (!esOwner) {
        const textoMin = text.toLowerCase()
        const mencionados = (m.mentionedJid || []).map(jid => jid.split('@')[0])

        const seMencionaOwner = owners.some(owner =>
          textoMin.includes(owner) ||
          textoMin.includes(`@${owner}`) ||
          mencionados.includes(owner)
        )

        if (seMencionaOwner) {
          return m.reply(
            `🌸 *Ara ara~... ¿mencionar a uno de mis creadores?*\n` +
            `✨ *Qué atrevido eres, onii-chan...*\n` +
            `💢 *Pero no puedo traicionar a uno de mis creadores...*\n` +
            `😈 *...a menos que quieras desaparecer con él~* 💀`
          )
        }
      }

      // Target
      const who =
        (m.mentionedJid && m.mentionedJid[0]) ? m.mentionedJid[0]
        : (m.quoted?.sender) ? m.quoted.sender
        : m.sender

      // Quitar @mención del texto si venía pegado
      const whoNum = who.split('@')[0]
      const mentionRegex = new RegExp(`@${whoNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g')
      const mishi = cleanText(text.replace(mentionRegex, ''))

      if (mishi.length > 30) return m.reply('📌 El texto no puede tener más de 30 caracteres.')

      // Foto perfil + nombre
      let pp = DEFAULT_PP
      try { pp = await client.profilePictureUrl(who, 'image') } catch {}

      const nombre =
        global.db?.data?.users?.[who]?.name ||
        (who === m.sender ? (m.pushName || 'Usuario') : 'Usuario')

      // Payload quote
      const payload = {
        type: 'quote',
        format: 'png',
        backgroundColor: '#000000',
        width: 512,
        height: 768,
        scale: 2,
        messages: [
          {
            entities: [],
            avatar: true,
            from: { id: 1, name: nombre, photo: { url: pp } },
            text: mishi,
            replyMessage: {}
          }
        ]
      }

      const { data } = await axios.post('https://bot.lyo.su/quote/generate', payload, {
        headers: { 'Content-Type': 'application/json' }
      })

      const base64img = data?.result?.image
      if (!base64img) return m.reply('❌ No se pudo generar la imagen del quote.')

      const buffer = Buffer.from(base64img, 'base64')

      // Pack/Author
      const userId = m.sender
      const packstickers = global.db?.data?.users?.[userId] || {}
      const packname = packstickers.text1 || global.packsticker || 'Lucoa'
      const author = packstickers.text2 || global.packsticker2 || 'Bot'

      // 1) Intentar helper sticker (si existe en tu base)
      const stickerFn = await resolveStickerHelper()
      if (stickerFn) {
        const stiker = await stickerFn(buffer, false, packname, author)
        if (stiker) {
          if (typeof client.sendFile === 'function') {
            return client.sendFile(m.chat, stiker, 'qc.webp', '', m)
          }
          return client.sendMessage(m.chat, { sticker: stiker }, { quoted: m })
        }
      }

      // 2) Fallback: si tu base tiene sendImageAsSticker
      if (typeof client.sendImageAsSticker === 'function') {
        await client.sendImageAsSticker(m.chat, buffer, m, { packname, author })
        return
      }

      // 3) Si nada existe, avisar claro
      return m.reply(
        '❌ Tu base no trae helper de sticker (lib/sticker) ni client.sendImageAsSticker.\n' +
        '📌 Revisa qué archivo usa el comando /sticker de tu bot y lo adaptamos a qc.'
      )

    } catch (e) {
      console.error(e)
      return m.reply('❌ Ocurrió un error al generar el QC.')
    }
  }
}
