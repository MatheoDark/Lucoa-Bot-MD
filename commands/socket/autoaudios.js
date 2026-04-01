/**
 * 🔊 Auto-Audios — Responde con notas de voz cuando detecta keywords
 * 
 * Funciona como plugin (hook "all") — se ejecuta en TODOS los mensajes.
 * Los audios se configuran en lib/json/audios.json y se guardan en media/audios/
 * Se activa/desactiva por grupo con: chat.audios = true/false
 * 
 * Estructura de audios.json:
 * [
 *   { "keywords": ["hola", "buenas"], "file": "hola.mpeg", "ptt": true },
 *   ...
 * ]
 * 
 * - keywords: palabras que activan el audio (match por palabra completa)
 * - file: nombre del archivo en media/audios/
 * - ptt: true = nota de voz, false = archivo de audio
 */

import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

const AUDIOS_DIR = path.join(process.cwd(), 'media', 'audios')
const AUDIOS_JSON = path.join(process.cwd(), 'lib', 'json', 'audios.json')

// Cache del JSON para no leerlo en cada mensaje
let _audiosCache = null
let _audiosCacheTs = 0
const CACHE_TTL = 60000

export function loadAudios() {
  const now = Date.now()
  if (_audiosCache && now - _audiosCacheTs < CACHE_TTL) return _audiosCache
  if (!existsSync(AUDIOS_JSON)) return []
  try {
    _audiosCache = JSON.parse(readFileSync(AUDIOS_JSON, 'utf-8'))
    _audiosCacheTs = now
    return _audiosCache
  } catch { return [] }
}

// Invalidar cache cuando se agrega/elimina un audio
export function invalidateAudiosCache() {
  _audiosCache = null
  _audiosCacheTs = 0
}

// Cooldown por grupo para no spamear audios
const cooldowns = new Map()
const COOLDOWN_MS = 30000 // 30s entre audios en el mismo grupo

function unwrapMessageContent(message = {}) {
  let msg = message
  // Algunos clientes envuelven el contenido real dentro de estas capas.
  if (msg?.ephemeralMessage?.message) msg = msg.ephemeralMessage.message
  if (msg?.viewOnceMessage?.message) msg = msg.viewOnceMessage.message
  if (msg?.viewOnceMessageV2?.message) msg = msg.viewOnceMessageV2.message
  if (msg?.viewOnceMessageV2Extension?.message) msg = msg.viewOnceMessageV2Extension.message
  return msg || {}
}

function getBodyText(m) {
  const msg = unwrapMessageContent(m?.message || {})
  return (
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    msg?.videoMessage?.caption ||
    msg?.buttonsResponseMessage?.selectedButtonId ||
    msg?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg?.templateButtonReplyMessage?.selectedId ||
    ''
  )
}

/**
 * Hook "all" — se ejecuta en cada mensaje recibido
 */
export async function all(m, { client }) {
  const isGroup = !!(m?.isGroup || String(m?.chat || m?.key?.remoteJid || '').endsWith('@g.us'))
  if (!isGroup || m.key?.fromMe) return false
  
  const chat = global.db?.data?.chats?.[m.chat]
  if (!chat || !chat.audios) return false
  
  // Solo reaccionar a mensajes de texto cortos
  const body = getBodyText(m)
  if (!body || body.length > 50) return false
  
  // Respetar primaryBot
  const botId = client.user?.id?.split(':')[0] + '@s.whatsapp.net'
  if (chat.primaryBot && chat.primaryBot !== botId) return false
  
  // Cooldown por grupo
  const lastAudio = cooldowns.get(m.chat) || 0
  if (Date.now() - lastAudio < COOLDOWN_MS) return false
  
  const audios = loadAudios()
  if (!audios.length) return false
  
  const text = body.trim().toLowerCase()
  
  // Buscar match por keyword (palabra completa)
  const match = audios.find(item =>
    item.keywords.some(key => new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text))
  )
  if (!match) return false
  
  // Verificar que el archivo existe
  const filePath = path.join(AUDIOS_DIR, match.file)
  if (!existsSync(filePath)) return false
  
  cooldowns.set(m.chat, Date.now())
  
  try {
    const buffer = readFileSync(filePath)
    const wantsPtt = match.ptt !== false
    const ext = path.extname(match.file).toLowerCase()
    
    // Si ya es .ogg/.opus, enviar directamente como ptt
    if (wantsPtt && (ext === '.ogg' || ext === '.opus')) {
      await client.sendMessage(m.chat, {
        audio: buffer,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      }, { quoted: m })
      return false
    }
    
    if (wantsPtt) {
      // Convertir a opus para nota de voz
      const tempIn = path.join(process.cwd(), 'tmp', `audio_in_${Date.now()}`)
      const tempOut = path.join(process.cwd(), 'tmp', `audio_out_${Date.now()}.opus`)
      writeFileSync(tempIn, buffer)
      
      try {
        await execPromise(`ffmpeg -y -i "${tempIn}" -vn -c:a libopus -b:a 128k -vbr on -f ogg "${tempOut}"`)
        const opusBuffer = readFileSync(tempOut)
        if (opusBuffer.length > 100) {
          await client.sendMessage(m.chat, {
            audio: opusBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
          }, { quoted: m })
        }
      } catch {
        // Fallback: enviar como audio sin convertir
        await client.sendMessage(m.chat, {
          audio: buffer, mimetype: 'audio/mpeg', ptt: false
        }, { quoted: m })
      } finally {
        if (existsSync(tempIn)) unlinkSync(tempIn)
        if (existsSync(tempOut)) unlinkSync(tempOut)
      }
    } else {
      // Enviar como audio normal
      const mime = ext === '.mp4' ? 'audio/mp4' : 'audio/mpeg'
      await client.sendMessage(m.chat, {
        audio: buffer, mimetype: mime, ptt: false
      }, { quoted: m })
    }
  } catch (e) {
    console.error('🔊 Error enviando audio:', e.message)
  }
  
  return false
}
