import { resolveLidToRealJid } from '../../lib/utils.js'
import { getWorkBonus, getXpBonus, tryDoubleReward } from './skills.js'
import { getClassBonus } from './class.js'
import { getPrestigeMultiplier } from './prestige.js'
import { updateMissionProgress } from './missions.js'
import { getRPGImage } from '../../lib/rpgImages.js'

export default {
  command: ['work', 'w', 'trabajar', 'chambear'],
  category: 'rpg',
  run: async ({ client, m }) => {
    
    // 1. Validaciones de Grupo
    if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos.')

    const chat = global.db.data.chats[m.chat] || {}
    // Verificar si el RPG está activo o si el grupo está en modo solo admin
    if (chat.adminonly || !chat.rpg) {
         return m.reply(`✎ Los comandos de economía están desactivados en este grupo.`)
    }

    // 2. Resolución de Usuario (ID Real)
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    
    // Inicializar usuario si no existe
    let user = global.db.data.users[userId]
    if (!user) {
         global.db.data.users[userId] = { exp: 0, coins: 0, workCooldown: 0 }
         user = global.db.data.users[userId]
    }

    // 3. Configuración de Moneda
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const currency = settings.currency || 'monedas'

    // 4. Cooldown (Tiempo de espera)
    const cooldown = 5 * 60 * 1000 // 5 minutos
    user.workCooldown = user.workCooldown || 0
    const tiempoRestante = user.workCooldown + cooldown - Date.now()

    if (tiempoRestante > 0) {
      return m.reply(`🐲 Estás cansado/a. Debes esperar ⏱️ *${msToTime(tiempoRestante)}* para volver a trabajar (◞‸◟)`)
    }

    // 5. Recompensa (con bonos de skills, clase y prestige)
    let reward = Math.floor(Math.random() * 20000) + 5000 
    let exp = Math.floor(Math.random() * 1500) + 300

    // Sistema de racha de trabajo
    user.workStreak = user.workStreak || 0
    user.lastWorkTime = user.lastWorkTime || 0
    const timeSinceWork = Date.now() - user.lastWorkTime
    if (timeSinceWork < 30 * 60 * 1000) { // Si trabajó en los últimos 30 min
      user.workStreak = Math.min((user.workStreak || 0) + 1, 10)
    } else {
      user.workStreak = 1
    }
    user.lastWorkTime = Date.now()
    const streakBonus = 1 + (user.workStreak - 1) * 0.08 // +8% por racha, máx +72% en racha 10

    // Aplicar bonos
    const skillBonus = getWorkBonus(user)
    const classBonus = 1 + (getClassBonus(user, 'workBonus') || 0)
    const prestigeMult = getPrestigeMultiplier(user)
    const xpMult = getXpBonus(user)
    const critChance = getClassBonus(user, 'critChance') || 0

    reward = Math.floor(reward * skillBonus * classBonus * prestigeMult * streakBonus)
    exp = Math.floor(exp * xpMult * prestigeMult)

    // Habilidad de clase Guerrero: Golpe Crítico
    let critMsg = ''
    if (critChance > 0 && Math.random() < critChance) {
      reward *= 3
      critMsg = '\n💥 *¡GOLPE CRÍTICO!* Monedas x3'
    }

    // Aura Mística (skill): chance de duplicar
    const doubleResult = tryDoubleReward(user, reward)
    reward = doubleResult.amount
    const doubleMsg = doubleResult.doubled ? '\n🔮 *¡AURA MÍSTICA! Recompensa duplicada*' : ''

    // 6. Guardar Datos
    user.coins = (user.coins || 0) + reward
    user.exp = (user.exp || 0) + exp
    user.workCooldown = Date.now()

    // 7. Actualizar misiones
    updateMissionProgress(user, 'work')
    updateMissionProgress(user, 'commands')

    // 8. Responder
    const trabajo = pickRandom(listaTrabajos)
    
    let msg = `🔧 ${trabajo} y ganaste *¥${reward.toLocaleString()} ${currency}* y *${exp} XP* (◕ᴗ◕✿)`
    if (user.workStreak > 1) msg += `\n🔥 Racha x${user.workStreak} (+${Math.round((streakBonus - 1) * 100)}% bonus)`
    if (critMsg || doubleMsg) msg += critMsg + doubleMsg

    const img = await getRPGImage('work', trabajo)
    await client.sendMessage(m.chat, {
      text: msg,
    }, { quoted: m })
  }
}

// --- FUNCIONES AUXILIARES ---

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const min = minutes < 10 ? '0' + minutes : minutes
  const sec = seconds < 10 ? '0' + seconds : seconds
  return `${min} minutos y ${sec} segundos`
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

// --- LISTA DE TRABAJOS ---
const listaTrabajos = [
  "Trabajas como recolector de fresas",
  "Eres asistente en un taller de cerámica",
  "Diseñas páginas web",
  "Eres fotógrafo de bodas",
  "Trabajas en una tienda de mascotas",
  "Eres narrador de audiolibros",
  "Ayudas en el departamento de arte",
  "Trabajas como jardinero en un parque",
  "Eres un DJ en fiestas",
  "Hiciste un mural en una cafetería",
  "Trabajas como diseñador de interiores",
  "Eres un conductor de autobús turístico",
  "Preparas sushi en un restaurante",
  "Trabajas como asistente de investigación",
  "Eres especialista en marketing",
  "Trabajas en una granja orgánica",
  "Eres un bailarín en un espectáculo",
  "Organizas ferias de arte",
  "Eres un escritor freelance",
  "Hiciste un diseño gráfico para una campaña",
  "Trabajas como mecánico de automóviles",
  "Eres un instructor de surf",
  "Limpias casas como servicio de limpieza",
  "Eres un técnico de sonido en conciertos",
  "Trabajas como desarrollador de aplicaciones",
  "Eres un croupier en un casino",
  "Trabajas como estilista de cabello",
  "Eres un restaurador de arte",
  "Trabajas en una librería",
  "Eres un guía de montañismo",
  "Llevas un blog de viajes exitoso",
  "Hiciste una campaña de crowdfunding",
  "Trabajas como asistente social",
  "Eres un conductor de camión de carga",
  "Trabajas en un equipo de rescate",
  "Eres un consultor de negocios",
  "Realizas catas de vino",
  "Trabajas como barista en una cafetería",
  "Eres un entrenador de mascotas",
  "Hiciste un documental para una ONG",
  "Eres un operador de drones",
  "Trabajas en una productora de cine",
  "Eres un investigador de mercados",
  "Trabajas como repartidor de comida",
  "Eres un acupunturista",
  "Hiciste un diseño de joyas exclusivo",
  "Trabajas en atención al cliente",
  "Eres un conservador de museos",
  "Trabajas en un centro de rehabilitación",
  "Eres un piloto de helicóptero",
  "Hiciste una campaña de concienciación",
  "Trabajas en un taller de mecánica",
  "Eres un organizador de eventos deportivos",
  "Desarrollas una aplicación educativa",
  "Eres un técnico en redes informáticas",
  "Trabajas como asistente de producción en teatro",
  "Eres un ilustrador de libros para niños",
  "Trabajas en un centro de yoga",
  "Eres un chef personal",
  "Realizas un calendario de fotos",
  "Eres un promotor de salud y bienestar",
  "Trabajas como decorador de interiores",
  "Eres un arreglista floral",
  "Organizas un festival de música",
  "Eres un periodista de investigación",
  "Trabajas como asistente técnico de sonido",
  "Eres un mecánico de bicicletas",
  "Hiciste un video viral",
  "Trabajas como investigador científico",
  "Eres un organizador de conferencias",
  "Dibujas caricaturas en eventos",
  "Eres un responsable de relaciones públicas",
  "Trabajas como coach de vida",
  "Eres un educador en un centro cultural",
  "Eres un director de fotografía",
  "Trabajas en un refugio de animales",
  "Eres un guía en cenas temáticas",
  "Hiciste un proyecto de arte comunitario",
  "Eres un traductor de documentos",
  "Trabajas como asistente personal",
  "Eres un especialista en sostenibilidad",
  "Realizas un programa de radio",
  "Trabajas como tasador de arte",
  "Eres un creador de contenido",
  "Ayudaste a una anciana a cruzar la calle"
];
