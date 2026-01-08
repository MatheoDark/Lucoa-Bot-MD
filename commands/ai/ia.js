import fetch from 'node-fetch'
import 'dotenv/config'

const GOOGLE_API_KEY = process.env.GEMINI_API_KEY

// 🧠 CEREBRO DE LUCOA (Lógica compartida)
// Esta función se usa tanto para el comando como para las respuestas automáticas
async function pensarComoLucoa(text, username, m, client) {
    
    // Personalidad
    const system = `Actúa como Lucoa-Bot (Quetzalcoatl). Eres una diosa dragona amable, despreocupada y coqueta ("Ara ara"). Tu creador es MatheoDark. Responde en español de forma divertida y breve. Usuario: ${username}.`

    await client.sendMessage(m.chat, { react: { text: '🐲', key: m.key } })

    // 🛡️ INTENTO 1: Google Gemini
    try {
        if (!GOOGLE_API_KEY) throw new Error("Sin Key")
        
        const models = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"]
        let googleResponse = null

        for (const model of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`
                const req = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: system + "\n\nUsuario: " + text }] }] })
                })
                if (!req.ok) continue
                const json = await req.json()
                const txt = json.candidates?.[0]?.content?.parts?.[0]?.text
                if (txt) { googleResponse = txt; break }
            } catch (e) {}
        }

        if (googleResponse) {
            return await client.sendMessage(m.chat, { text: googleResponse.trim() + `\n\n> 🐲 Powered by MatheoDark` }, { quoted: m })
        }
        throw new Error("Google falló")

    } catch (e) {
        console.log("⚠️ Falló Google, activando Pollinations...")
        
        // 🛡️ INTENTO 2: Pollinations AI (Texto Inmortal)
        try {
            const promptCompleto = `${system}\n\nPregunta del usuario: ${text}`
            const url = `https://text.pollinations.ai/${encodeURIComponent(promptCompleto)}?model=openai`
            const res = await fetch(url)
            const respuestaTexto = await res.text()

            if (!respuestaTexto || respuestaTexto.length < 2) throw new Error("Sin respuesta")

            await client.sendMessage(m.chat, { 
                text: respuestaTexto.trim() + `\n\n> 🐲 Powered by MatheoDark` 
            }, { quoted: m })

        } catch (e2) {
            console.error(e2)
        }
    }
}

export default {
  command: ['ia', 'chatgpt', 'lucoa', 'gpt'],
  category: 'ia',

  // 1️⃣ MODO NORMAL (Con comando #lucoa)
  run: async ({ client, m, text }) => {
    if (!text) return m.reply(`🍟 *¡Hola! Soy Lucoa.*\n\nDime algo.`)
    const username = m.pushName || 'Humano'
    await pensarComoLucoa(text, username, m, client)
  },

  // 2️⃣ MODO AUTOMÁTICO (Sin prefijo)
  // Esta función 'before' se ejecuta en CADA mensaje que llega
  before: async (m, { client }) => {
    try {
        // Si el mensaje no es de texto o es del propio bot, ignoramos
        if (m.isBaileys || !m.text) return false

        // VERIFICACIÓN CLAVE: ¿Es una respuesta a un mensaje del Bot?
        // m.quoted = el mensaje al que respondiste
        // m.quoted.sender = quién envió ese mensaje
        // client.user.jid = el número del bot
        const botNumber = client.user.jid || client.user.id
        const isReplyToBot = m.quoted && m.quoted.sender.includes(botNumber.split('@')[0])

        // Si es una respuesta al bot Y NO empieza con comando (para evitar doble respuesta)
        if (isReplyToBot && !m.text.startsWith('.') && !m.text.startsWith('#')) {
            const username = m.pushName || 'Humano'
            
            // Llamamos a la misma lógica de IA
            await pensarComoLucoa(m.text, username, m, client)
            
            return true // Retornamos true para indicar que ya manejamos el mensaje
        }
    } catch (e) {
        console.error(e)
    }
    return false // Si no era respuesta al bot, dejamos pasar el mensaje
  }
}
