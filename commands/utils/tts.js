import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

// Voces con nombre, idioma base y ajuste de pitch
const voices = [
  { name: 'Lucoa',    lang: 'es',    pitch: 1.0,  speed: 0.92 },
  { name: 'María',    lang: 'es',    pitch: 1.2,  speed: 0.90 },
  { name: 'Carlos',   lang: 'es',    pitch: 0.85, speed: 0.88 },
  { name: 'Sofía',    lang: 'es',    pitch: 1.3,  speed: 0.92 },
  { name: 'Diego',    lang: 'es',    pitch: 0.75, speed: 0.86 },
  { name: 'Elena',    lang: 'es',    pitch: 1.15, speed: 0.90 },
  { name: 'Pedro',    lang: 'es',    pitch: 0.8,  speed: 0.88 },
  { name: 'Isabella', lang: 'es',    pitch: 1.35, speed: 0.90 },
  { name: 'Emma',     lang: 'en-GB', pitch: 1.15, speed: 0.90 },
  { name: 'Brian',    lang: 'en-US', pitch: 0.9,  speed: 0.90 },
  { name: 'Sakura',   lang: 'ja',    pitch: 1.25, speed: 0.92 },
  { name: 'Pierre',   lang: 'fr',    pitch: 0.9,  speed: 0.90 },
]

const RANDOM_STYLE_MODES = [
  { name: 'normal', speed: 1.0, pitchBoost: 1.0 },
  { name: 'chistoso', speed: 1.06, pitchBoost: 1.22 },
]

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
const normalizeToken = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export default {
  command: ['tts', 'texttospeech'],
  category: 'utils',
  desc: 'Convierte texto a voz con voces aleatorias.',

  run: async ({ client, m, args, usedPrefix, command }) => {
    let text = ''
    const tokens = [...(args || [])]

    if (!args || !args.length) {
      const quoted = m.quoted?.text
      if (!quoted) {
        const voiceList = voices.map(v => `  • *${v.name}*`).join('\n')
        return m.reply(
          `*⚠️ Escribe un texto para convertir a voz.*\n` +
          `Ejemplo: ${usedPrefix + command} Hola, soy Lucoa\n` +
          `Con voz: ${usedPrefix + command} María Hola mundo\n\n` +
          `> El estilo se aplica automáticamente de forma aleatoria en cada uso.\n\n` +
          `*🎙️ Voces disponibles:*\n${voiceList}`
        )
      }
      text = quoted
    } else {
      text = args.join(' ')
    }

    // Verificar voz en el primer argumento
    let selectedVoice = null
    const randomStyle = RANDOM_STYLE_MODES[Math.floor(Math.random() * RANDOM_STYLE_MODES.length)]

    if (tokens.length) {
      const current = normalizeToken(tokens[0])
      const foundVoice = voices.find(v => normalizeToken(v.name) === current)
      if (foundVoice) {
        selectedVoice = foundVoice
        tokens.shift()
      }
    }

    if (tokens.length) {
      text = tokens.join(' ')
    }

    if (!text) {
      const quoted = m.quoted?.text
      if (!quoted) {
        return m.reply('*⚠️ Escribe un texto para convertir a voz.*')
      }
      text = quoted
    }

    // Si no se eligió voz, seleccionar una al azar
    if (!selectedVoice) {
      selectedVoice = voices[Math.floor(Math.random() * voices.length)]
    }

    text = text.replace(/\s+/g, ' ').trim()

    if (text.length > 500) {
      return m.reply('*⚠️ El texto es demasiado largo. Máximo 500 caracteres.*')
    }

    const tmpDir = os.tmpdir()
    const uid = Date.now() + '_' + Math.random().toString(36).slice(2)
    const rawFile = path.join(tmpDir, `tts_raw_${uid}.mp3`)
    const outFile = path.join(tmpDir, `tts_out_${uid}.ogg`)

    try {
      // Descargar audio con curl (más confiable que node-fetch para binarios)
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${selectedVoice.lang}&client=tw-ob&q=${encodeURIComponent(text)}`
      
      await execAsync(`curl -s -L -o "${rawFile}" -H "User-Agent: Mozilla/5.0" -H "Referer: https://translate.google.com/" "${ttsUrl}"`, { timeout: 15000 })

      if (!fs.existsSync(rawFile) || fs.statSync(rawFile).size < 100) {
        throw 'Audio vacío de Google TTS'
      }

      // Convertir a OGG Opus (formato real de notas de voz de WhatsApp)
      const needsPitch = selectedVoice.pitch !== 1.0
      const funnyMode = randomStyle.name === 'chistoso'
      const funnyPitchBoost = randomStyle.pitchBoost
      const sampleRate = Math.round(44100 * selectedVoice.pitch * funnyPitchBoost)
      const finalSpeed = clamp(selectedVoice.speed * randomStyle.speed, 0.75, 1.25)
      const filters = (needsPitch || funnyMode)
        ? `asetrate=${sampleRate},aresample=48000,atempo=${finalSpeed.toFixed(3)}`
        : `atempo=${finalSpeed.toFixed(3)}`

      await execAsync(
        `ffmpeg -y -i "${rawFile}" -af "${filters}" -c:a libopus -b:a 64k -ac 1 -ar 48000 "${outFile}"`,
        { timeout: 15000 }
      )

      if (!fs.existsSync(outFile) || fs.statSync(outFile).size < 100) {
        throw 'Error al convertir audio a OGG Opus'
      }

      const audioBuffer = fs.readFileSync(outFile)

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
