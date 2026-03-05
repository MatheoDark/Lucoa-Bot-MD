/**
 * 🔊 Comando para gestionar auto-audios del grupo
 * 
 * Uso:
 *   #audios on/off          — Activar/desactivar audios en el grupo
 *   #audios add <keywords>  — Responde a un audio/nota de voz para guardarlo
 *   #audios del <keyword>   — Eliminar un audio por keyword
 *   #audios list            — Ver audios configurados
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import path from 'path'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { invalidateAudiosCache } from '../socket/autoaudios.js'

const AUDIOS_DIR = path.join(process.cwd(), 'media', 'audios')
const AUDIOS_JSON = path.join(process.cwd(), 'lib', 'json', 'audios.json')

function loadAudios() {
  if (!existsSync(AUDIOS_JSON)) return []
  try { return JSON.parse(readFileSync(AUDIOS_JSON, 'utf-8')) } catch { return [] }
}

function saveAudios(data) {
  writeFileSync(AUDIOS_JSON, JSON.stringify(data, null, 2), 'utf-8')
  invalidateAudiosCache()
}

export default {
  command: ['audios'],
  category: 'grupo',
  description: 'Gestionar auto-audios del grupo',
  groupOnly: true,
  admin: true,

  run: async ({ client, m, args, text }) => {
    const sub = args[0]?.toLowerCase()

    if (!sub || sub === 'help') {
      return m.reply(`🔊 *Auto-Audios*

Uso:
> *#audios on* — Activar audios en este grupo
> *#audios off* — Desactivar audios
> *#audios list* — Ver lista de audios
> *#audios add <keywords>* — Responder a un audio para guardarlo
> *#audios del <keyword>* — Eliminar audio

Ejemplo:
> Responde a una nota de voz con:
> *#audios add hola,buenas,hey*
> 
> También funciona reenviando un audio.`)
    }

    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
    const chat = global.db.data.chats[m.chat]

    if (sub === 'on') {
      chat.audios = true
      return m.reply('✅ Auto-audios *activados* en este grupo.')
    }

    if (sub === 'off') {
      chat.audios = false
      return m.reply('❌ Auto-audios *desactivados* en este grupo.')
    }

    if (sub === 'list') {
      const audios = loadAudios()
      if (!audios.length) return m.reply('📭 No hay audios configurados.')

      let msg = '🔊 *Audios configurados:*\n\n'
      audios.forEach((a, i) => {
        const type = a.ptt !== false ? '🎤 Nota de voz' : '🎵 Audio'
        const exists = existsSync(path.join(AUDIOS_DIR, a.file)) ? '✅' : '❌'
        msg += `*${i + 1}.* ${type} ${exists}\n`
        msg += `> Archivo: ${a.file}\n`
        msg += `> Keywords: ${a.keywords.join(', ')}\n\n`
      })
      return m.reply(msg)
    }

    if (sub === 'add') {
      const keywords = args.slice(1).join(' ').split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
      if (!keywords.length) {
        return m.reply('⚠️ Debes poner al menos una keyword.\nEjemplo: *#audios add hola,buenas,hey*')
      }

      // Obtener el mensaje citado (respondido)
      const quoted = m.quoted || m
      const quotedMsg = quoted?.message || {}
      
      // Verificar que sea un audio
      const isAudio = !!(quotedMsg.audioMessage)
      if (!isAudio) {
        return m.reply('⚠️ Debes *responder a un audio o nota de voz* con este comando.\n\nEnvía o reenvía un audio al grupo y luego respóndelo con:\n*#audios add keyword1,keyword2*')
      }

      try {
        // Descargar el audio
        const buffer = await downloadMediaMessage(quoted, 'buffer', {})
        
        if (!buffer || buffer.length < 100) {
          return m.reply('❌ No se pudo descargar el audio. Intenta de nuevo.')
        }

        // Crear carpeta si no existe
        if (!existsSync(AUDIOS_DIR)) mkdirSync(AUDIOS_DIR, { recursive: true })

        // Nombre del archivo basado en la primera keyword
        const safeName = keywords[0].replace(/[^a-z0-9_-]/g, '_')
        const isPtt = !!quotedMsg.audioMessage?.ptt
        const ext = isPtt ? 'ogg' : 'mpeg'
        const filename = `${safeName}_${Date.now()}.${ext}`
        const filePath = path.join(AUDIOS_DIR, filename)

        writeFileSync(filePath, buffer)

        // Agregar al JSON
        const audios = loadAudios()
        audios.push({
          keywords,
          file: filename,
          ptt: true
        })
        saveAudios(audios)

        return m.reply(`✅ Audio guardado como *${filename}*\n\n🔑 Keywords: *${keywords.join(', ')}*\n📦 Tamaño: ${(buffer.length / 1024).toFixed(1)} KB\n\n> Cuando alguien escriba alguna de esas palabras, el bot responderá con este audio.`)
      } catch (e) {
        console.error('Error guardando audio:', e)
        return m.reply('❌ Error al guardar el audio: ' + e.message)
      }
    }

    if (sub === 'del' || sub === 'delete' || sub === 'rm') {
      const keyword = args.slice(1).join(' ').toLowerCase().trim()
      if (!keyword) return m.reply('⚠️ Especifica la keyword del audio a eliminar.')

      const audios = loadAudios()
      const idx = audios.findIndex(a => a.keywords.some(k => k === keyword))
      
      if (idx === -1) return m.reply(`❌ No se encontró ningún audio con la keyword "*${keyword}*".`)

      const removed = audios.splice(idx, 1)[0]
      saveAudios(audios)

      // Eliminar archivo físico
      const filePath = path.join(AUDIOS_DIR, removed.file)
      if (existsSync(filePath)) {
        try { unlinkSync(filePath) } catch {}
      }

      return m.reply(`🗑️ Audio eliminado: *${removed.file}*\nKeywords: *${removed.keywords.join(', ')}*`)
    }

    return m.reply('⚠️ Subcomando no válido. Usa *#audios help*')
  }
}
