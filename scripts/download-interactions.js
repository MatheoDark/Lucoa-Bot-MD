#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const MEDIA_DIR = path.join(__dirname, '../media/interactions')
const INTERACTIONS_JSON = path.join(__dirname, '../media/interactions.json')
const DOWNLOADS_PER_COMMAND = 7 // Download 7 files per command
const PURRBOT_API = 'https://api.purrbot.site/v2/img/sfw' // Updated to PurrBot v2 (better maintained)

// PurrBot v2 SFW command mapping - TODOS los comandos están mapeados
// 🔧 NO hay fallback a Nekos.life o Waifu.pics - solo GIFs animados de PurrBot v2
// Disponibles: angry, bite, blush, comfy, cry, cuddle, dance, fluff, hug, kiss, lay, lick, pat, poke, pout, slap, smile, tail, tickle
const purbotCommandMap = {
  // Directos (ya en v2)
  'kiss': 'kiss',
  'hug': 'hug',
  'pat': 'pat',
  'poke': 'poke',
  'slap': 'slap',
  'bite': 'bite',
  'cuddle': 'cuddle',
  'dance': 'dance',
  'smile': 'smile',
  'blush': 'blush',
  'cry': 'cry',
  'tickle': 'tickle',
  
  // Mapeados (removidos de v2)
  'punch': 'slap',        // ataque → golpe
  'kick': 'slap',         // ataque → golpe
  'wave': 'smile',        // saludo → sonrisa
  'wink': 'smile',        // expresión ojo → sonrisa
  'eat': 'comfy',         // comer → descanso
  
  // Nekos.life → PurrBot v2 (nunca fueron felices con nekos)
  'feed': 'lay',          // alimentar → descanso
  'meow': 'smile',        // sonido gato → expresión
  'neko': 'tail',         // chica neko → cola
  'lizard': 'pout',       // lagarto → pout
  'woof': 'dance',        // sonido perro → baile
  'fox_girl': 'tail',     // chica zorro → cola
  'smug': 'smile',        // sonrisa altiva → sonrisa
  'lewd': 'lick',         // provocador → lamer
  'spank': 'slap',        // nalgada → golpe
  'gasm': 'pout',         // jadear → pout
  'gecko': 'tail'         // gecko → cola
}

// Helper: Download a file and get its buffer
async function downloadFile(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const arrayBuf = await response.arrayBuffer()
    return Buffer.from(arrayBuf)  // Convert ArrayBuffer to Buffer
  } catch (e) {
    console.error(`❌ Error downloading ${url}: ${e.message}`)
    return null
  }
}

// Helper: Calculate SHA256 hash of buffer
function getFileHash(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer)
  }
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

// Helper: Get file extension from buffer (magic bytes)
function getFileExt(buffer) {
  if (!Buffer.isBuffer(buffer)) return 'unknown'
  const magic = buffer.toString('hex', 0, 8).toUpperCase()
  if (magic.startsWith('474946')) return 'gif'
  if (magic.startsWith('89504E47')) return 'png'
  if (magic.startsWith('FFD8FF')) return 'jpg'
  if (magic.includes('66747970')) return 'mp4'
  if (magic.startsWith('1A45DFA3')) return 'webm'
  return 'unknown'
}

// Helper: Check if file already exists by hash
function findFileByHash(commandDir, targetHash) {
  if (!fs.existsSync(commandDir)) return null
  const files = fs.readdirSync(commandDir)
  for (const file of files) {
    const filePath = path.join(commandDir, file)
    const buffer = fs.readFileSync(filePath)
    if (getFileHash(buffer) === targetHash) return file
    }
  return null
}

// Download interaction media
async function downloadInteraction(command, force = false) {
  const commandDir = path.join(MEDIA_DIR, command)

  // Skip if already has files (unless --force)
  if (fs.existsSync(commandDir) && fs.readdirSync(commandDir).length > 0 && !force) {
    console.log(`⏭️  Skipping ${command} (already has ${fs.readdirSync(commandDir).length} files)`)
    return []
  }

  // Create command directory
  if (!fs.existsSync(commandDir)) {
    fs.mkdirSync(commandDir, { recursive: true })
  }

  console.log(`\n📥 Downloading ${command}...`)

  const downloaded = []
  const existingHashes = new Set()
  const hashes = {}

  // Get existing file hashes
  if (fs.existsSync(commandDir)) {
    fs.readdirSync(commandDir).forEach(file => {
      const filePath = path.join(commandDir, file)
      const buffer = fs.readFileSync(filePath)
      existingHashes.add(getFileHash(buffer))
    })
  }

  // Download files
  let fileCount = 0
  let attempts = 0
  const maxAttempts = DOWNLOADS_PER_COMMAND * 3 // Allow more attempts for failures

  while (fileCount < DOWNLOADS_PER_COMMAND && attempts < maxAttempts) {
    attempts++

    try {
      // 🎬 ÚNICA FUENTE: PurrBot v2 (todos los comandos mapeados)
      let url = null

      // Usar mapeo de comando si existe, sino usar el comando directo
      const apiCmd = purbotCommandMap[command] || command
      const response = await fetch(`${PURRBOT_API}/${apiCmd}/gif`)

      if (response.ok) {
        const json = await response.json().catch(() => ({}))
        url = json?.link // PurrBot devuelve "link"
      } else if (response.status === 404) {
        console.log(`⚠️  ${apiCmd} no encontrado en PurrBot v2`)
        continue
      }

      if (!url) continue

      // Descargar el archivo
      const buffer = await downloadFile(url)
      if (!buffer) continue

      const hash = getFileHash(buffer)

      // Check if already exists
      if (existingHashes.has(hash) || hashes[hash]) {
        continue
      }

      hashes[hash] = true
      existingHashes.add(hash)

      // Get file extension
      const ext = getFileExt(Buffer.from(buffer))
      if (ext === 'unknown') continue

      // Save file with sequential name
      const fileName = `${fileCount + 1}.${ext}`
      const filePath = path.join(commandDir, fileName)

      fs.writeFileSync(filePath, Buffer.from(buffer))
      downloaded.push(fileName)
      fileCount++

      process.stdout.write(`\r✅ ${command}: ${fileCount}/${DOWNLOADS_PER_COMMAND}`)

      // Rate limit: 100ms between downloads
      await new Promise(r => setTimeout(r, 100))
    } catch (e) {
      console.error(`\n❌ Error in attempt ${attempts}: ${e.message}`)
    }
  }

  console.log(`\n✅ ${command} completed: ${downloaded.length} files downloaded`)
  return downloaded
}

// Update interactions.json
function updateInteractionsJson(command, files) {
  try {
    const data = JSON.parse(fs.readFileSync(INTERACTIONS_JSON, 'utf8'))

    if (!data[command]) {
      data[command] = { local: [], fallback: true }
    }

    // Add new files to the local array
    files.forEach(file => {
      const fullPath = `media/interactions/${command}/${file}`
      if (!data[command].local.includes(fullPath)) {
        data[command].local.push(fullPath)
      }
    })

    fs.writeFileSync(INTERACTIONS_JSON, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error(`❌ Error updating interactions.json: ${e.message}`)
  }
}

// Main
async function main() {
  const args = process.argv.slice(2)
  let commands = []
  let force = false

  // Parse arguments
  if (args.includes('--force')) {
    force = true
    commands = args.filter(arg => arg !== '--force')
  } else {
    commands = args
  }

  // If 'all', get all commands from interactions.json
  if (commands.includes('all') || commands.length === 0) {
    const data = JSON.parse(fs.readFileSync(INTERACTIONS_JSON, 'utf8'))
    commands = Object.keys(data)
  }

  if (commands.length === 0) {
    console.log('Usage: node scripts/download-interactions.js [command1] [command2] ...')
    console.log('       node scripts/download-interactions.js all')
    console.log('       node scripts/download-interactions.js --force kiss hug')
    process.exit(1)
  }

  console.log(`\n🚀 Starting bulk download...`)
  console.log(`📋 Commands to process: ${commands.length}`)
  console.log(`💾 Files per command: ${DOWNLOADS_PER_COMMAND}`)
  console.log(`📁 Destination: ${MEDIA_DIR}`)

  let totalDownloaded = 0

  for (const command of commands) {
    const files = await downloadInteraction(command, force)
    updateInteractionsJson(command, files)
    totalDownloaded += files.length
  }

  console.log(`\n✅ Complete! Downloaded ${totalDownloaded} files total`)
  console.log(`📊 Estimated size: ~${(totalDownloaded * 2).toFixed(0)}MB`)
}

main().catch(console.error)
