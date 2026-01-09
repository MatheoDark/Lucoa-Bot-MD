import cp from 'child_process'
import { promisify } from 'util'

const exec = promisify(cp.exec)

export default {
  // 1. Ponemos un array normal para que NO crashee el bot
  command: ['exec'], 
  category: 'owner',
  isOwner: true,

  // 2. Usamos 'before' para detectar el signo '$' manualmente
  // Esto se ejecuta en CADA mensaje antes de buscar comandos normales
  before: async (m, { client, isOwner }) => {
    // Si no es dueño o no hay texto, ignoramos
    if (!isOwner || !m.text) return false

    // Si el mensaje empieza con "$ " (ej: $ ls)
    if (m.text.startsWith('$')) {
        // Obtenemos el comando quitando el "$"
        const commandText = m.text.slice(1).trim()
        if (!commandText) return false

        await client.sendMessage(m.chat, { react: { text: '💻', key: m.key } })

        // Ejecutamos la lógica de terminal aquí mismo
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
        return true // Retornamos true para detener el bot aquí (que no busque más comandos)
    }
    
    return false // Si no empezaba con $, dejamos pasar el mensaje
  },

  // 3. Mantenemos el 'run' por si quieres usar /exec
  run: async ({ client, m, text }) => {
    if (!text) return m.reply('Escribe un comando.')
    // (Misma lógica, solo como respaldo)
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
