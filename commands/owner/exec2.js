import cp from 'child_process'
import { promisify } from 'util'

const exec = promisify(cp.exec)

export default {
  // 🔥 TRUCO: Usamos Regex /^(\$|exec)/
  // Esto le dice al bot: "Actívate si el mensaje empieza con $ o con exec, ignora el prefijo normal"
  command: /^(\$|exec)/i, 
  category: 'owner',
  isOwner: true,

  run: async ({ client, m, usedPrefix, command }) => {
    
    // Como usamos Regex, tenemos que limpiar el texto manualmente
    // m.text es el mensaje completo (ej: "$ ls -lh")
    let fullText = m.text.trim()
    let text = ''

    // Si empieza con $, quitamos el $
    if (fullText.startsWith('$')) {
        text = fullText.slice(1).trim()
    } 
    // Si empieza con exec, quitamos "exec" y el prefijo si lo hubiera
    else {
         // Eliminamos la primera palabra (el comando) para quedarnos con los argumentos
         text = fullText.split(' ').slice(1).join(' ').trim()
    }

    if (!text) return m.reply(`💻 *Terminal Linux*\n\nEscribe un comando.\nEjemplo: *$ ls -lh*`)

    await client.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } })

    let o
    try {
      // Ejecutamos el comando
      o = await exec(text, { maxBuffer: 20 * 1024 * 1024 })
    } catch (e) {
      o = e
    } finally {
      let { stdout, stderr } = o
      
      if (stdout) stdout = stdout.trim()
      if (stderr) stderr = stderr.trim()
      
      // Enviamos la respuesta bonita
      if (stdout || stderr) {
          await m.reply(`root@server:~# ${text}\n\n${stdout || ''}\n${stderr ? '⚠️ ERROR:\n' + stderr : ''}`.trim())
      } else {
          await m.reply(`✅ Ejecutado (Sin salida).`)
      }
    }
  }
}
