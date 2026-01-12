export default {
  // Comandos que activan este menú
  command: [
    'options', 'config', 'settings', 'opciones', 
    'enable', 'disable', 'on', 'off', 'activar', 'desactivar',
    
    // Comandos directos de cada función
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
  run: async ({ client, m, args, command, usedPrefix }) => {
    const chatData = global.db.data.chats[m.chat]
    const prefa = usedPrefix || '#' 

    // 1. MAPEO EXACTO
    // Clave: Comando escrito -> Valor: Nombre interno (Base de Datos)
    const mapTerms = {
      // Antilinks (PLURAL, como corregiste)
      antilinks: 'antilinks', 
      antienlaces: 'antilinks', 
      antilink: 'antilinks',

      // Welcome
      welcome: 'welcome', 
      bienvenidas: 'welcome',

      // Alerts
      alerts: 'alerts', 
      alertas: 'alerts',

      // RPG / Economy
      rpg: 'rpg', 
      economy: 'rpg', 
      economia: 'rpg',

      // Gacha
      gacha: 'gacha',

      // OnlyAdmin
      onlyadmin: 'onlyadmin', 
      adminonly: 'onlyadmin',

      // NSFW
      nsfw: 'nsfw'
    }

    // 2. NOMBRES PARA MOSTRAR
    const featureNames = {
      antilinks: 'el *AntiEnlace*',       // Clave 'antilinks'
      welcome: 'el mensaje de *Bienvenida*',
      alerts: 'las *Alertas*',
      rpg: 'los comandos de *Economía*',
      gacha: 'los comandos de *Gacha*',
      onlyadmin: 'el modo *Solo Admin*',
      nsfw: 'los comandos *NSFW*'
    }

    const featureTitles = {
      antilinks: 'AntiEnlace',
      welcome: 'Bienvenida',
      alerts: 'Alertas',
      rpg: 'Economía',
      gacha: 'Gacha',
      onlyadmin: 'Solo Admin',
      nsfw: 'NSFW'
    }

    // 3. DETECTAR INTENCIÓN
    const isActionCmd = /enable|disable|on|off|activar|desactivar/i.test(command)
    const isListCmd = /options|config|settings|opciones/i.test(command)

    let targetFeature = ''
    let targetState = ''

    // 4. MOSTRAR LISTA DE OPCIONES (AYUDA)
    if (isListCmd || (isActionCmd && !args[0])) {
        let txt = `⚙️ *CONFIGURACIÓN DEL GRUPO*\n\n`
        txt += `Estado actual de las funciones:\n\n`
        
        // Obtenemos las claves únicas
        const uniqueKeys = [...new Set(Object.values(mapTerms))]
        
        for (const key of uniqueKeys) {
            const status = chatData[key] ? '✅ On' : '❌ Off'
            const title = featureTitles[key] || key
            txt += `• *${title}:* ${status}\n`
        }

        txt += `\n💡 *Modo de uso:*\n`
        txt += `• *${prefa}enable <opcion>*\n`
        txt += `• *${prefa}disable <opcion>*\n`
        txt += `Ejemplo: *${prefa}enable nsfw*`
        
        return m.reply(txt)
    }

    // 5. PREPARAR DATOS
    if (isActionCmd) {
        // Caso: #enable nsfw
        targetFeature = args[0]?.toLowerCase()
        targetState = /enable|on|activar/i.test(command) ? 'on' : 'off'
    } else {
        // Caso: #nsfw on
        targetFeature = command
        targetState = args[0]?.toLowerCase()
    }

    // Normalizamos (ej: 'antilink' -> 'antilinks')
    const normalizedKey = mapTerms[targetFeature]

    // Si la opción no existe
    if (!normalizedKey || !featureNames[normalizedKey]) {
         return m.reply(`⚠️ La opción *"${targetFeature || '?'}"* no existe.\nEscribe *${prefa}options* para ver la lista.`)
    }

    const current = chatData[normalizedKey] === true
    const estado = current ? '✓ Activado' : '✗ Desactivado'
    const nombreBonito = featureNames[normalizedKey]
    const titulo = featureTitles[normalizedKey]

    // 6. INFO INDIVIDUAL (Si no pone on/off)
    if (!targetState && !isActionCmd) {
      return client.reply(
        m.chat,
        `*✩ ${titulo} (✿❛◡❛)*\n` +
        `❒ *Estado ›* ${estado}\n\n` +
        `ꕥ Para cambiar esto usa:\n` +
        `> *${prefa}enable ${normalizedKey}*\n` +
        `> *${prefa}disable ${normalizedKey}*`,
        m
      )
    }

    // 7. APLICAR CAMBIOS
    const shouldEnable = ['on', 'enable', 'activar'].includes(targetState)

    if (chatData[normalizedKey] === shouldEnable) {
      return m.reply(`✎ *${titulo}* ya estaba *${shouldEnable ? 'activado' : 'desactivado'}*.`)
    }

    chatData[normalizedKey] = shouldEnable
    return m.reply(`✎ Has *${shouldEnable ? 'activado' : 'desactivado'}* ${nombreBonito}.`)
  }
};
