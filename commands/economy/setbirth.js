import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['setbirth', 'setcumple'],
  category: 'profile',
  run: async ({ client, m, args, usedPrefix }) => {
    const prefa = usedPrefix || '/'
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    const user = global.db.data.users[userId]
    const currentYear = new Date().getFullYear()

    if (user.birth) return m.reply(`🐲 Ya tienes fecha, usa *${prefa}delbirth* para borrarla (◕ᴗ◕)`)

    const input = args.join(' ')
    if (!input) return m.reply(`🐲 Formato: DD/MM/AAAA (◕ᴗ◕)\n│ Ejemplo: *${prefa}setbirth 01/01/2000*`)

    const birth = validarFecha(input, currentYear)
    if (!birth) return m.reply('🐲 Fecha inválida (◕︿◕)')

    user.birth = birth
    return m.reply(`🐉 Cumpleaños establecido: *${user.birth}* (◕ᴗ◕✿)`)
  },
};

// Función auxiliar de validación
function validarFecha(text, currentYear) {
  // Regex básico DD/MM/AAAA
  if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) return null

  let [dia, mes, año] = text.split('/').map(Number)

  if (año > currentYear || año < 1900) return null // Años lógicos
  if (mes < 1 || mes > 12) return null

  const diasMes = [31, (año % 4 === 0 && año % 100 !== 0) || año % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  
  if (dia < 1 || dia > diasMes[mes - 1]) return null

  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${dia} de ${mesesNombres[mes-1]}`
}
