import fetch from 'node-fetch'

// 🧠 LÓGICA DE PENSAMIENTO CENTRALIZADA
async function pensarComoLucoa(text, username, m, client) {
    // Definición del sistema (Personalidad)
    // Puedes editar esto para cambiar qué tan coqueta o divertida es
    const system = `Instrucciones: Actúa como Lucoa (Quetzalcoatl) de Kobayashi-san Chi no Maid Dragon.
Personalidad: Ara ara~, coqueta, relajada, diosa dragona, hermana mayor cariñosa, despreocupada.
Usuario: ${username}.
Idioma: Español.
Regla: Respuestas cortas (máximo 2 oraciones), divertidas y coquetas. Usa emojis.`

    try {
        // 1. Reacción inmediata para que sepa que leíste
        await client.sendMessage(m.chat, { react: { text: '🐲', key: m.key } })

        // 2. Construcción del Prompt y Petición
        const promptCompleto = `${system}\n\nUsuario dice: ${text}\n\nLucoa responde:`
        const url = `https://text.pollinations.ai/${encodeURIComponent(promptCompleto)}?model=openai`
        
        const res = await fetch(url)
        
        // Validación básica
        if (!res.ok) throw new Error(`API Error: ${res.status}`)

        const respuestaTexto = await res.text()

        // 3. Verificación de errores de la API (Cloudflare, Bad Gateway, etc.)
        if (!respuestaTexto || respuestaTexto.includes('Bad Gateway') || respuestaTexto.includes('cloudflared') || respuestaTexto.length < 2) {
            throw new Error("Respuesta inválida de la IA")
        }

        // 4. Enviamos la respuesta con estilo
        await client.sendMessage(m.chat, { 
            text: respuestaTexto.trim(),
            contextInfo: {
                externalAdReply: {
                    title: "🐲 Lucoa-Bot AI",
                    body: "Ara ara~",
                    thumbnailUrl: "https://i.pinimg.com/736x/c8/ee/2b/c8ee2b24019e072b226503ba67b9319b.jpg", // Link directo a imagen de Lucoa
                    sourceUrl: "https://github.com/MatheoDark",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })

    } catch (e) {
        console.error("Error en Lucoa Brain:", e)
        
        // 5. RESPUESTA DE EMERGENCIA (Fallback)
        // Si la IA falla, usamos frases predefinidas para no romper la inmersión.
        const frasesError = [
            "Ara ara~ Me duele un poco la cabeza, ¿me lo repites cariño?",
            "¡Ups! Me distraje pensando en Shouta-kun. ¿Qué decías?",
            "Zzz... (Lucoa se quedó dormida, inténtalo de nuevo)",
            "Parece que mis poderes de diosa están recargándose... espera un momento."
        ]
        const fraseRandom = frasesError[Math.floor(Math.random() * frasesError.length)]
        
        await client.sendMessage(m.chat, { text: fraseRandom }, { quoted: m })
    }
}

export default {
    // Definimos los comandos que activan al bot manualmente
    command: ['ia', 'chatgpt', 'lucoa', 'gpt', 'ai'],
    category: 'ia',

    // --- EJECUCIÓN POR COMANDO (Ej: #lucoa hola) ---
    run: async ({ client, m, text, args, command }) => {
        // Aseguramos que chat exista en la DB
        if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
        const chat = global.db.data.chats[m.chat]

        // Comandos de configuración
        if (args[0] === 'on') {
            chat.chatbot = true
            return m.reply('🐲 *Ara ara~ Auto-Lucoa activado.* Ahora responderé a quienes me respondan.')
        }
        if (args[0] === 'off') {
            chat.chatbot = false
            return m.reply('💤 *Auto-Lucoa desactivado.*')
        }

        // Si no hay texto, mostramos ayuda
        if (!text) return m.reply(`🐲 *Hola soy Lucoa-Bot* 🐲\n\n*Comandos:*\n• *${command} on* (Activar chat continuo)\n• *${command} off* (Desactivar)\n• *${command} <texto>* (Hablar directamente)\n\n_Ara ara~ dime algo interesante..._`)

        // Ejecutar lógica manual
        const username = m.pushName || 'Humano'
        await pensarComoLucoa(text, username, m, client)
    },

    // --- EJECUCIÓN AUTOMÁTICA (Auto-Respuesta) ---
    before: async (m, { client }) => {
        try {
            // Ignorar mensajes de sistema, vacíos o del propio bot
            if (m.isBaileys || !m.text) return false
            
            const chat = global.db.data.chats[m.chat] || {}
            
            // Solo actuar si el modo chatbot está ACTIVO
            if (!chat.chatbot) return false

            // Lógica para detectar si deben responder
            const botId = client.user?.jid || client.user?.id
            const botNumber = botId?.split('@')[0]
            const senderNumber = m.quoted?.sender?.split('@')[0] || ''
            
            // Condición: Es respuesta al bot O mencionan al bot
            const isReplyToBot = m.quoted && senderNumber === botNumber
            const isMentioned = m.text.includes(botNumber)

            // Filtro Anti-Comandos: Si empieza con . # / no es charla, es comando.
            if ((isReplyToBot || isMentioned) && !m.text.startsWith('.') && !m.text.startsWith('#') && !m.text.startsWith('/')) {
                
                const username = m.pushName || 'Humano'
                await pensarComoLucoa(m.text, username, m, client)
                
                // CRÍTICO: return true detiene el procesamiento. 
                // Esto evita que OTROS plugins de chatbot (como simsimi.js) respondan también.
                return true
            }

        } catch (e) {
            console.error(e)
        }
        return false
    }
}
