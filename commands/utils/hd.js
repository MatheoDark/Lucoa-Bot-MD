import fetch from 'node-fetch'
import uploadImage from '../../lib/uploadImage.js'

export default {
  command: ['hd'],
  category: 'utils',
  run: async ({ client, m }) => {
    try {
      const q = m.quoted || m
      const mime = q.mimetype || q.msg?.mimetype || ''

      if (!mime) {
        return m.reply(`🐲 Envía una *imagen* con el comando (◕ᴗ◕)`)
      }

      if (!/image\/(jpe?g|png)/.test(mime)) {
        return m.reply(`🐲 Formato *${mime}* no compatible (◕︿◕)`)
      }

      const media = await q.download()

      const link = await uploadImage(media)
      if (!link) {
        return m.reply('🐲 No se pudo subir la imagen (╥﹏╥)')
      }

      // Usar la API principal del bot para upscale
      const apiUrl = `${global.api?.url || 'https://api.stellarwa.xyz'}/tools/upscale?imageUrl=${encodeURIComponent(link)}&key=${global.api?.key || 'Diamond'}`

      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'WhatsApp-Bot', 'Accept': 'application/json' },
        timeout: 30000
      })

      if (!res.ok) throw new Error(`API HTTP ${res.status}`)

      const ct = res.headers.get('content-type') || ''
      let buffer

      if (ct.includes('image')) {
        // La API devuelve imagen directa
        buffer = Buffer.from(await res.arrayBuffer())
      } else {
        // La API devuelve JSON con URL
        const json = await res.json()
        const resultUrl = json.result || json.data?.url || json.url
        if (!resultUrl) throw new Error('No se pudo procesar la imagen.')
        const imgRes = await fetch(resultUrl)
        if (!imgRes.ok) throw new Error('No se pudo descargar la imagen HD')
        buffer = Buffer.from(await imgRes.arrayBuffer())
      }

      await client.sendMessage(
        m.chat,
        { image: buffer },
        { quoted: m }
      )

    } catch (err) {
      await m.reply(`❌ Error: ${err.message}`)
    }
  }
}