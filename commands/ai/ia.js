import fetch from 'node-fetch'

// 🧠 LÓGICA ÚNICA (Pollinations)
async function pensarComoLucoa(text, username, m, client) {
    
    // Personalidad
    const system = `Actúa como Lucoa-Bot (Quetzalcoatl). Eres una diosa dragona amable, despreocupada y coqueta ("Ara ara"). Tu creador es MatheoDark. Responde en español de forma divertida y breve. Usuario: ${username}.`

    await client.sendMessage(m.chat, { react: { text: '🐲', key: m.key } })

    try {
        const promptCompleto = `${system}\n\nUsuario: ${text}`
        // Usamos Pollinations directamente como pediste
        const url = `https://text.pollinations.ai/${encodeURIComponent(promptCompleto)}?model=openai`
        
        const res = await fetch(url)
        const respuestaTexto = await res.text()

        if (!respuestaTexto || respuestaTexto.length < 1) throw new Error("Sin respuesta")

        await client.sendMessage(m.chat, { 
            text: respuestaTexto.trim() + `\n\n> 🐲 Powered by MatheoDark` 
        }, { quoted: m })

    } catch (e) {
        console.error("Error en IA Pollinations:", e)
        m.reply('😵 Me dio un mareo... (Error de API)')
    }
}

export default {
  command: ['ia', 'chatgpt', 'lucoa', 'gpt'],
  category: 'ia',

  // 1️⃣ COMANDO MANUAL (#lucoa hola / #lucoa on)
  run: async ({ client, m, text, args, command }) => {
    
    // Obtenemos los datos del chat para guardar la configuración
    const chat = global.db.data.chats[m.chat] || {}

    // --- MODO CONFIGURACIÓN (ON/OFF) ---
    if (args[0] === 'on') {
        chat.chatbot = true
        return m.reply('✅ *Auto-Lucoa ACTIVADO en este chat.*\nAhora responderé si respondes a mis mensajes.')
    }
    
    if (args[0] === 'off') {
        chat.chatbot = false
        return m.reply('❌ *Auto-Lucoa DESACTIVADO.*\nSolo responderé si usas el comando.')
    }

    // --- MODO CONVERSACIÓN ---
    if (!text) return m.reply(`🍟 *Hola soy Lucoa.*\n\nComandos:\n• *#${command} on* (Activar auto-respuesta)\n• *#${command} off* (Desactivar)\n• *#${command} hola* (Hablar)`)
    
    const username = m.pushName || 'Humano'
    await pensarComoLucoa(text, username, m, client)
  },

  // 2️⃣ MODO AUTOMÁTICO (Respuesta al responder)
  before: async (m, { client }) => {
    try {
        // Si el mensaje no es texto o es del propio bot, ignoramos
        if (m.isBaileys || !m.text) return false

        // 🔒 VERIFICACIÓN DE ACTIVACIÓN
        // Si el chat no tiene el modo 'chatbot' activado, ignoramos
        const chat = global.db.data.chats[m.chat] || {}
        if (!chat.chatbot) return false

        // VERIFICACIÓN DE RESPUESTA
        const botNumber = client.user.jid || client.user.id
        const isReplyToBot = m.quoted && m.quoted.sender.includes(botNumber.split('@')[0])

        // Si es respuesta al bot Y no es un comando
        if (isReplyToBot && !m.text.startsWith('.') && !m.text.startsWith('#') && !m.text.startsWith('/')) {
            const username = m.pushName || 'Humano'
            await pensarComoLucoa(m.text, username, m, client)
            return true
        }
    } catch (e) {
        console.error(e)
    }
    return false
  }
}
