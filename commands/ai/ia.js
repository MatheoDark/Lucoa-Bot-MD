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
        
        // 1. VERIFICAMOS EL ESTADO DE LA PÁGINA
        if (res.status !== 200) throw new Error(`API Caída (Status: ${res.status})`)

        const respuestaTexto = await res.text()

        // 2. VERIFICAMOS QUE NO SEA UN ERROR DE CLOUDFLARE (El 502 que te salió)
        if (!respuestaTexto || respuestaTexto.includes('Bad Gateway') || respuestaTexto.includes('cloudflared')) {
            throw new Error("API devolvió error 502")
        }

        // Si todo está bien, enviamos la respuesta
        await client.sendMessage(m.chat, { 
            text: respuestaTexto.trim() + `\n\n> 🐲 Powered by MatheoDark` 
        }, { quoted: m })

    } catch (e) {
        console.error("Error en IA:", e.message)
        
        // 3. RESPUESTA DE EMERGENCIA (Si la IA está muerta)
        // En vez de mandar el error 502, Lucoa dirá algo coherente.
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
        if (m.isBaileys || !m.text) return false

        const chat = global.db.data.chats[m.chat] || {}
        if (!chat.chatbot) return false

        // Validación segura del ID del bot
        const botId = client.user?.jid || client.user?.id
        if (!botId) return false

        const botNumber = botId.split('@')[0]
        const senderNumber = m.quoted?.sender?.split('@')[0] || ''

        const isReplyToBot = m.quoted && senderNumber === botNumber

        if (isReplyToBot && !m.text.startsWith('.') && !m.text.startsWith('#') && !m.text.startsWith('/')) {
            const username = m.pushName || 'Humano'
            await pensarComoLucoa(m.text, username, m, client)
            return true
        }
    } catch (e) {}
    return false
  }
}
