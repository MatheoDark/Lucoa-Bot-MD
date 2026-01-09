import fetch from 'node-fetch'

// 🧠 LÓGICA DE PENSAMIENTO
async function pensarComoLucoa(text, username, m, client) {
    const system = `Actúa como Lucoa-Bot (Quetzalcoatl). Eres una diosa dragona amable, despreocupada y coqueta ("Ara ara"). Tu creador es MatheoDark. Responde en español de forma divertida y breve. Usuario: ${username}.`

    // Reacción inicial
    await client.sendMessage(m.chat, { react: { text: '🐲', key: m.key } })

    try {
        const promptCompleto = `${system}\n\nUsuario: ${text}`
        const url = `https://text.pollinations.ai/${encodeURIComponent(promptCompleto)}?model=openai`
        
        const res = await fetch(url)
        const respuestaTexto = await res.text()

        // 🛡️ FILTRO ANTI-ERRORES (Para que no publique el JSON feo)
        if (respuestaTexto.includes('"error"') || respuestaTexto.includes('Queue full') || res.status !== 200) {
            throw new Error("API Saturada o Error")
        }

        // Si todo está bien, enviamos la respuesta
        await client.sendMessage(m.chat, { 
            text: respuestaTexto.trim() + `\n\n> 🐲 Powered by MatheoDark` 
        }, { quoted: m })

    } catch (e) {
        console.error("Error en IA:", e.message)
        
        // 3. RESPUESTA DE EMERGENCIA SILENCIOSA
        // Si falla, mandamos una frase random, PERO solo si no fue un bucle reciente.
        const frasesError = [
            "Ara ara~ Me duele un poco la cabeza, inténtalo más tarde.",
            "Zzz... Estoy tomando una siesta, despiértame luego.",
            "¡El mundo de los dragones está desconectado! (Error de servidor)",
            "No te escuché bien, ¿puedes repetirlo en un rato?"
        ]
        const fraseRandom = frasesError[Math.floor(Math.random() * frasesError.length)]
        
        await client.sendMessage(m.chat, { text: fraseRandom }, { quoted: m })
    }
}

export default {
  command: ['ia', 'chatgpt', 'lucoa', 'gpt'],
  category: 'ia',

  run: async ({ client, m, text, args, command }) => {
    // Asegurar que exista el objeto del chat
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
    const chat = global.db.data.chats[m.chat]

    if (args[0] === 'on') {
        chat.chatbot = true
        return m.reply('✅ *Auto-Lucoa ACTIVADO.*')
    }
    if (args[0] === 'off') {
        chat.chatbot = false
        return m.reply('❌ *Auto-Lucoa DESACTIVADO.*')
    }

    if (!text) return m.reply(`🍟 *Hola soy Lucoa.*\n\nComandos:\n• *#${command} on* (Activar)\n• *#${command} off* (Desactivar)\n• *#${command} hola* (Hablar)`)
    
    const username = m.pushName || 'Humano'
    await pensarComoLucoa(text, username, m, client)
  },

  before: async (m, { client }) => {
    try {
        // 🛑 ANTI-BUCLE SUPREMO (CRÍTICO) 🛑
        // 1. Si el mensaje es del propio bot, IGNORAR.
        if (m.key.fromMe) return false
        
        // 2. Si no es texto o es mensaje de sistema, IGNORAR.
        if (m.isBaileys || !m.text) return false

        // 3. Si el mensaje empieza con un comando (., #, /), IGNORAR (dejar que lo maneje el handler de comandos).
        if (/^[.!#\/]/.test(m.text)) return false

        const chat = global.db.data.chats[m.chat] || {}
        if (!chat.chatbot) return false

        // Validación segura del ID del bot
        const botId = client.user?.jid || client.user?.id
        const botNumber = botId.split('@')[0]
        const senderNumber = m.quoted?.sender?.split('@')[0] || ''

        // Condición: Es respuesta al bot
        const isReplyToBot = m.quoted && senderNumber === botNumber

        if (isReplyToBot) {
            const username = m.pushName || 'Humano'
            await pensarComoLucoa(m.text, username, m, client)
            return true // 🛑 ESTO EVITA QUE OTROS HANDLERS SE ACTIVEN
        }
    } catch (e) {
        console.error(e)
    }
    return false
  }
}
