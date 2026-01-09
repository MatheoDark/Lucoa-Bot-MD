import cp from 'child_process'
import { promisify } from 'util'

const exec = promisify(cp.exec)

export default {
  command: ['exec', 'bash'], 
  category: 'owner',
  isOwner: true,

  // 🛡️ BEFORE BLINDADO
  before: async (m, { client }) => {
    try {
        if (!m.text) return false

        // CORRECCIÓN AQUÍ: Verificamos que 'sender' exista antes de usarlo
        const sender = m.sender || m.key?.participant || m.key?.remoteJid
        if (!sender) return false 

        const senderNumber = sender.split('@')[0]
        const isOwner = global.owner.some(owner => owner[0] === senderNumber)
        
        if (!isOwner) return false

        if (m.text.trim().startsWith('$')) {
            const commandText = m.text.trim().slice(1).trim()
            if (!commandText) return false

            await client.sendMessage(m.chat, { react: { text: '💻', key: m.key } })

            let o
            try {
                o = await exec(commandText, { maxBuffer: 20 * 1024 * 1024 })
            } catch (e) {
                o = e
            } finally {
                let { stdout, stderr } = o
                if (stdout) stdout = stdout.trim()
                if (stderr) stderr = stderr.trim()

                if (stdout || stderr) {
                    await m.reply(`root@server:~# ${commandText}\n\n${stdout || ''}\n${stderr ? '⚠️ ERROR:\n' + stderr : ''}`.trim())
                } else {
                    await m.reply('✅')
                }
            }
            return true
        }
    } catch (e) {
        // Ignorar errores de arranque
    }
    return false
  },

  run: async ({ client, m, text }) => {
    if (!text) return m.reply('Escribe un comando.')
    let o
    try {
        o = await exec(text.trim(), { maxBuffer: 20 * 1024 * 1024 })
    } catch (e) {
        o = e
    } finally {
        let { stdout, stderr } = o
        if (stdout) stdout = stdout.trim()
        if (stderr) stderr = stderr.trim()
        if (stdout || stderr) await m.reply(`root@server:~# ${text}\n\n${stdout || ''}\n${stderr ? '⚠️ ERROR:\n' + stderr : ''}`.trim())
    }
  }
}
