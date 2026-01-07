// commands/utils/qc.js
// Port de qc (quote sticker) a la arquitectura Megumin-Bot-MD v3+

import axios from 'axios'
import PhoneNumber from 'awesome-phonenumber'
import { sticker } from '../../lib/sticker.js'

const DEFAULT_PP = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'

function getOwnersDigits() {
  // Soporta varios formatos posibles de global.owner
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

function cleanText(t) {
  return String(t || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

export default {
  command: ['qc'],
  category: 'utils',
  group: true,       // por si tu core lo respeta
  register: true,    // por si tu core lo respeta

  run: async ({ client, m, args, usedPrefix }) => {
    try {
      // 1) Solo grupos (doble seguro)
      if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos.')
      }

      // 2) Sacar texto: args o texto citado
      let text = ''
      if (args?.length) text = args.join(' ')
      else if (m.quoted?.text) text = m.quoted.text
      else return m.reply('📌 Te faltó el texto (o responde un mensaje con #qc).')

      text = cleanText(text)
      if (!text) return m.reply('📌 Te faltó el texto (o responde un mensaje con #qc).')

      // 3) Restricción: si NO es owner, no permitir menciones a owners
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

      // 4) A quién se le hace el QC (mención > quoted > sender)
      const who =
        (m.mentionedJid && m.mentionedJid[0]) ? m.mentionedJid[0]
        : (m.quoted?.sender) ? m.quoted.sender
        : m.sender

      // 5) Quitar @mención del texto si venía pegado
      const whoNum = who.split('@')[0]
      const mentionRegex = new RegExp(`@${whoNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g')
      const mishi = cleanText(text.replace(mentionRegex, ''))

      if (mishi.length > 30) {
        return m.reply('📌 El texto no puede tener más de 30 caracteres.')
      }

      // 6) Foto de perfil + nombre
      let pp = DEFAULT_PP
      try {
        // algunas bases usan client.profilePictureUrl(jid, 'image')
        pp = await client.profilePictureUrl(who, 'image')
      } catch {}

      let nombre =
        global.db?.data?.users?.[who]?.name ||
        (who === m.sender ? (m.pushName || 'Usuario') : 'Usuario')

      // 7) Payload para el generador de quote
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
            from: {
              id: 1,
              name: nombre,
              photo: { url: pp }
            },
            text: mishi,
            replyMessage: {}
          }
        ]
      }

      // 8) Llamada API quote
      const { data } = await axios.post('https://bot.lyo.su/quote/generate', payload, {
        headers: { 'Content-Type': 'application/json' }
      })

      const base64img = data?.result?.image
      if (!base64img) return m.reply('❌ No se pudo generar la imagen del quote.')

      const buffer = Buffer.from(base64img, 'base64')

      // 9) Packname/author para sticker (por usuario o global)
      const userId = m.sender
      const packstickers = global.db?.data?.users?.[userId] || {}

      const texto1 = packstickers.text1 || global.packsticker || 'Lucoa'
      const texto2 = packstickers.text2 || global.packsticker2 || 'Bot'

      const stiker = await sticker(buffer, false, texto1, texto2)
      if (!stiker) return m.reply('❌ No se pudo crear el sticker.')

      // 10) Enviar sticker (compatibilidad con distintas bases)
      if (typeof client.sendFile === 'function') {
        return client.sendFile(m.chat, stiker, 'qc.webp', '', m)
      }

      return client.sendMessage(
        m.chat,
        { sticker: stiker },
        { quoted: m }
      )

    } catch (e) {
      console.error(e)
      return m.reply('❌ Ocurrió un error al generar el QC.')
    }
  }
}
