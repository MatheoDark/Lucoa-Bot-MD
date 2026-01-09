import cp from 'child_process'
import { promisify } from 'util'

const exec = promisify(cp.exec)

export default {
  command: ['$', 'exec', 'bash'], 
  category: 'owner',
  isOwner: true,

  run: async ({ client, m, text, command }) => {
    
    // Si escribes solo "$" te avisa cómo usarlo
    if (!text) return m.reply(`💻 *Terminal Linux*\n\nEjemplo: *${command} ls -lh*`)

    await client.sendMessage(m.chat, { react: { text: '💻', key: m.key } })

    let o
    try {
      // Ejecuta el comando (con límite de memoria para no colgar el bot)
      o = await exec(text.trim(), { maxBuffer: 10 * 1024 * 1024 })
    } catch (e) {
      o = e
    } finally {
      let { stdout, stderr } = o
      
      if (stdout) stdout = stdout.trim()
      if (stderr) stderr = stderr.trim()
      
      if (stdout || stderr) {
          await m.reply(`root@server:~# ${text}\n\n${stdout || ''}\n${stderr ? '⚠️ ERROR:\n' + stderr : ''}`.trim())
      } else {
          await m.reply(`✅ Ejecutado.`)
      }
    }
  }
}
