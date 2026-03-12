#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const NSFW_DIR = path.join(__dirname, '../media/nsfw_interactions')
const NSFW_JSON = path.join(__dirname, '../media/nsfw_interactions.json')
const DOWNLOADS_PER_COMMAND = 5 // 5 archivos por comando NSFW
const R34_BASE = 'https://rule34.xxx'

// HTTPS Agent for R34
const agent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true
})

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

// Map de comandos a tags R34
const r34CommandMap = {
    anal: 'anal',
    cum: 'cum',
    fuck: 'fuck',
    lickpussy: 'pussy',
    fap: 'solo',
    blowjob: 'blowjob',
    threesome: 'threesome',
    yuri: 'yuri',
    sixnine: '69',
    undress: 'undressing',
    spank: 'spanking',
    grope: 'groping',
    boobjob: 'paizuri',
    footjob: 'footjob',
    suckboobs: 'breast',
    grabboobs: 'breast',
    tentacle: 'tentacle',
    fingering: 'fingering',
    squirt: 'squirting',
    deepthroat: 'deepthroat',
    bondage: 'bondage',
    creampie: 'creampie',
    gangbang: 'gangbang',
    facesitting: 'sitting',
    rimjob: 'rimjob'
}

// Download media from R34
async function downloadFromR34(tag) {
    return new Promise((resolve) => {
        const searchUrl = `${R34_BASE}/index.php?page=post&s=list&tags=${tag}+video`

        https.get(searchUrl, { agent, headers }, (res) => {
            let html = ''

            res.on('data', chunk => html += chunk)
            res.on('end', () => {
                try {
                    // Extract video IDs
                    const matches = html.match(/index\.php\?page=post&s=view&id=(\d+)/g)
                    if (!matches || matches.length === 0) {
                        resolve(null)
                        return
                    }

                    const ids = [...new Set(matches.map(m => m.match(/id=(\d+)/)[1]))]
                    if (ids.length === 0) {
                        resolve(null)
                        return
                    }

                    // Get random ID
                    const randomId = ids[Math.floor(Math.random() * ids.length)]

                    // Get the actual media URL
                    const postUrl = `${R34_BASE}/index.php?page=post&s=view&id=${randomId}`
                    https.get(postUrl, { agent, headers }, (res2) => {
                        let html2 = ''
                        res2.on('data', chunk => html2 += chunk)
                        res2.on('end', () => {
                            try {
                                // Try to find video source
                                let mediaUrl = null

                                // Method 1: <source> tag
                                const sourceMatch = html2.match(/<source src="([^"]+)"/i)
                                if (sourceMatch) mediaUrl = sourceMatch[1]

                                // Method 2: Original image
                                if (!mediaUrl) {
                                    const originalMatch = html2.match(/href="([^"]+)">Original/i)
                                    if (originalMatch) mediaUrl = originalMatch[1]
                                }

                                // Fix protocol
                                if (mediaUrl && mediaUrl.startsWith('//')) {
                                    mediaUrl = 'https:' + mediaUrl
                                }

                                resolve(mediaUrl || null)
                            } catch (e) {
                                resolve(null)
                            }
                        })
                    }).on('error', () => resolve(null))
                } catch (e) {
                    resolve(null)
                }
            })
        }).on('error', () => resolve(null))
    })
}

// Download file
async function downloadFile(url) {
    return new Promise((resolve) => {
        https.get(url, { agent, headers }, (res) => {
            const chunks = []
            res.on('data', chunk => chunks.push(chunk))
            res.on('end', () => resolve(Buffer.concat(chunks)))
        }).on('error', () => resolve(null))
    })
}

// Get file extension
function getExt(buffer) {
    if (!buffer) return null
    const magic = buffer.toString('hex', 0, 8).toUpperCase()
    if (magic.startsWith('474946')) return 'gif'
    if (magic.startsWith('89504E47')) return 'png'
    if (magic.startsWith('FFD8FF')) return 'jpg'
    if (magic.includes('66747970')) return 'mp4'
    if (magic.startsWith('1A45DFA3')) return 'webm'
    return null
}

// Download NSFW command
async function downloadNsfwCommand(command) {
    const tag = r34CommandMap[command]
    if (!tag) {
        console.log(`⚠️  No R34 mapping for ${command}`)
        return 0
    }

    const cmdDir = path.join(NSFW_DIR, command)
    if (!fs.existsSync(cmdDir)) {
        fs.mkdirSync(cmdDir, { recursive: true })
    }

    console.log(`\n📥 Downloading ${command} from R34...`)

    let downloaded = 0
    const existingHashes = new Set()

    // Get existing file hashes
    if (fs.existsSync(cmdDir)) {
        fs.readdirSync(cmdDir).forEach(file => {
            const filePath = path.join(cmdDir, file)
            try {
                const buf = fs.readFileSync(filePath)
                // Simple hash (just use file size for quick duplicate check)
                existingHashes.add(buf.length)
            } catch (e) {}
        })
    }

    for (let i = 0; i < DOWNLOADS_PER_COMMAND; i++) {
        try {
            process.stdout.write(`\r  ${command}: ${i + 1}/${DOWNLOADS_PER_COMMAND}`)

            // Download URL
            const mediaUrl = await downloadFromR34(tag)
            if (!mediaUrl) continue

            // Download file
            const buffer = await downloadFile(mediaUrl)
            if (!buffer || buffer.length === 0) continue

            // Check if duplicate
            if (existingHashes.has(buffer.length)) continue
            existingHashes.add(buffer.length)

            // Get extension
            const ext = getExt(buffer)
            if (!ext) continue

            // Save file
            const fileName = `${downloaded + 1}.${ext}`
            const filePath = path.join(cmdDir, fileName)
            fs.writeFileSync(filePath, buffer)
            downloaded++

            // Update JSON
            const data = JSON.parse(fs.readFileSync(NSFW_JSON, 'utf8'))
            if (!data[command]) {
                data[command] = { local: [], fallback: true }
            }
            const relPath = `media/nsfw_interactions/${command}/${fileName}`
            if (!data[command].local.includes(relPath)) {
                data[command].local.push(relPath)
                fs.writeFileSync(NSFW_JSON, JSON.stringify(data, null, 2))
            }

            // Rate limit
            await new Promise(r => setTimeout(r, 500))
        } catch (e) {
            continue
        }
    }

    console.log(`\n✅ ${command} completed: ${downloaded} files`)
    return downloaded
}

// Main
async function main() {
    const args = process.argv.slice(2)
    let commands = args.length > 0 ? args : Object.keys(r34CommandMap)

    console.log(`\n🚀 Starting NSFW R34 downloader...`)
    console.log(`📋 Commands: ${commands.length}`)
    console.log(`💾 Files per command: ${DOWNLOADS_PER_COMMAND}`)

    let total = 0
    for (const cmd of commands) {
        const count = await downloadNsfwCommand(cmd)
        total += count
    }

    console.log(`\n✅ Complete! Downloaded ${total} files`)
}

main().catch(console.error)
