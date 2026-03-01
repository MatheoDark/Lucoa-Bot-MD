import fs from 'fs'
import path from 'path'

export default {
  command: ['logout2'],
  isModeration: true,
  run: async ({client, m, args}) => {
    if (!args[0]) {
      return m.reply('🐲 Debes indicar el número de la sesión.')
    }

    const cleanId = args[0].replace(/\D/g, '')

    const sessionTypes = ['Subs']
    const basePath = 'Sessions'
    const sessionPath = sessionTypes
      .map((type) => path.join(basePath, type, cleanId))
      .find((p) => fs.existsSync(p))

    if (!sessionPath) {
      return m.reply(`🐲 No se encontró sesión para el número ${cleanId}`)
    }

    try {
      await m.reply(`🐲 Eliminando sesión de ${cleanId}...`)

      setTimeout(() => {
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true })
        }
      }, 2000)

      setTimeout(() => {
        m.reply(`🐉 Sesión de ${cleanId} eliminada correctamente.`)
      }, 3000)
    } catch (err) {
      await m.reply(msgglobal)
    }
  },
}
