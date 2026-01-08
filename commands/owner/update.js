import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Filtra archivos basura que no nos importa ver en el log
function parseGitStatus(output) {
  const ignored = [
    'node_modules', 'backups', 'Sessions', 'session', 
    '.cache', '.npm', 'tmp', '.db', 'store', 
    'package-lock.json', 'yarn.lock'
  ]

  return output
    .trim()
    .split('\n')
    .filter(line => line)
    .map(line => {
      const statusSymbol = line.slice(0, 2).trim()
      const file = line.slice(3).trim()
      // Si el archivo contiene alguna palabra ignorada, lo saltamos
      if (ignored.some(i => file.includes(i))) return null
      
      let statusText = ''
      switch(statusSymbol) {
          case 'M': statusText = 'Modificado'; break;
          case 'A': statusText = 'Nuevo'; break;
          case 'D': statusText = 'Eliminado'; break;
          case '??': statusText = 'Sin seguimiento'; break;
          default: statusText = 'Cambio';
      }
      return `• ${file} _(${statusText})_`
    })
    .filter(Boolean) // Elimina los nulos
    .join('\n')
}

// Recarga los comandos en caliente sin reiniciar
async function reloadCommands(dir = path.join(__dirname, '..')) {
  const plugins = {} 
  
  async function readDir(folder) {
    const files = fs.readdirSync(folder)
    for (const file of files) {
      const fullPath = path.join(folder, file)
      if (fs.statSync(fullPath).isDirectory()) {
        if (file !== 'node_modules') await readDir(fullPath)
      } else if (file.endsWith('.js')) {
        try {
          // Borramos la caché del import para que cargue el código nuevo
          const fileUrl = `file://${fullPath}?update=${Date.now()}`
          const { default: cmd } = await import(fileUrl)
          
          if (cmd && cmd.command) {
             // Guardamos en la estructura que usa tu bot (global.plugins)
             const filename = path.basename(file)
             plugins[filename] = cmd
          }
        } catch (e) {
          console.error(`Error al recargar ${file}:`, e)
        }
      }
    }
  }

  await readDir(dir)
  // Actualizamos la variable global para que el menú y el handler lo detecten
  global.plugins = plugins 
  console.log(`✅ Plugins recargados: ${Object.keys(plugins).length}`)
}

export default {
  command: ['update', 'actualizar', 'fix'],
  category: 'otros',
  // isOwner: true, // Descomenta esto si solo tú quieres usarlo

  run: async ({ client, m }) => {
    await client.sendMessage(m.chat, { react: { text: '🔄', key: m.key } })
    
    try {
      // 1. Verificamos estado actual
      const statusOut = await execPromise('git status --porcelain')
      const changesList = parseGitStatus(statusOut.stdout)
      const hasChanges = changesList.length > 0

      // 2. Si hay cambios locales, los guardamos (Stash) para evitar conflictos
      if (hasChanges) {
        await execPromise('git stash')
        console.log('Cambios locales guardados temporalmente.')
      }

      // 3. Hacemos el Pull (Bajar actualización)
      const pullOut = await execPromise('git pull')
      
      // 4. Si guardamos cambios, los intentamos recuperar (Stash Pop)
      if (hasChanges) {
        try {
            await execPromise('git stash pop')
        } catch (e) {
            console.error("Conflicto al restaurar cambios locales:", e)
            m.reply('⚠️ *Advertencia:* Se actualizó el bot, pero tus cambios locales tuvieron conflictos. Revisa tus archivos.')
        }
      }

      // 5. Analizamos el resultado
      const output = pullOut.stdout.trim()
      
      if (output.includes('Already up to date')) {
        return m.reply('✅ *El Bot ya está actualizado.*\n\n' + (hasChanges ? `📝 *Nota:* Tienes cambios locales pendientes:\n${changesList}` : ''))
      }

      // 6. Recargamos comandos en vivo
      await reloadCommands(path.join(__dirname, '..'))

      // 7. Mensaje Final
      let msg = `✅ *¡Actualización Exitosa!*\n\n`
      msg += `📂 *Cambios recibidos:*\n${output}\n`
      
      // Aviso si package.json cambió (necesita npm install)
      if (output.includes('package.json')) {
        msg += `\n📦 *IMPORTANTE:* Se actualizaron dependencias.\nEjecuta: \`npm install\` en la terminal.\n`
      }
      
      msg += `\n> 🐲 Powered by MatheoDark`

      await client.sendMessage(m.chat, { text: msg }, { quoted: m })

    } catch (error) {
      console.error(error)
      m.reply(`❌ *Error Crítico al actualizar:*\n\n${error.message}`)
    }
  }
}
