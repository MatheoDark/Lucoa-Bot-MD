import sharp from 'sharp'
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function convertAnimatedWebpToMp4(buffer) {
  const tmpDir = join(os.tmpdir(), 'toimage_convert')
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`
  const inputPath = join(tmpDir, `${id}_in.webp`)
  const outputPath = join(tmpDir, `${id}_out.mp4`)

  try {
    writeFileSync(inputPath, buffer)

    const cmd = `ffmpeg -y -ignore_loop 0 -i "${inputPath}" -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 28 -an -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -movflags +faststart "${outputPath}"`
    await execAsync(cmd, { timeout: 120000 })

    return readFileSync(outputPath)
  } finally {
    try { unlinkSync(inputPath) } catch {}
    try { unlinkSync(outputPath) } catch {}
  }
}

export default {
  command: ['toimage'],
  category: 'utils',
  run: async ({ client, m }) => {
    try {
      const q = m.quoted || m
      const mime = (q.msg || q).mimetype || ''

      if (!mime) {
        return m.reply('🐲 Responde a un *sticker* usando *#toimage* (◕ᴗ◕)')
      }

      if (!/webp/i.test(mime)) {
        return m.reply('🐲 El mensaje respondido no es un *sticker* válido (◕︿◕)')
      }

      await m.react('⏳')

      const stickerBuffer = await q.download()
      if (!stickerBuffer?.length) {
        return m.reply('❌ No pude descargar ese sticker.')
      }

      const isAnimated = Boolean(q?.isAnimated || q?.msg?.isAnimated)

      if (isAnimated) {
        const videoBuffer = await convertAnimatedWebpToMp4(stickerBuffer)

        await client.sendMessage(
          m.chat,
          {
            video: videoBuffer,
            mimetype: 'video/mp4',
            gifPlayback: true,
            caption: '✅ Sticker animado convertido a video.'
          },
          { quoted: m }
        )
      } else {
        const imageBuffer = await sharp(stickerBuffer).png().toBuffer()

        await client.sendMessage(
          m.chat,
          { image: imageBuffer, caption: '✅ Sticker convertido a imagen.' },
          { quoted: m }
        )
      }

      await m.react('✅')
    } catch (e) {
      console.error('Error en toimage:', e)
      await m.react('❌')
      m.reply(`❌ Error al convertir sticker: ${e.message}`)
    }
  }
}