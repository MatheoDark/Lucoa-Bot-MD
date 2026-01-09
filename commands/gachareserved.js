import chalk from 'chalk';

const limpiarPersonajesReservados = () => {
  try {
    // Validamos que la DB esté lista antes de intentar leerla
    if (!global.db || !global.db.data || !global.db.data.chats) return;

    const chats = global.db.data.chats

    // Iteramos sobre todos los chats activos
    for (const chatId of Object.keys(chats)) {
      const chat = chats[chatId]

      // Si existe la lista, la vaciamos
      if (Array.isArray(chat.personajesReservados)) {
        chat.personajesReservados = [] // Forma rápida de vaciar array sin romper referencias
      } else {
        chat.personajesReservados = []
      }
    }
    
    // Opcional: Log para depuración (puedes descomentar si quieres ver cuándo se limpia)
    // console.log(chalk.green('🧹 Personajes reservados limpiados correctamente.'))

  } catch (e) {
    console.error(chalk.red('❌ Error limpiando personajes reservados:'), e.message)
  }
}

// Ejecutar cada 30 minutos (1800000 ms)
setInterval(limpiarPersonajesReservados, 1800000)

// Ejecutar una vez al inicio para asegurar limpieza tras reinicio
limpiarPersonajesReservados()

// Exportamos vacío porque es un script de ejecución automática, no un comando
export default {}
