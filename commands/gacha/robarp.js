import { resolveLidToRealJid } from '../../lib/utils.js'

// --- CONFIGURACIÓN ---
const COOLDOWN_TIME = 5 * 60 * 60 * 1000 // 5 horas
const HEALTH_REQUIRED = 50 
const HEALTH_LOSS_ON_FAIL = 20 
const XP_LOSS_PERCENT = 0.05 

const ellenImage = 'https://github.com/MatheoDark/Lucoa-Bot-MD/blob/main/media/banner2.jpg?raw=true'

const msToTime = (duration) => {
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${hours}h ${minutes}m`
}

export default {
  command: ['robarwaifu', 'stealwaifu', 'stealchar'],
  category: 'gacha',
  run: async ({ client, m, args }) => {
    
    if (!m.isGroup) return m.reply('🐲 Este comando es exclusivo para grupos. (◕︿◕)')
    
    const db = global.db.data
    const chatId = m.chat
    const thiefId = await resolveLidToRealJid(m.sender, client, chatId)
    const thiefName = db.users[thiefId]?.name || m.pushName || 'Desconocido'
    const now = Date.now()

    // Contexto
    const contextInfo = {
        mentionedJid: [thiefId],
        externalAdReply: {
            title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
            body: `— Operación de Extracción para ${thiefName}`,
            thumbnailUrl: ellenImage,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }

    // 1. Verificar Cooldown
    const userGlobal = db.users[thiefId] || {}
    const lastSteal = userGlobal.lastSteal || 0
    
    if (now - lastSteal < COOLDOWN_TIME) {
        const remaining = msToTime(COOLDOWN_TIME - (now - lastSteal))
        return client.sendMessage(m.chat, { 
            text: `*— Oye, relájate.* Estás demasiado agotado. Ve a descansar **${remaining}** más.`,
            contextInfo 
        }, { quoted: m })
    }

    // 2. IDENTIFICAR VÍCTIMA (Por Mención o Reply)
    let victimId = null
    if (m.quoted) {
        victimId = await resolveLidToRealJid(m.quoted.sender, client, chatId)
    } else if (m.mentionedJid && m.mentionedJid.length > 0) {
        victimId = await resolveLidToRealJid(m.mentionedJid[0], client, chatId)
    }

    // Validación básica
    if (victimId === thiefId) {
        return m.reply('*— ¿Estás bien de la cabeza?* No puedes robarte a ti mismo.')
    }

    // 3. BUSCAR LA WAIFU (Lógica Inteligente)
    const chatUsers = db.chats[chatId]?.users || {}
    let charIndex = -1
    let foundChar = null
    let targetName = args.join(' ').toLowerCase().trim()

    // CASO A: Tenemos Víctima (Reply/Mención)
    if (victimId) {
        const victimData = chatUsers[victimId]
        if (!victimData || !victimData.characters || victimData.characters.length === 0) {
             return m.reply(`*— Qué decepción.* @${victimId.split('@')[0]} no tiene personajes para robar.`)
        }

        if (targetName) {
            // A.1: Robar Específico a la Víctima
            charIndex = victimData.characters.findIndex(c => c.name.toLowerCase().includes(targetName))
            if (charIndex === -1) {
                return m.reply(`*— ¿Eh?* Esa persona no tiene a **${args.join(' ')}**. Revisa bien.`)
            }
        } else {
            // A.2: Robar ALEATORIO a la Víctima (Si no pones nombre)
            charIndex = Math.floor(Math.random() * victimData.characters.length)
        }
        
        foundChar = victimData.characters[charIndex]

    } else {
        // CASO B: Búsqueda Global (Sin Reply, busca en todos)
        if (!targetName) {
             return client.sendMessage(m.chat, { 
                text: `*— Instrucciones:* \nRespondé a alguien para robarle al azar, o escribe *#robarwaifu Nombre* para buscarla en el grupo.`,
                contextInfo 
            }, { quoted: m })
        }

        // Buscar quién tiene la waifu
        for (const [userId, userData] of Object.entries(chatUsers)) {
            if (userId === thiefId) continue 
            if (!userData.characters) continue

            const index = userData.characters.findIndex(c => c.name.toLowerCase() === targetName)
            if (index !== -1) {
                victimId = userId
                charIndex = index
                foundChar = userData.characters[index]
                break 
            }
        }

        if (!foundChar) {
             return m.reply(`*— ¿Eh?* Nadie en este grupo tiene a **${args.join(' ')}**.`)
        }
    }

    // 4. Verificar Protección
    if (foundChar.protectionUntil && foundChar.protectionUntil > now) {
        return client.sendMessage(m.chat, { 
            text: `*— Tsk, olvídalo.* **${foundChar.name}** tiene un escudo activo. No pienso pelear contra eso.`,
            contextInfo 
        }, { quoted: m })
    }

    // 5. Verificar Salud
    userGlobal.health = userGlobal.health ?? 100
    userGlobal.exp = userGlobal.exp ?? 0
    
    if (userGlobal.health < HEALTH_REQUIRED) {
        return client.sendMessage(m.chat, { 
            text: `*— Estás hecho un desastre.* Tienes **${userGlobal.health} HP** y necesitas **${HEALTH_REQUIRED} HP**. Ve a curarte.`,
            contextInfo 
        }, { quoted: m })
    }

    // 6. LÓGICA DE PROBABILIDAD (Mecánica de Riesgo)
    let successChance = 10 
    const thiefLevel = userGlobal.level || 1
    const victimGlobal = db.users[victimId] || { level: 1 }
    
    // Diferencia de nivel afecta probabilidad
    const levelDiff = thiefLevel - (victimGlobal.level || 1)
    successChance += (levelDiff * 2) 
    
    // Límites (Mínimo 2%, Máximo 25%)
    successChance = Math.max(2, Math.min(25, successChance))

    const isSuccessful = Math.random() * 100 < successChance
    
    // Aplicar Cooldown y Actualizar Stats
    userGlobal.lastSteal = now
    const victimName = db.users[victimId]?.name || victimId.split('@')[0]

    if (isSuccessful) {
        // --- ÉXITO ---
        // 1. Quitar de víctima
        db.chats[chatId].users[victimId].characters.splice(charIndex, 1)
        
        // 2. Dar a ladrón
        if (!db.chats[chatId].users[thiefId]) db.chats[chatId].users[thiefId] = { characters: [] }
        if (!db.chats[chatId].users[thiefId].characters) db.chats[chatId].users[thiefId].characters = []
        
        delete foundChar.protectionUntil
        foundChar.obtainedAt = now
        db.chats[chatId].users[thiefId].characters.push(foundChar)

        const successMsg = `🐉 **𝐎𝐏𝐄𝐑𝐀𝐂𝐈𝐎́𝐍 𝐄𝐗𝐈𝐓𝐎𝐒𝐀** (◕ᴗ◕✿)\n\n*— Trabajo hecho.* Le quité a **${foundChar.name}** a @${victimId.split('@')[0]}.\nAhora te pertenece.\n\n❀ **Probabilidad:** ${successChance.toFixed(1)}%\n❀ **Salud:** ${userGlobal.health} HP`

        contextInfo.mentionedJid.push(victimId)
        await client.sendMessage(m.chat, { text: successMsg, contextInfo, mentions: [thiefId, victimId] }, { quoted: m })

    } else {
        // --- FRACASO ---
        userGlobal.health = Math.max(0, userGlobal.health - HEALTH_LOSS_ON_FAIL)
        const xpLost = Math.floor(userGlobal.exp * XP_LOSS_PERCENT)
        userGlobal.exp = Math.max(0, userGlobal.exp - xpLost)

        const failMsg = `🐲 **¡𝐀𝐔𝐂𝐇! 𝐍𝐎𝐒 𝐏𝐈𝐋𝐋𝐀𝐑𝐎𝐍...** (╥﹏╥)\n\n*— ${victimName} se defendió.* Tuve que retirarme.\n\n❀ **Salud:** -${HEALTH_LOSS_ON_FAIL} HP (Te queda: ${userGlobal.health})\n❀ **Experiencia:** -${xpLost} XP`
        
        await client.sendMessage(m.chat, { text: failMsg, contextInfo }, { quoted: m })
    }
  }
}
