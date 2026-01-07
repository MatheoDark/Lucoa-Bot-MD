// commands/utils/qc.js
import fs from 'fs'

const DEFAULT_PP = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'

function cleanText(t = '') {
  return String(t).replace(/\s+/g, ' ').trim()
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

  return nums.map(n => n.replace(/[^0-9]/g, '')).filter(Boolean)
}

export default {
  command: ['qc'],
  category: 'utils',
  group: true,
  register: true,

  run: async ({ client, m, args }) => {
    try {
      // 1) Obtener texto (args o quoted)
      let text = ''
      if (args?.length) text = args.join(' ')
      else if (m.quoted?.text) text = m.quoted.text
      else return client.reply(m.chat, '📌 Te faltó el texto (o responde un mensaje con #qc).', m)

      text = cleanText(text)
      if (!text) return client.reply(m.chat, '📌 Te faltó el texto (o responde un mensaje con #qc).', m)

      // 2) Restricción owners (igual a tu código original)
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
          return client.reply(
            m.chat,
            `🌸 *Ara ara~... ¿mencionar a uno de mis creadores?*\n✨ *Qué atrevido eres, onii-chan...*\n💢 *Pero no puedo traicionar a uno de mis creadores...*\n😈 *...a menos que quieras desaparecer con él~* 💀`,
            m
          )
        }
      }

      // 3) Target (mencionado / quoted / sender)
      const who =
        (m.mentionedJid && m.mentionedJid[0]) ? m.mentionedJid[0]
        : (m.quoted?.sender) ? m.quoted.sender
        : m.sender

      // 4) Quitar @mención del texto si venía pegada
      const whoNum = who.split('@')[0]
      const mentionRegex = new RegExp(`@${whoNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g')
      const mishi = cleanText(text.replace(mentionRegex, ''))

      if (mishi.length > 30) {
        return client.reply(m.chat, '📌 El texto no puede tener más de 30 caracteres.', m)
      }

      // 5) Foto + nombre
      let pp = DEFAULT_PP
      try { pp = await client.profilePictureUrl(who, 'image') } catch {}

      const nombre =
        global.db?.data?.users?.[who]?.name ||
        (who === m.sender ? (m.pushName || 'Usuario') : 'Usuario')

      // 6) Generar quote (API)
      const obj = {
        type: 'quote',
        format: 'png',
        backgroundColor: '#000000',
        width: 512,
        height: 768,
        scale: 2,
        messages: [{
          entities: [],
          avatar: true,
          from: {
            id: 1,
            name: nombre,
            photo: { url: pp }
          },
          text: mishi,
          replyMessage: {}
        }]
      }

      const res = await fetch('https://bot.lyo.su/quote/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj)
      })

      const json = await res.json()
      const base64img = json?.result?.image
      if (!base64img) return client.reply(m.chat, '❌ No se pudo generar la imagen del quote.', m)

      const buffer = Buffer.from(base64img, 'base64')

      // 7) Pack/author igual que tu sticker.js
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const botSettings = global.db?.data?.settings?.[botId] || {}
      const botname = botSettings.namebot || 'Lucoa'

      const user = global.db?.data?.users?.[m.sender] || {}
      const name = user.name || (m.pushName || 'Usuario')

      const packname = user.metadatos || global.packsticker || 'Lucoa'
      const author =
        user.metadatos2 ||
        global.packsticker2 ||
        `Socket:\n↳@${botname}\n👹Usuario:\n↳@${name}`

      // 8) Enviar como sticker (igual que tu base)
      const enc = await client.sendImageAsSticker(m.chat, buffer, m, { packname, author })
      try { fs.unlinkSync(enc) } catch {}

    } catch (e) {
      console.error(e)
      return m.reply('❌ Error al generar QC: ' + (e?.message || e))
    }
  }
}
