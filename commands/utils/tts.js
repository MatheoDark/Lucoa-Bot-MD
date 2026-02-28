import fetch from 'node-fetch'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Verificar si ffmpeg está disponible
let _ffmpeg = null
function hasFfmpeg() {
  if (_ffmpeg !== null) return _ffmpeg
  try { execSync('which ffmpeg', { stdio: 'ignore' }); _ffmpeg = true } catch { _ffmpeg = false }
  return _ffmpeg
}

// Voces con nombre, idioma base y ajuste de pitch
const voices = [
  { name: 'Lucoa',    lang: 'es',    pitch: 1.0,  speed: 1.0  },
  { name: 'María',    lang: 'es',    pitch: 1.2,  speed: 1.0  },
  { name: 'Carlos',   lang: 'es',    pitch: 0.85, speed: 0.95 },
  { name: 'Sofía',    lang: 'es',    pitch: 1.3,  speed: 1.05 },
  { name: 'Diego',    lang: 'es',    pitch: 0.75, speed: 0.9  },
  { name: 'Elena',    lang: 'es',    pitch: 1.15, speed: 1.1  },
  { name: 'Pedro',    lang: 'es',    pitch: 0.8,  speed: 1.0  },
  { name: 'Isabella', lang: 'es',    pitch: 1.35, speed: 1.0  },
  { name: 'Emma',     lang: 'en-GB', pitch: 1.15, speed: 1.0  },
  { name: 'Brian',    lang: 'en-US', pitch: 0.9,  speed: 1.0  },
  { name: 'Sakura',   lang: 'ja',    pitch: 1.25, speed: 1.0  },
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
    const uid = Date.now() + '_' + Math.random().toString(36).slice(2)
    const rawFile = path.join(tmpDir, `tts_raw_${uid}.mp3`)
    const outFile = path.join(tmpDir, `tts_out_${uid}.mp3`)

    try {
      // Descargar audio con curl (más confiable que node-fetch para binarios)
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${selectedVoice.lang}&client=tw-ob&q=${encodeURIComponent(text)}`
      
      execSync(`curl -s -L -o "${rawFile}" -H "User-Agent: Mozilla/5.0" -H "Referer: https://translate.google.com/" "${ttsUrl}"`, { timeout: 15000 })

      if (!fs.existsSync(rawFile) || fs.statSync(rawFile).size < 100) {
        throw 'Audio vacío de Google TTS'
      }

      let finalFile = rawFile

      // Modificar pitch con ffmpeg si disponible y la voz lo requiere
      if (selectedVoice.pitch !== 1.0 && hasFfmpeg()) {
        try {
          const sampleRate = Math.round(44100 * selectedVoice.pitch)
          execSync(
            `ffmpeg -y -i "${rawFile}" -af "asetrate=${sampleRate},aresample=44100,atempo=${selectedVoice.speed}" "${outFile}"`,
            { timeout: 15000, stdio: 'ignore' }
          )
          if (fs.existsSync(outFile) && fs.statSync(outFile).size > 100) {
            finalFile = outFile
          }
        } catch (ffErr) {
          console.error('TTS: ffmpeg falló, usando audio original')
        }
      }

      const audioBuffer = fs.readFileSync(finalFile)

      await client.sendMessage(m.chat, {
        audio: audioBuffer,
        ptt: true,
        mimetype: 'audio/ogg; codecs=opus'
      }, { quoted: m })

    } catch (e) {
      console.error('Error TTS:', e)
      await m.reply('*⚠️ Error al generar el audio de voz.*')
    } finally {
      try { fs.unlinkSync(rawFile) } catch {}
      try { fs.unlinkSync(outFile) } catch {}
    }
  }
}
