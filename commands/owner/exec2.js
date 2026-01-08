import cp from 'child_process'
import { promisify } from 'util'

const exec = promisify(cp.exec)

export default {
  // Alias estándar: '$' es el símbolo universal de terminal, 'exec' es el nombre técnico
  command: ['$', 'exec', 'bash'], 
  category: 'owner',
  isOwner: true,

  run: async ({ client, m, text, command }) => {
    
    // Si no escribes nada, te avisa
    if (!text) return m.reply(`💻 *Terminal Linux*\n\nEscribe un comando.\nEjemplo: *${command} ls -lh*`)

    await client.sendMessage(m.chat, { react: { text: '💻', key: m.key } })

    let o
    try {
      // Ejecuta el comando en el sistema (máximo 10MB de respuesta para que no se pegue)
      o = await exec(text.trim(), { maxBuffer: 10 * 1024 * 1024 })
    } catch (e) {
      o = e
    } finally {
      let { stdout, stderr } = o
      
      // Limpiamos espacios vacíos
      if (stdout) stdout = stdout.trim()
      if (stderr) stderr = stderr.trim()
      
      // Enviamos todo junto en un solo mensaje bonito
      if (stdout || stderr) {
          await m.reply(`root@server:~# ${text}\n\n${stdout || ''}\n${stderr ? '⚠️ ERROR:\n' + stderr : ''}`.trim())
      } else {
          await m.reply(`✅ Ejecutado (Sin respuesta visual)`)
      }
    }
  }
}
