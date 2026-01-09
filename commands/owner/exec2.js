import cp from 'child_process'
import { promisify } from 'util'

const exec = promisify(cp.exec)

export default {
  // Dejamos esto para que funcione con prefijo si falla lo automático
  command: ['exec', 'bash'], 
  category: 'owner',
  isOwner: true,

  // --- AQUÍ ESTABA EL PROBLEMA ---
  // Ahora calculamos 'isOwner' manualmente dentro de la función para asegurar que no falle.
  before: async (m, { client }) => {
    try {
        // 1. Verificamos si hay texto
        if (!m.text) return false

        // 2. Calculamos manualmente si es Owner (Más seguro)
        const sender = m.sender || m.key.participant || m.key.remoteJid
        // Limpiamos el número (quitamos @s.whatsapp.net) para comparar
        const senderNumber = sender.split('@')[0]
        
        // Buscamos en la lista global de owners
        const isOwner = global.owner.some(owner => owner[0] === senderNumber)
        
        if (!isOwner) return false // Si no es dueño, ignoramos

        // 3. Detectamos si empieza con "$"
        // Usamos trim() para ignorar espacios accidentales al inicio
        if (m.text.trim().startsWith('$')) {
            
            // Obtenemos el comando (quitamos el "$" del inicio)
            const commandText = m.text.trim().slice(1).trim()
            if (!commandText) return false

            await client.sendMessage(m.chat, { react: { text: '💻', key: m.key } })

            let o
            try {
                // Ejecutamos
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
            return true // Detenemos el bot aquí para que no busque más comandos
        }
    } catch (e) {
        console.error("Error en exec2 before:", e)
    }
    return false
  },

  // Respaldo manual (por si usas /exec ls)
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
