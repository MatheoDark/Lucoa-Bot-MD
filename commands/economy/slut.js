import { resolveLidToRealJid } from '../../lib/utils.js'

export default {
  command: ['slut', 'prostituirse'],
  category: 'rpg',
  run: async ({ client, m, groupMetadata }) => {
    
    // 1. Verificación de Grupo
    if (!m.isGroup) return client.reply(m.chat, '❌ Este comando solo funciona en grupos.', m)

    // 2. Configuración de Grupo
    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) {
         return m.reply(`✎ Estos comandos están desactivados en este grupo.`)
    }

    // 3. Resolución de Usuario
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    let user = global.db.data.users[userId]

    if (!user) {
         global.db.data.users[userId] = { exp: 0, coins: 0, logros: {}, lastProsti: 0 }
         user = global.db.data.users[userId]
    }

    // 4. Configuración del Bot
    let botId = client.user.id.split(':')[0] + '@s.whatsapp.net';
    let botSettings = global.db.data.settings[botId] || {}
    let currency = botSettings.currency || 'monedas'

    // 5. Cooldown
    let cooldown = 10 * 60 * 1000 // 10 minutos
    let tiempoRestante = (user.lastProsti || 0) + cooldown - Date.now()

    if (tiempoRestante > 0) {
      return client.reply(m.chat, `💋 Debes esperar ⏱️ *${msToTime(tiempoRestante)}* para volver a prostituirte.`, m)
    }

    // 6. Obtener Participantes
    let participants = groupMetadata?.participants || []
    if (!participants.length) {
        try {
            const meta = await client.groupMetadata(m.chat)
            participants = meta.participants || []
        } catch (e) {
            console.log('Error obteniendo participantes:', e)
        }
    }

    // Filtramos clientes
    let clientes = participants
      .map(v => v.id || v.jid)
      .filter(id => id && id !== userId && id !== botId)
    
    if (clientes.length === 0) return client.reply(m.chat, '💔 No hay clientes disponibles ahora mismo...', m)

    // 7. Ejecutar Acción
    user.lastProsti = Date.now()
    
    let clienteId = clientes[Math.floor(Math.random() * clientes.length)]
    let clienteTag = '@' + clienteId.split('@')[0]

    // 70% de probabilidad de éxito
    let exito = Math.random() < 0.7

    if (exito) {
      // --- GANAR ---
      let xpGanado = Math.floor(Math.random() * (5000 - 500 + 1)) + 500
      let coinsGanados = Math.floor(Math.random() * (5000 - 5 + 1)) + 5
      
      let texto = pickRandom(aventurasExito)
          .replace('{cliente}', clienteTag)
          .replace('{currency}', currency)

      user.exp = (user.exp || 0) + xpGanado
      user.coins = (user.coins || 0) + coinsGanados

      return client.reply(
        m.chat,
        `💄 ${texto} y ganaste *${toNum(xpGanado)} XP* + *${coinsGanados} ${currency}*.`,
        m,
        { mentions: [clienteId] }
      )
    } else {
      // --- PERDER ---
      let xpPerdido = Math.floor(Math.random() * (4000 - 200 + 1)) + 200
      let coinsPerdidos = Math.floor(Math.random() * (4000 - 2 + 1)) + 2
      
      let texto = pickRandom(aventurasFracaso)
          .replace('{cliente}', clienteTag)
          .replace('{currency}', currency)

      user.exp = Math.max(0, (user.exp || 0) - xpPerdido)
      user.coins = Math.max(0, (user.coins || 0) - coinsPerdidos)

      return client.reply(
        m.chat,
        `💔 ${texto} Perdiste *${toNum(xpPerdido)} XP* y *${coinsPerdidos} ${currency}*...`,
        m,
        { mentions: [clienteId] }
      )
    }
  }
}

// --- FUNCIONES AUXILIARES ---

function toNum(number) {
  if (number >= 1000 && number < 1000000) return (number / 1000).toFixed(1) + 'k'
  if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M'
  return number.toString()
}

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const min = minutes < 10 ? '0' + minutes : minutes;
  const sec = seconds < 10 ? '0' + seconds : seconds;
  return `${min} minutos y ${sec} segundos`;
}

function pickRandom(list) {
  return list[Math.floor(list.length * Math.random())]
}

// --- LISTAS EXTENDIDAS ---

const aventurasExito = [
    // Clásicos
    "Pasaste una noche inolvidable con {cliente}",
    "{cliente} quedó fascinado con tu actuación",
    "La noche con {cliente} fue un éxito rotundo",
    "Fuiste la sensación para {cliente}, quien te recomendó a todos",
    "{cliente} te contrató para toda la noche y te pagó muy bien",
    "{cliente} quedó impresionado por tu carisma y te dio una propina generosa",
    "Organizaste un evento épico con {cliente} que todos recordarán",
    "{cliente} te pidió que volvieras porque fue una experiencia increíble",
    "Tu encanto deslumbró a {cliente}, quien no paró de alabarte",
    "{cliente} te premió con un cofre lleno de tesoros por tu talento",
    "Hiciste un trato perfecto con {cliente} y ambos salieron ganando",
    "{cliente} te nombró la estrella de la noche por tu gran desempeño",
    "Tu aventura con {cliente} fue tan buena que te ganaste su lealtad", 
    "{cliente} quedó tan encantado que te pagó el doble por tus servicios",
    "Tuviste una noche salvaje con {cliente} y te llenó de billetes",
    "{cliente} no pudo resistirse a tu encanto y te dio una fortuna",
    "Hiciste un show inolvidable para {cliente} y te bañaron en {currency}",
    "{cliente} te pidió que volvieras mañana con una bolsa llena de XP",
    "Tu noche con {cliente} fue tan intensa que te dieron un bono extra",
    "{cliente} gritó tu nombre toda la noche y te dejó un montón de {currency}",
    "Lograste seducir a {cliente} y te llevaste todo su dinero",
    
    // Nuevos Agregados
    "Le bailaste un privado a {cliente} y te vació la billetera",
    "{cliente} se enamoró de tus pies y te pagó por masajearlos",
    "Hiciste cosplay para {cliente} y quedó fascinado",
    "Fuiste la cita falsa de {cliente} en una boda y te pagó extra por actuar bien",
    "{cliente} te pagó solo por que le hicieras compañía (final feliz incluido)",
    "Hiciste un streaming privado para {cliente} y te llenó de donaciones",
    "{cliente} te encontró en Tinder y pagó el premium por verte",
    "Tuviste una cita en un yate con {cliente} y te regaló joyas",
    "Fuiste el regalo de cumpleaños de {cliente} y le encantaste",
    "{cliente} te contrató para darle celos a su ex y funcionó de maravilla",
    "Hiciste realidad la fantasía más oscura de {cliente}",
    "{cliente} estaba triste y tu 'consuelo' le alegró la vida (y tu bolsillo)",
    "Te encontraste a {cliente} en un club VIP y te invitó a todo",
    "{cliente} te pagó por adelantado y ni siquiera te tocó, ¡dinero fácil!",
    "Tu disfraz de enfermera/o volvió loco a {cliente}"
];

const aventurasFracaso = [
    // Clásicos
    "{cliente} te miró, pero se fue sin pagar",
    "{cliente} se asustó y salió corriendo",
    "Pasaste horas esperando a {cliente}, pero no llegó",
    "{cliente} te confundió con otra persona y no te pagó",
    "{cliente} te hizo perder el tiempo y encima te robó {currency}",
    "{cliente} canceló el trato en el último momento y te dejó sin nada",
    "Intentaste impresionar a {cliente}, pero se rió y se fue",
    "{cliente} dijo que no estaba interesado y te dejó plantado",
    "Un malentendido con {cliente} hizo que perdieras tu oportunidad",
    "{cliente} te prometió una gran recompensa, pero era una estafa",
    "Tu plan con {cliente} salió mal y terminaste perdiendo recursos",
    "Intentaste negociar con {cliente}, pero no lograste convencerlo",
    "{cliente} te ignoró completamente y se fue con alguien más",
    "{cliente} te dejó plantado después de prometerte una noche inolvidable",
    "Intentaste conquistar a {cliente}, pero se rió en tu cara y se fue",
    "{cliente} te dio un billete falso y se escapó con tus {currency}",
    "Tu plan con {cliente} fue un desastre y te dejó sin un centavo",
    "{cliente} te rechazó diciendo que no eras su tipo y te robó XP",
    "Pasaste la noche con {cliente}, pero se fue sin dejar ni un dulce",
    "{cliente} te prometió una gran suma, pero te estafó y huyó",
    "Intentaste un movimiento atrevido con {cliente}, pero te dio un portazo",
    
    // Nuevos Agregados
    "Resultó que {cliente} era un policía encubierto y tuviste que sobornarlo",
    "{cliente} se quedó dormido antes de empezar y no te pagó",
    "Te tropezaste al entrar y {cliente} se murió de la risa (y se fue)",
    "Resultó que {cliente} era tu ex y saliste corriendo de la vergüenza",
    "{cliente} solo quería hablar de sus problemas emocionales toda la noche gratis",
    "La esposa/o de {cliente} llegó y tuviste que saltar por la ventana",
    "{cliente} te vomitó encima y tuviste que gastar en lavandería",
    "Te dio un calambre en medio del acto y {cliente} pidió reembolso",
    "{cliente} te reconoció de la iglesia y te dio un sermón en lugar de dinero",
    "Tu ropa se rompió antes de tiempo y {cliente} pidió descuento",
    "{cliente} quería pagar con cupones de descuento vencidos",
    "Te quedaste dormido en pleno trabajo y {cliente} te robó la cartera",
    "{cliente} te grabó sin permiso y tuviste que pagar para borrar el video",
    "El perro de {cliente} te mordió y tuviste que ir al hospital",
    "{cliente} te confundió con su madre/padre... fue muy incómodo"
];
