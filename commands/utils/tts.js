import fetch from 'node-fetch'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

// Voces con nombre, idioma base y ajuste de pitch
const voices = [
  { name: 'Lucoa',    lang: 'es',    pitch: 1.0,  speed: 1.0  },
  { name: 'María',    lang: 'es',    pitch: 1.25, speed: 1.0  },
  { name: 'Carlos',   lang: 'es',    pitch: 0.8,  speed: 0.95 },
  { name: 'Sofía',    lang: 'es',    pitch: 1.35, speed: 1.05 },
  { name: 'Diego',    lang: 'es',    pitch: 0.7,  speed: 0.9  },
  { name: 'Elena',    lang: 'es',    pitch: 1.15, speed: 1.1  },
  { name: 'Pedro',    lang: 'es',    pitch: 0.75, speed: 1.0  },
  { name: 'Isabella', lang: 'es',    pitch: 1.4,  speed: 1.0  },
  { name: 'Emma',     lang: 'en-GB', pitch: 1.2,  speed: 1.0  },
  { name: 'Brian',    lang: 'en-US', pitch: 0.85, speed: 1.0  },
  { name: 'Sakura',   lang: 'ja',    pitch: 1.3,  speed: 1.0  },
  { name: 'Pierre',   lang: 'fr',    pitch: 0.9,  speed: 1.0  },
]

export default {
  command: ['tts', 'texttospeech'],
  category: 'utils',
  desc: 'Convierte texto a voz con voces aleatorias.',

  run: async ({ client, m, args, usedPrefix, command }) => {
    let text = ''

    if (!args || !args.length) {
      const quoted = m.quoted?.text
      if (!quoted) {
        const voiceList = voices.map(v => `  • *${v.name}*`).join('\n')
        return m.reply(
          `*⚠️ Escribe un texto para convertir a voz.*\n` +
          `Ejemplo: ${usedPrefix + command} Hola, soy Lucoa\n` +
          `Con voz: ${usedPrefix + command} María Hola mundo\n\n` +
          `*🎙️ Voces disponibles:*\n${voiceList}`
        )
      }
      text = quoted
    } else {
      text = args.join(' ')
    }

    // Verificar si el primer argumento es un nombre de voz
    let selectedVoice = null
    const firstWord = args?.[0]?.toLowerCase()
    if (firstWord) {
      const found = voices.find(v => v.name.toLowerCase() === firstWord)
      if (found) {
        selectedVoice = found
        text = args.slice(1).join(' ')
        if (!text) {
          const quoted = m.quoted?.text
          if (!quoted) return m.reply(`*⚠️ Escribe un texto después del nombre de la voz.*`)
          text = quoted
        }
      }
    }

    // Si no se eligió voz, seleccionar una al azar
    if (!selectedVoice) {
      selectedVoice = voices[Math.floor(Math.random() * voices.length)]
    }

    if (text.length > 500) {
      return m.reply('*⚠️ El texto es demasiado largo. Máximo 500 caracteres.*')
    }

    const tmpDir = os.tmpdir()
    const id = Date.now() + '_' + Math.random().toString(36).slice(2)
    const inputFile = path.join(tmpDir, `tts_in_${id}.mp3`)
    const outputFile = path.join(tmpDir, `tts_out_${id}.mp3`)

    try {
      // Descargar audio base de Google TTS
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${selectedVoice.lang}&client=tw-ob&q=${encodeURIComponent(text)}`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/'
        }
      })

      if (!res.ok) throw 'No se pudo generar el audio.'

      const buffer = Buffer.from(await res.arrayBuffer())
      fs.writeFileSync(inputFile, buffer)

      // Modificar pitch y velocidad con ffmpeg
      const sampleRate = Math.round(44100 * selectedVoice.pitch)
      const atempo = selectedVoice.speed
      await execAsync(
        `ffmpeg -y -i "${inputFile}" -af "asetrate=${sampleRate},aresample=44100,atempo=${atempo}" "${outputFile}"`,
        { timeout: 10000 }
      )

      const audioBuffer = fs.readFileSync(outputFile)

      await client.sendMessage(m.chat, {
        audio: audioBuffer,
        ptt: true,
        mimetype: 'audio/mpeg'
      }, { quoted: m })

    } catch (e) {
      console.error('Error TTS:', e)
      await m.reply('*⚠️ Error al generar el audio de voz.*')
    } finally {
      // Limpiar archivos temporales
      try { fs.unlinkSync(inputFile) } catch {}
      try { fs.unlinkSync(outputFile) } catch {}
    }
  }
}
