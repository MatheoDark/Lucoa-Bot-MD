import fs from "fs"
import path from "path"
import chalk from "chalk"
import { fileURLToPath } from "url"
import syntaxerror from "syntax-error"
import { format } from 'util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

global.middlewares = {
  before: [],
  after: []
}

global.comandos = new Map()
global.plugins = {}

const commandsFolder = path.join(__dirname, "../../commands")

// Función auxiliar para registrar un plugin individual
async function loadSinglePlugin(fullPath, fileOrFolder) {
    const code = fs.readFileSync(fullPath)
    const err = syntaxerror(code, fileOrFolder, {
        sourceType: "module",
        allowAwaitOutsideFunction: true
    })

    if (err) {
        console.error(chalk.red(`❌ Error de sintaxis en ${fileOrFolder}:\n${format(err)}`))
        return false
    }

    try {
        // Cache busting para recargar cambios reales
        const modulePath = `${path.resolve(fullPath)}?update=${Date.now()}`
        const imported = await import(modulePath)

        const comando = imported.default
        const pluginName = fileOrFolder.replace(".js", "")

        global.plugins[pluginName] = imported

        // 1. Cargar Middlewares (before/after)
        if (typeof imported.before === 'function' || typeof comando?.before === 'function') {
            global.middlewares.before.push({
                fn: imported.before || comando.before,
                source: pluginName // Etiquetamos el origen para poder borrarlo luego
            })
        }

        if (typeof imported.after === 'function' || typeof comando?.after === 'function') {
            global.middlewares.after.push({
                fn: imported.after || comando.after,
                source: pluginName
            })
        }

        // 2. Validación y carga de comandos
        if (!comando?.command || typeof comando.run !== "function") return true

        if (Array.isArray(comando.command)) {
            comando.command.forEach(cmd => {
                global.comandos.set(cmd.toLowerCase(), {
                    pluginName,
                    run: comando.run,
                    category: comando.category || "uncategorized",
                    isOwner: comando.isOwner || false,
                    isAdmin: comando.isAdmin || false,
                    botAdmin: comando.botAdmin || false,
                    isModeration: comando.isModeration || false,
                    // Guardamos la referencia directa a las funciones del middleware
                    before: imported.before || null,
                    after: imported.after || null,
                    info: comando.info || {}
                })
            })
        }
        return true
    } catch (e) {
        console.error(chalk.red(`❌ Error al cargar ${fileOrFolder}:`), e)
        return false
    }
}

async function loadCommandsAndPlugins(dir = commandsFolder) {
    // Si es la primera carga, limpiamos todo
    if (dir === commandsFolder && global.comandos.size === 0) {
        console.log(chalk.blue('📂 Cargando comandos...'))
    }

    const items = fs.readdirSync(dir)

    for (const fileOrFolder of items) {
        const fullPath = path.join(dir, fileOrFolder)

        if (fs.lstatSync(fullPath).isDirectory()) {
            await loadCommandsAndPlugins(fullPath)
            continue
        }

        if (!fileOrFolder.endsWith(".js")) continue
        await loadSinglePlugin(fullPath, fileOrFolder)
    }
}

// 🔥 RECARGA INTELIGENTE OPTIMIZADA
globalThis.reload = async (_ev, filename) => {
    if (!filename || !filename.endsWith(".js")) return

    // Buscamos el archivo recursivamente porque fs.watch a veces solo da el nombre sin ruta
    const findFile = (dir, name) => {
        const files = fs.readdirSync(dir)
        for (const file of files) {
            const filePath = path.join(dir, file)
            if (fs.statSync(filePath).isDirectory()) {
                const found = findFile(filePath, name)
                if (found) return found
            } else if (file === name) {
                return filePath
            }
        }
        return null
    }

    const fullPath = findFile(commandsFolder, filename)
    if (!fullPath) {
        console.log(chalk.yellow(`⚠ Archivo eliminado o no encontrado: ${filename}`))
        const pluginName = filename.replace(".js", "")
        delete global.plugins[pluginName]
        return
    }

    console.log(chalk.cyan(`🔄 Recargando: ${filename}`))

    // 1. LIMPIEZA QUIRÚRGICA:
    // Borramos solo los comandos que pertenecen a este plugin
    const pluginName = filename.replace(".js", "")
    
    // Borrar del mapa de comandos
    for (const [cmd, data] of global.comandos.entries()) {
        if (data.pluginName === pluginName) {
            global.comandos.delete(cmd)
        }
    }

    // Borrar middlewares antiguos de este archivo
    global.middlewares.before = global.middlewares.before.filter(m => m.source !== pluginName)
    global.middlewares.after = global.middlewares.after.filter(m => m.source !== pluginName)

    // 2. RECARGA INDIVIDUAL
    await loadSinglePlugin(fullPath, filename)
    console.log(chalk.green(`✅ Plugin actualizado: ${filename}`))
}

Object.freeze(globalThis.reload)

// fs.watch es inestable en algunos sistemas, usamos watchFile o un debouncer si da problemas
// Pero para desarrollo básico esto funciona:
fs.watch(commandsFolder, { recursive: true }, (event, filename) => {
    if (filename) globalThis.reload(event, filename)
})

export default loadCommandsAndPlugins
