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

// PurrBot v2 SFW command mapping (for commands that might have different names)
const purbotCommandMap = {
  'kiss': 'kiss',
  'hug': 'hug',
  'pat': 'pat',
  'poke': 'poke',
  'slap': 'slap',
  'bite': 'bite',
  'punch': 'punch',
  'kick': 'kick',
  'cuddle': 'cuddle',
  'dance': 'dance',
  'wave': 'wave',
  'smile': 'smile',
  'wink': 'wink',
  'blush': 'blush',
  'cry': 'cry',
  'eat': 'eat',
  // Fallback to 'hug' for commands not in PurrBot v2
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
      // Try PurrBot v2 first (better maintained, 2024+)
      let url = null

      // Use mapped command name if available
      const apiCmd = purbotCommandMap[command] || command
      let response = await fetch(`${PURRBOT_API}/${apiCmd}/gif`)

      if (response.ok) {
        const json = await response.json().catch(() => ({}))
        url = json?.link // PurrBot returns under "link" key
      }

      // Fallback to safe default if command not found
      if (!url && response.status === 404) {
        console.log(`⚠️  ${command} not found on PurrBot, trying fallback...`)
        response = await fetch(`${PURRBOT_API}/hug/gif`) // Safe default fallback
        if (response.ok) {
          const json = await response.json().catch(() => ({}))
          url = json?.link
        }
      }

      // Fallback to Waifu.pics (legacy)
      if (!url) {
        let waiCmd = command
        if (waiCmd === 'eat') waiCmd = 'nom'

        try {
          let waiRes = await fetch(`https://api.waifu.pics/sfw/${waiCmd}`)
          if (!waiRes.ok) waiRes = await fetch(`https://api.waifu.pics/sfw/neko`)

          const waiJson = await waiRes.json().catch(() => ({}))
          url = waiJson?.url
        } catch (e) {}
      }

      if (!url) {
        console.log(`⚠️  No URL returned for ${command}`)
        break
      }

      // Download the file
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
