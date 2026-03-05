import { resolveLidToRealJid } from '../../lib/utils.js'
import { getRPGImage } from '../../lib/rpgImages.js'

// ═══════════════════════════════════════════════════════════════
//  🔫 TIPOS DE CRIMEN — Cada uno tiene su propia mecánica
// ═══════════════════════════════════════════════════════════════
const TIPOS_CRIMEN = [
  {
    id: 'hackeo',
    emoji: '💻',
    nombre: 'Hackeo Bancario',
    desc: 'Intentas hackear un sistema financiero',
    exito: [
      (c, mon, v) => `💻 Hackeaste la base de datos del banco central y desviaste *¥${c} ${mon}* a tu cuenta offshore!`,
      (c, mon, v) => `💻 Inyectaste un virus en el sistema bancario y extrajiste *¥${c} ${mon}*!`,
      (c, mon, v) => `💻 Accediste al mainframe con una vulnerabilidad zero-day y sacaste *¥${c} ${mon}*!`,
      (c, mon, v) => `💻 Lucoa te prestó su laptop mágica y hackeaste *¥${c} ${mon}* en segundos 🐉`,
    ],
    fallo: [
      (c, mon) => `💻 El firewall te detectó y la policía cibernética rastreó tu IP. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `💻 Un hacker más experto te contra-hackeó y vaciaron tu cuenta. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `💻 Lucoa bloqueó tu conexión con su barrera digital 🐉 Multa: *-¥${c} ${mon}*`,
    ],
    multMin: 0.10, multMax: 0.20,
    ganMin: 8000, ganMax: 35000,
    xpGain: 300, xpLoss: 80,
    healthLoss: 0,
  },
  {
    id: 'atraco',
    emoji: '🏦',
    nombre: 'Atraco a Banco',
    desc: 'Asaltas un banco con un plan elaborado',
    exito: [
      (c, mon) => `🏦 Ejecutaste un atraco perfecto al estilo película y te llevaste *¥${c} ${mon}*!`,
      (c, mon) => `🏦 Entraste por los ductos de ventilación, desactivaste las alarmas y escapaste con *¥${c} ${mon}*!`,
      (c, mon) => `🏦 Tu equipo de asalto tomó el banco en 3 minutos. Botín: *¥${c} ${mon}*!`,
      (c, mon) => `🏦 Usaste una máscara de dragón, intimidaste a todos y huiste con *¥${c} ${mon}* 🐲`,
    ],
    fallo: [
      (c, mon) => `🏦 El guardia de seguridad te reconoció y llamó a la policía. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🏦 Activaste la alarma silenciosa y el SWAT te rodeó. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🏦 Lucoa estaba custodiando la bóveda personalmente~ 🐉 Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🏦 Tu cómplice te delató a cambio de inmunidad. Multa: *-¥${c} ${mon}*`,
    ],
    multMin: 0.12, multMax: 0.25,
    ganMin: 12000, ganMax: 50000,
    xpGain: 500, xpLoss: 120,
    healthLoss: 15,
  },
  {
    id: 'contrabando',
    emoji: '📦',
    nombre: 'Contrabando',
    desc: 'Traficas con mercancía ilegal',
    exito: [
      (c, mon) => `📦 Pasaste un cargamento por la frontera sin ser detectado y ganaste *¥${c} ${mon}*!`,
      (c, mon) => `📦 Vendiste mercancía exótica en el mercado negro por *¥${c} ${mon}*!`,
      (c, mon) => `📦 Tu red de contrabando distribuyó la carga perfectamente. Ganancia: *¥${c} ${mon}*!`,
      (c, mon) => `📦 Lucoa distrajo a los guardias con su encanto mientras pasabas la carga~ *¥${c} ${mon}* 🐉`,
    ],
    fallo: [
      (c, mon) => `📦 La aduana interceptó tu cargamento y te multaron. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `📦 Un soplón te delató y confiscaron toda la mercancía. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `📦 Lucoa olió tu cargamento sospechoso a kilómetros 🐉 Multa: *-¥${c} ${mon}*`,
    ],
    multMin: 0.08, multMax: 0.18,
    ganMin: 10000, ganMax: 40000,
    xpGain: 400, xpLoss: 100,
    healthLoss: 5,
  },
  {
    id: 'estafa',
    emoji: '🎭',
    nombre: 'Estafa Maestra',
    desc: 'Montas un esquema de estafa elaborado',
    exito: [
      (c, mon) => `🎭 Tu esquema piramidal funcionó a la perfección y recaudaste *¥${c} ${mon}*!`,
      (c, mon) => `🎭 Vendiste NFTs falsos de dragones y ganaste *¥${c} ${mon}* 🐲`,
      (c, mon) => `🎭 Te hiciste pasar por un príncipe nigeriano y alguien cayó. Ganancia: *¥${c} ${mon}*!`,
      (c, mon) => `🎭 Montaste una subasta falsa de arte robado y obtuviste *¥${c} ${mon}*!`,
      (c, mon) => `🎭 Lucoa te enseñó el arte de la persuasión y estafaste *¥${c} ${mon}* 🐉`,
    ],
    fallo: [
      (c, mon) => `🎭 Tu víctima resultó ser un detective encubierto. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🎭 Alguien grabó toda la estafa y la subió a Internet. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🎭 Lucoa detectó tu estafa y te obligó a devolver todo~ 🐉 Multa: *-¥${c} ${mon}*`,
    ],
    multMin: 0.10, multMax: 0.22,
    ganMin: 9000, ganMax: 45000,
    xpGain: 360, xpLoss: 90,
    healthLoss: 0,
  },
  {
    id: 'robo_joyas',
    emoji: '💎',
    nombre: 'Robo de Joyería',
    desc: 'Asaltas una joyería de alta gama',
    exito: [
      (c, mon) => `💎 Cortaste el cristal con un láser y te llevaste diamantes por *¥${c} ${mon}*!`,
      (c, mon) => `💎 Reemplazaste las joyas reales por imitaciones. Nadie notó nada. Ganancia: *¥${c} ${mon}*!`,
      (c, mon) => `💎 Te infiltraste como empleado y robaste la colección privada. Valor: *¥${c} ${mon}*!`,
      (c, mon) => `💎 Cavaste un túnel hasta la bóveda y te llevaste todo por *¥${c} ${mon}*!`,
    ],
    fallo: [
      (c, mon) => `💎 Las joyas tenían rastreadores GPS y la policía te encontró. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `💎 El dueño de la joyería era un ex-mafioso... no terminó bien. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `💎 Lucoa reconoció las joyas como suyas y te hizo devolverlas 🐉 Multa: *-¥${c} ${mon}*`,
    ],
    multMin: 0.15, multMax: 0.28,
    ganMin: 15000, ganMax: 60000,
    xpGain: 600, xpLoss: 150,
    healthLoss: 10,
  },
  {
    id: 'casino',
    emoji: '🎰',
    nombre: 'Fraude en Casino',
    desc: 'Haces trampa en un casino clandestino',
    exito: [
      (c, mon) => `🎰 Contaste cartas como un genio y arrasaste la mesa por *¥${c} ${mon}*!`,
      (c, mon) => `🎰 Usaste dados cargados y nadie se dio cuenta. Ganancia: *¥${c} ${mon}*!`,
      (c, mon) => `🎰 Hackeaste la máquina tragamonedas y salió jackpot: *¥${c} ${mon}*!`,
      (c, mon) => `🎰 Sobornaste al croupier y ganaste todas las manos por *¥${c} ${mon}*!`,
    ],
    fallo: [
      (c, mon) => `🎰 El pit boss te pilló con dados cargados y te sacaron a golpes. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🎰 La seguridad del casino revisó las grabaciones. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🎰 Lucoa era la dueña del casino y te atrapó haciendo trampa 🐉 Multa: *-¥${c} ${mon}*`,
    ],
    multMin: 0.12, multMax: 0.24,
    ganMin: 10000, ganMax: 55000,
    xpGain: 440, xpLoss: 110,
    healthLoss: 20,
  },
  {
    id: 'asalto',
    emoji: '🔪',
    nombre: 'Asalto en la Calle',
    desc: 'Emboscas a alguien en un callejón oscuro',
    exito: [
      (c, mon) => `🔪 Emboscaste a un millonario en un callejón y le quitaste *¥${c} ${mon}*!`,
      (c, mon) => `🔪 Asaltaste una camioneta blindada con una banda y sacaste *¥${c} ${mon}*!`,
      (c, mon) => `🔪 El mensajero no tuvo oportunidad... te llevaste *¥${c} ${mon}*!`,
    ],
    fallo: [
      (c, mon) => `🔪 Tu víctima resultó tener cinturón negro y te dejó en el suelo. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🔪 Había una cámara de seguridad que no viste. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🔪 Lucoa apareció en el callejón y te dio un escarmiento 🐉 Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🔪 La víctima era un policía encubierto... Multa: *-¥${c} ${mon}*`,
    ],
    multMin: 0.10, multMax: 0.20,
    ganMin: 6000, ganMax: 30000,
    xpGain: 260, xpLoss: 70,
    healthLoss: 25,
  },
  {
    id: 'cibercrimen',
    emoji: '🌐',
    nombre: 'Cibercrimen Internacional',
    desc: 'Operas una red criminal desde la dark web',
    exito: [
      (c, mon) => `🌐 Vendiste datos robados en la dark web por *¥${c} ${mon}*!`,
      (c, mon) => `🌐 Tu ransomware cifró los archivos de una empresa y pagaron *¥${c} ${mon}* de rescate!`,
      (c, mon) => `🌐 Lavaste dinero a través de 47 cuentas fantasma y obtuviste *¥${c} ${mon}*!`,
      (c, mon) => `🌐 Minaste criptomonedas con servidores robados y ganaste *¥${c} ${mon}*!`,
    ],
    fallo: [
      (c, mon) => `🌐 Interpol rastreó tu VPN y te identificaron. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🌐 Tu socio en la dark web era un agente del FBI. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🌐 Lucoa hackeó tu hackeo con magia antigua 🐉 Multa: *-¥${c} ${mon}*`,
    ],
    multMin: 0.14, multMax: 0.26,
    ganMin: 12000, ganMax: 65000,
    xpGain: 560, xpLoss: 140,
    healthLoss: 0,
  },
  {
    id: 'infiltracion',
    emoji: '🕵️',
    nombre: 'Infiltración',
    desc: 'Te infiltras en una organización',
    exito: [
      (c, mon) => `🕵️ Te infiltraste como conserje en una mansión y vaciaste la caja fuerte por *¥${c} ${mon}*!`,
      (c, mon) => `🕵️ Pasaste 3 semanas haciéndote pasar por empleado y desviaste *¥${c} ${mon}*!`,
      (c, mon) => `🕵️ Robaste los planos secretos y los vendiste al mejor postor por *¥${c} ${mon}*!`,
      (c, mon) => `🕵️ Lucoa te disfrazó con magia de transformación y nadie sospechó~ *¥${c} ${mon}* 🐉`,
    ],
    fallo: [
      (c, mon) => `🕵️ Tu disfraz se cayó en el peor momento posible. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🕵️ El jefe de seguridad era tu ex... y te reconoció. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🕵️ Lucoa te delató porque olvidaste pagarle su tajada 🐉 Multa: *-¥${c} ${mon}*`,
    ],
    multMin: 0.11, multMax: 0.21,
    ganMin: 11000, ganMax: 48000,
    xpGain: 460, xpLoss: 100,
    healthLoss: 8,
  },
  {
    id: 'falsificacion',
    emoji: '🖨️',
    nombre: 'Falsificación',
    desc: 'Falsificas documentos, dinero o arte',
    exito: [
      (c, mon) => `🖨️ Imprimiste billetes casi perfectos y los cambiaste por *¥${c} ${mon}*!`,
      (c, mon) => `🖨️ Falsificaste un Picasso y lo vendiste en una subasta por *¥${c} ${mon}*!`,
      (c, mon) => `🖨️ Creaste pasaportes falsos para una red de espías y cobraste *¥${c} ${mon}*!`,
      (c, mon) => `🖨️ Lucoa autenticó tu falsificación con su sello mágico~ *¥${c} ${mon}* 🐉`,
    ],
    fallo: [
      (c, mon) => `🖨️ El experto en arte descubrió que tu pintura era falsa. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🖨️ Los billetes tenían errores de ortografía... vergonzoso. Multa: *-¥${c} ${mon}*`,
      (c, mon) => `🖨️ Lucoa reconoció la tinta barata que usaste 🐉 Multa: *-¥${c} ${mon}*`,
    ],
    multMin: 0.09, multMax: 0.19,
    ganMin: 8000, ganMax: 38000,
    xpGain: 340, xpLoss: 85,
    healthLoss: 0,
  },
]

// ═══ EVENTOS ALEATORIOS (se activan después del crimen) ═══
const EVENTOS_RANDOM = [
  {
    emoji: '🐉',
    msg: (mon, cant) => `\n│\n│ 🐉 *— Evento: Bendición de Lucoa —*\n│ Lucoa vio tu audacia y te recompensó\n│ con *¥${cant} ${mon}* extra~`,
    apply: (user, mon) => { const extra = rInt(1000, 8000); user.coins += extra; return extra },
    chance: 0.08,
  },
  {
    emoji: '💀',
    msg: (mon, cant) => `\n│\n│ 💀 *— Evento: Karma Instantáneo —*\n│ La maldición del karma te alcanzó...\n│ Perdiste *¥${cant} ${mon}* adicionales.`,
    apply: (user) => { const loss = rInt(500, 5000); user.coins = Math.max(0, user.coins - loss); return loss },
    chance: 0.10,
  },
  {
    emoji: '⚡',
    msg: (mon, cant) => `\n│\n│ ⚡ *— Evento: Doble o Nada —*\n│ ¡La suerte te sonríe! Tu ganancia\n│ se duplicó: *+¥${cant} ${mon}* extra!`,
    apply: (user, mon, ganancia) => { user.coins += ganancia; return ganancia },
    chance: 0.05,
    soloExito: true,
  },
  {
    emoji: '🏥',
    msg: (mon, cant) => `\n│\n│ 🏥 *— Evento: Herida en la Huida —*\n│ Te lesionaste escapando...\n│ Perdiste *${cant} HP*`,
    apply: (user) => { const hp = rInt(10, 30); user.health = Math.max(0, (user.health ?? 100) - hp); return hp },
    chance: 0.12,
  },
  {
    emoji: '🎁',
    msg: (mon, cant) => `\n│\n│ 🎁 *— Evento: Hallazgo Inesperado —*\n│ Mientras huías encontraste un cofre\n│ escondido con *¥${cant} ${mon}*!`,
    apply: (user) => { const bonus = rInt(2000, 12000); user.coins += bonus; return bonus },
    chance: 0.06,
  },
  {
    emoji: '👮',
    msg: (mon, cant) => `\n│\n│ 👮 *— Evento: Soborno Policial —*\n│ Un policía corrupto te extorsionó.\n│ Pagaste *¥${cant} ${mon}* para que te deje ir.`,
    apply: (user) => { const sob = rInt(800, 4000); user.coins = Math.max(0, user.coins - sob); return sob },
    chance: 0.09,
  },
  {
    emoji: '🔮',
    msg: (mon, cant) => `\n│\n│ 🔮 *— Evento: Orbe de Experiencia —*\n│ Un orbe místico absorbió tu adrenalina\n│ y te dio *+${cant} XP*!`,
    apply: (user) => { const xp = rInt(200, 1500); user.exp = (user.exp || 0) + xp; return xp },
    chance: 0.10,
  },
  {
    emoji: '🐲',
    msg: (mon, cant) => `\n│\n│ 🐲 *— Evento: Cola de Dragón —*\n│ Lucoa te dio un coletazo por ladrón~\n│ Perdiste *${cant} HP* y *-¥${cant} ${mon}*`,
    apply: (user) => { const dmg = rInt(5, 20); user.health = Math.max(0, (user.health ?? 100) - dmg); user.coins = Math.max(0, user.coins - dmg * 100); return dmg },
    chance: 0.07,
  },
]

export default {
  command: ['crime'],
  category: 'rpg',
  run: async ({client, m}) => {
    if (!m.isGroup) return m.reply('🐲 Este comando solo funciona en grupos (◕ᴗ◕✿)')

    const chatId = m.chat
    const user = global.db.data.users[m.sender]
    const senderId = await resolveLidToRealJid(m.sender, client, chatId)
    
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const monedas = settings.currency || 'monedas'

    const chatData = global.db.data.chats[chatId]
    if (chatData.adminonly || !chatData.rpg)
      return m.reply('🐉 La economía está dormida en este grupo zzZ')

    if (!user.crimeCooldown) user.crimeCooldown = 0
    const remainingTime = user.crimeCooldown - Date.now()

    if (remainingTime > 0) {
      return m.reply(`🐲 Espera *${msToTime(remainingTime)}* para otro crimen (◕︿◕✿)`)
    }

    // ═══ ELEGIR TIPO DE CRIMEN ALEATORIO ═══
    const crimen = pickRandom(TIPOS_CRIMEN)

    // ═══ DETECTAR VÍCTIMA ═══
    const mentioned = m.mentionedJid || []
    const who = mentioned[0] || (m.quoted ? m.quoted.sender : null)
    let targetId = null
    let targetData = null
    let targetName = null
    let fueAleatorio = false

    if (who) {
      targetId = await resolveLidToRealJid(who, client, chatId)
      if (targetId === senderId) return m.reply('🐲 No puedes hacerte un crimen a ti mismo (≧◡≦)')
      if (targetId === botId) return m.reply('🐲 No puedes robarme a mí~ soy un dragón (◕ᴗ◕✿) 🐉')
      targetData = global.db.data.users[targetId]
      if (!targetData) return m.reply('🐲 Ese usuario no tiene cuenta registrada (◕︿◕)')
      targetName = targetData.name || targetId.split('@')[0]
    } else if (Math.random() < 0.4) {
      // ═══ VÍCTIMA ALEATORIA (40% de probabilidad) ═══
      // Solo buscar entre miembros reales del grupo
      try {
        const groupMetadata = await client.groupMetadata(chatId)
        const miembrosGrupo = groupMetadata.participants.map(p => p.id)
        const allUsers = global.db.data.users || {}
        const candidatos = Object.entries(allUsers).filter(([id, data]) => {
          if (id === senderId) return false
          if (id === botId) return false
          if (!miembrosGrupo.includes(id)) return false
          if ((data.bank || 0) < 200 && (data.coins || 0) < 200) return false
          return true
        })

        if (candidatos.length > 0) {
          const [victimaId, victimaData] = candidatos[Math.floor(Math.random() * candidatos.length)]
          targetId = victimaId
          targetData = victimaData
          targetName = victimaData.name || victimaId.split('@')[0]
          fueAleatorio = true
        }
      } catch {}
    }

    const éxito = Math.random() < 0.5
    const now = Date.now()
    user.crimeCooldown = now + 7 * 60 * 1000
    user.health = user.health ?? 100

    // ═══ MODO CON VÍCTIMA ═══
    if (targetData) {
      const bancoVictima = targetData.bank || 0
      const coinsVictima = targetData.coins || 0
      let robandoBanco = bancoVictima >= 100
      let baseRobo = robandoBanco ? bancoVictima : coinsVictima

      if (baseRobo < 100) {
        user.crimeCooldown = now + 5 * 60 * 1000
        return m.reply(`🐲 *${targetName}* está en la ruina total... no tiene nada que valga la pena robar (╥﹏╥)`)
      }

      const porcentaje = (Math.random() * 0.15) + 0.05
      const cantidad = Math.floor(baseRobo * porcentaje)
      const aleatorioTag = fueAleatorio ? `\n│ 🎯 *Víctima aleatoria del grupo*` : ''
      const fuenteRobo = robandoBanco ? 'banco' : 'bolsillo'

      if (éxito) {
        if (robandoBanco) targetData.bank -= cantidad
        else targetData.coins -= cantidad
        user.coins += cantidad
        user.exp = (user.exp || 0) + crimen.xpGain

        // 12% de chance de robar personaje
        let charMsg = ''
        const chatUsers = chatData.users || {}
        const victimLocal = chatUsers[targetId]

        if (victimLocal?.characters?.length > 0 && Math.random() < 0.20) {
          const charIndex = Math.floor(Math.random() * victimLocal.characters.length)
          const personajeRobado = victimLocal.characters[charIndex]

          if (!personajeRobado.protectionUntil || personajeRobado.protectionUntil <= now) {
            victimLocal.characters.splice(charIndex, 1)
            if (!chatData.users[senderId]) chatData.users[senderId] = { characters: [] }
            if (!chatData.users[senderId].characters) chatData.users[senderId].characters = []
            delete personajeRobado.protectionUntil
            personajeRobado.obtainedAt = now
            personajeRobado.origin = 'crime'
            chatData.users[senderId].characters.push(personajeRobado)
            charMsg = `\n│\n│ 🐉 *¡BONUS! También robaste un personaje!*\n│ ❀ *${personajeRobado.name}* (${personajeRobado.source || '???'})\n│ ❀ Valor: *¥${(personajeRobado.value || 0).toLocaleString()}*`
          }
        }

        // Evento aleatorio post-crimen
        let eventoMsg = ''
        for (const evento of EVENTOS_RANDOM) {
          if (evento.soloExito !== undefined && !evento.soloExito) continue
          if (Math.random() < evento.chance) {
            const result = evento.apply(user, monedas, cantidad)
            eventoMsg = evento.msg(monedas, result.toLocaleString())
            break
          }
        }

        if (typeof global.markDBDirty === 'function') global.markDBDirty()

        const msgExito = pickRandom(crimen.exito)(cantidad.toLocaleString(), monedas, targetName)

        const img = await getRPGImage('crime', crimen.id)
        return client.sendMessage(chatId, {
          image: { url: img },
          caption: `╭─── ⋆🐉⋆ ───\n│ ${crimen.emoji} *${crimen.nombre}*\n├───────────────${aleatorioTag}\n│ ${msgExito}\n│ ⚡ *+${crimen.xpGain} XP*${charMsg}${eventoMsg}\n╰─── ⋆🐲⋆ ───\n> 🐉 *Lucoa Bot* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`,
          mentions: [targetId],
        }, { quoted: m })

      } else {
        // ═══ FRACASO CON VÍCTIMA ═══
        const multPercent = crimen.multMin + (Math.random() * (crimen.multMax - crimen.multMin))
        const multa = Math.floor((user.coins || 0) * multPercent)
        applyFine(user, multa)

        if (crimen.healthLoss > 0) {
          user.health = Math.max(0, user.health - crimen.healthLoss)
        }
        user.exp = Math.max(0, (user.exp || 0) - crimen.xpLoss)

        // Evento aleatorio en fracaso
        let eventoMsg = ''
        for (const evento of EVENTOS_RANDOM) {
          if (evento.soloExito) continue
          if (Math.random() < evento.chance) {
            const result = evento.apply(user, monedas, 0)
            eventoMsg = evento.msg(monedas, result.toLocaleString())
            break
          }
        }

        if (typeof global.markDBDirty === 'function') global.markDBDirty()

        const msgFallo = pickRandom(crimen.fallo)(multa.toLocaleString(), monedas)
        let penalidades = `\n│ ⚡ *-${crimen.xpLoss} XP*`
        if (crimen.healthLoss > 0) penalidades += `\n│ 💔 *-${crimen.healthLoss} HP*`

        const imgFail = await getRPGImage('crime', 'fail')
        return client.sendMessage(chatId, {
          image: { url: imgFail },
          caption: `╭─── ⋆🐉⋆ ───\n│ 🚔 *${crimen.nombre} — FALLIDO*\n├───────────────${aleatorioTag}\n│ ${msgFallo}${penalidades}${eventoMsg}\n╰─── ⋆🐲⋆ ───\n> 🐉 *Lucoa Bot* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`,
          mentions: [targetId],
        }, { quoted: m })
      }
    }

    // ═══ MODO SOLO (sin víctima disponible) ═══
    const cantidad = rInt(crimen.ganMin, crimen.ganMax)

    if (éxito) {
      user.coins += cantidad
      user.exp = (user.exp || 0) + crimen.xpGain

      let eventoMsg = ''
      for (const evento of EVENTOS_RANDOM) {
        if (evento.soloExito !== undefined && !evento.soloExito) continue
        if (Math.random() < evento.chance) {
          const result = evento.apply(user, monedas, cantidad)
          eventoMsg = evento.msg(monedas, result.toLocaleString())
          break
        }
      }

      if (typeof global.markDBDirty === 'function') global.markDBDirty()

      const msgExito = pickRandom(crimen.exito)(cantidad.toLocaleString(), monedas, 'alguien')

      const imgSolo = await getRPGImage('crime', crimen.id)
      await client.sendMessage(chatId, {
        image: { url: imgSolo },
        caption: `╭─── ⋆🐉⋆ ───\n│ ${crimen.emoji} *${crimen.nombre}*\n├───────────────\n│ ${msgExito}\n│ ⚡ *+${crimen.xpGain} XP*${eventoMsg}\n╰─── ⋆🐲⋆ ───\n> 🐉 *Lucoa Bot* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`,
      }, { quoted: m })
    } else {
      const multPercent = crimen.multMin + (Math.random() * (crimen.multMax - crimen.multMin))
      const multa = Math.min(cantidad, Math.floor((user.coins || 0) * multPercent) || cantidad)
      applyFine(user, multa)

      if (crimen.healthLoss > 0) {
        user.health = Math.max(0, user.health - crimen.healthLoss)
      }
      user.exp = Math.max(0, (user.exp || 0) - crimen.xpLoss)

      let eventoMsg = ''
      for (const evento of EVENTOS_RANDOM) {
        if (evento.soloExito) continue
        if (Math.random() < evento.chance) {
          const result = evento.apply(user, monedas, 0)
          eventoMsg = evento.msg(monedas, result.toLocaleString())
          break
        }
      }

      if (typeof global.markDBDirty === 'function') global.markDBDirty()

      const msgFallo = pickRandom(crimen.fallo)(multa.toLocaleString(), monedas)
      let penalidades = `\n│ ⚡ *-${crimen.xpLoss} XP*`
      if (crimen.healthLoss > 0) penalidades += `\n│ 💔 *-${crimen.healthLoss} HP*`

      const imgSoloFail = await getRPGImage('crime', 'fail')
      await client.sendMessage(chatId, {
        image: { url: imgSoloFail },
        caption: `╭─── ⋆🐉⋆ ───\n│ 🚔 *${crimen.nombre} — FALLIDO*\n├───────────────\n│ ${msgFallo}${penalidades}${eventoMsg}\n╰─── ⋆🐲⋆ ───\n> 🐉 *Lucoa Bot* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`,
      }, { quoted: m })
    }
  },
};

// ═══ UTILIDADES ═══

function applyFine(user, multa) {
  const total = (user.coins || 0) + (user.bank || 0)
  if (total >= multa) {
    if (user.coins >= multa) {
      user.coins -= multa
    } else {
      const restante = multa - user.coins
      user.coins = 0
      user.bank = Math.max(0, (user.bank || 0) - restante)
    }
  } else {
    user.coins = 0
    user.bank = 0
  }
}

function rInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0) parts.push(`${seconds}s`)
  return parts.join(' ') || '0s'
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}
