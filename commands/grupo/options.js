/**
 * ARCHIVO: commands/grupo/options.js
 * Lógica mejorada para activar/desactivar opciones (#enable nsfw / #nsfw on)
 */

export default {
  // Agregamos 'options', 'config', 'enable', 'disable' al inicio
  command: [
    'options', 'config', 'settings', 'opciones', 
    'enable', 'disable', 'on', 'off', 'activar', 'desactivar',
    
    // Comandos directos (legacy)
    'welcome', 'bienvenidas',
    'alerts', 'alertas',
    'nsfw',
    'antilink', 'antienlaces', 'antilinks',
    'rpg', 'economy', 'economia',
    'gacha',
    'adminonly', 'onlyadmin'
  ],
  category: 'grupo',
  isAdmin: true,
  run: async ({ client, m, args, command }) => {
    const chatData = global.db.data.chats[m.chat]
    const prefa = globalThis.prefix || '#' // Detectar prefijo actual

    // 1. DICCIONARIOS DE CONFIGURACIÓN
    const mapTerms = {
      antilinks: 'antilinks', antienlaces: 'antilinks', antilink: 'antilinks',
      welcome: 'welcome', bienvenidas: 'welcome',
      alerts: 'alerts', alertas: 'alerts',
      economy: 'rpg', rpg: 'rpg', economia: 'rpg',
      adminonly: 'adminonly', onlyadmin: 'adminonly',
      nsfw: 'nsfw',
      gacha: 'gacha'
    }

    const featureNames = {
      antilinks: 'el *AntiEnlace*',
      welcome: 'el mensaje de *Bienvenida*',
      alerts: 'las *Alertas*',
      rpg: 'los comandos de *Economía*',
      gacha: 'los comandos de *Gacha*',
      adminonly: 'el modo *Solo Admin*',
      nsfw: 'los comandos *NSFW*'
    }

    const featureTitles = {
      antilinks: 'AntiEnlace', welcome: 'Bienvenida', alerts: 'Alertas',
      rpg: 'Economía', gacha: 'Gacha', adminonly: 'AdminOnly', nsfw: 'NSFW'
    }

    // 2. DETECCIÓN DE INTENCIÓN
    // ¿Es un comando de acción (enable/disable) o de consulta (options)?
    const isActionCmd = /enable|disable|on|off|activar|desactivar/i.test(command)
    const isListCmd = /options|config|settings|opciones/i.test(command)

    let targetFeature = ''
    let targetState = ''

    // 3. MENSAJE DE AYUDA (LISTA DE OPCIONES)
    // Se activa si:
    // a) Escribe solo #options
    // b) Escribe #enable sin argumentos
    if (isListCmd || (isActionCmd && !args[0])) {
        let txt = `⚙️ *CONFIGURACIÓN DEL GRUPO*\n\n`
        txt += `Aquí tienes las opciones que puedes activar o desactivar:\n\n`
        
        // Generamos la lista dinámicamente
        const uniqueKeys = [...new Set(Object.values(mapTerms))] // Evita duplicados
        
        for (const key of uniqueKeys) {
            const status = chatData[key] ? '✅ On' : '❌ Off'
            const title = featureTitles[key] || key
            txt += `• *${title}:* ${status}\n`
        }

        txt += `\n💡 *Modo de uso:*\n`
        txt += `Try: *${prefa}enable <opcion>*\n`
        txt += `Ej: *${prefa}enable nsfw*`
        
        return m.reply(txt)
    }

    // 4. PARSEO DE ARGUMENTOS
    if (isActionCmd) {
        // Sintaxis: #enable nsfw
        targetFeature = args[0]?.toLowerCase()
        targetState = /enable|on|activar/i.test(command) ? 'on' : 'off'
    } else {
        // Sintaxis: #nsfw on
        targetFeature = command
        targetState = args[0]?.toLowerCase()
    }

    // Normalizar la clave (ej: 'economia' -> 'rpg')
    const normalizedKey = mapTerms[targetFeature]

    // Si la opción no existe (ej: #enable patata)
    if (!normalizedKey || !featureNames[normalizedKey]) {
         return m.reply(`⚠️ Opción *"${targetFeature || 'desconocida'}"* no válida.\nUsa *${prefa}options* para ver la lista.`)
    }

    const current = chatData[normalizedKey] === true
    const estado = current ? '✓ Activado' : '✗ Desactivado'
    const nombreBonito = featureNames[normalizedKey]
    const titulo = featureTitles[normalizedKey]

    // 5. SI NO ESPECIFICA ESTADO (Ej: escribe solo #nsfw)
    // Mostramos info individual
    if (!targetState && !isActionCmd) {
      return client.reply(
        m.chat,
        `*✩ ${titulo} (✿❛◡❛)*\n` +
        `❒ *Estado ›* ${estado}\n\n` +
        `ꕥ Un administrador puede cambiar esto usando:\n` +
        `> *${prefa}enable ${normalizedKey}*\n` +
        `> *${prefa}disable ${normalizedKey}*`,
        m
      )
    }

    // 6. APLICAR CAMBIOS
    const shouldEnable = ['on', 'enable', 'activar'].includes(targetState)

    if (chatData[normalizedKey] === shouldEnable) {
      return m.reply(`✎ *${titulo}* ya estaba *${shouldEnable ? 'activado' : 'desactivado'}*.`)
    }

    chatData[normalizedKey] = shouldEnable
    return m.reply(`✎ Has *${shouldEnable ? 'activado' : 'desactivado'}* ${nombreBonito}.`)
  }
};
