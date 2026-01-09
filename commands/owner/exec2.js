import cp from 'child_process'
import { promisify } from 'util'

const exec = promisify(cp.exec)

export default {
  // Acepta el símbolo '$' y la palabra 'exec'
  command: ['$', 'exec'], 
  category: 'owner',
  isOwner: true,

  run: async ({ client, m, text, command, usedPrefix }) => {
        
    if (!text) return m.reply(`💻 *Terminal*\nEjemplo: *${usedPrefix + command} ls -lh*`)

    await client.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } })

    let output
    try {
      // Ejecutamos con un buffer grande para que no se corte
      output = await exec(text.trim(), { maxBuffer: 20 * 1024 * 1024 })
    } catch (e) {
      output = e
    } finally {
      let { stdout, stderr } = output
      if (stdout) stdout = stdout.trim()
      if (stderr) stderr = stderr.trim()
      
      const respuesta = `root@server:~# ${text}\n\n${stdout || ''}\n${stderr ? '⚠️ ERROR:\n' + stderr : ''}`
      
      await m.reply(respuesta.trim())
    }
  }
}
