export default {
  command: ['report', 'reporte', 'sug', 'suggest'],
  category: 'info',
  desc: 'Envía un reporte o sugerencia al desarrollador.',

  run: async ({ client, m, args }) => {
    // 1. Obtener comando usado
    const body = m.body || m.text || ''
    const prefix = body.charAt(0)
    const command = body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase()
    
    // 2. Definir tipo (Reporte o Sugerencia)
    const isReport = ['report', 'reporte'].includes(command)
    const tipoTitulo = isReport ? '⚠️ REPORTE' : '💡 SUGERENCIA'
    const textoUsuario = args.join(' ').trim()
    const now = Date.now()

    // 3. Verificar Cooldown (24 horas)
    const userDb = global.db.data.users[m.sender]
    const cooldown = userDb.sugCooldown || 0
    const restante = cooldown - now

    if (restante > 0) {
      return m.reply(`⏳ Debes esperar *${msToTime(restante)}* para enviar otro reporte.`)
    }

    // 4. Validaciones de Texto
    if (!textoUsuario) {
      return m.reply(`📝 Por favor escribe tu *${isReport ? 'reporte de error' : 'sugerencia'}* después del comando.\n\nEjemplo:\n${prefix}${command} El comando play falla con enlaces de Spotify.`)
    }

    if (textoUsuario.length < 10) {
      return m.reply('❌ Tu mensaje es muy corto. Explica mejor el problema (mínimo 10 letras).')
    }

    // 5. Preparar Datos
    const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const userName = m.pushName || 'Usuario'
    const userNumber = m.sender.split('@')[0]
    
    // Obtener foto de perfil
    let pp = 'https://i.imgur.com/K3aYyQv.jpeg' // Imagen por defecto
    try {
        pp = await client.profilePictureUrl(m.sender, 'image')
    } catch {}

    // 6. Construir Mensaje para el Staff
    // IMPORTANTE: Cambia este ID por el del grupo de logs o tu número privado
    const STAFF_ID = '56992523459@s.whatsapp.net'

    const reportMsg = `╭━━━[ *${tipoTitulo}* ]━━━
┃
┃ 👤 *De:* ${userName}
┃ 📱 *Número:* wa.me/${userNumber}
┃ 📅 *Fecha:* ${fecha}
┃
┃ 📝 *Mensaje:*
┃ ${textoUsuario}
┃
╰━━━━━━━━━━━━━━━━━━`

    try {
        // Enviar al canal de reportes/staff con mención
        await client.sendMessage(STAFF_ID, { 
            image: { url: pp },
            caption: reportMsg,
            mentions: [m.sender]
        })

        // 7. Confirmar al usuario y activar cooldown
        userDb.sugCooldown = now + (24 * 60 * 60 * 1000) // 24 horas
        
        await m.reply(`✅ Tu *${isReport ? 'reporte' : 'sugerencia'}* ha sido enviada al staff.\n¡Gracias por ayudarnos a mejorar!`)

    } catch (e) {
        console.error(e)
        m.reply('❌ Error al enviar el reporte. Asegúrate de que el bot esté en el grupo de staff.')
    }
  }
}

// Función auxiliar de tiempo
function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  
  if (hours > 0) return `${hours} horas y ${minutes} minutos`
  if (minutes > 0) return `${minutes} minutos y ${seconds} segundos`
  return `${seconds} segundos`
}
