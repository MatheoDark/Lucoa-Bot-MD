import fetch from 'node-fetch'
// import 'dotenv/config' // Descomenta esta línea si te da error de que no encuentra la key

// 🔐 SEGURIDAD:
// Ahora la clave se lee desde el archivo .env del sistema.
// Si alguien ve este código en GitHub, no verá tu clave.
const GOOGLE_API_KEY = process.env.GEMINI_API_KEY

export default {
  command: ['ia', 'chatgpt', 'lucoa', 'gpt'],
  category: 'ia',

  run: async ({ client, m, usedPrefix, command, text }) => {

    // Verificación de seguridad
    if (!GOOGLE_API_KEY) {
        return m.reply('⚠️ *Error:* No se encontró la `GEMINI_API_KEY` en el archivo `.env`.')
    }

    const username = m.pushName || 'Humano'
    
    // 🧠 PERSONALIDAD DE LUCOA
    const systemInstruction = `
    Instrucciones de Sistema: 
    Actúa como Lucoa-Bot (Quetzalcoatl). Eres una ex-diosa dragona, hermana mayor, amable, despreocupada y coqueta (dices "Ara ara" a veces).
    Tu creador es MatheoDark.
    Responde en español de forma divertida, expresiva y usa emojis.
    Mantén las respuestas concisas.
    Usuario actual: ${username}.
    `.trim()

    if (!text) return m.reply(`🍟 *¡Hola! Soy Lucoa.*\n\nCuéntame algo.\n*Ejemplo:* ${usedPrefix + command} Hola`)

    await client.sendMessage(m.chat, { react: { text: '🐲', key: m.key } })

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: systemInstruction + "\n\nUsuario dice: " + text }]
                }],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 800
                }
            })
        })

        if (!response.ok) throw new Error(`Error Google: ${response.status}`)

        const json = await response.json()
        const respuesta = json.candidates?.[0]?.content?.parts?.[0]?.text

        if (!respuesta) throw new Error('Google no devolvió texto.')

        await client.sendMessage(m.chat, { 
            text: respuesta.trim() + `\n\n> 🐲 Powered by MatheoDark` 
        }, { quoted: m })

    } catch (error) {
        console.error("Error Gemini:", error)
        m.reply('🔥 *Ugh...* Algo salió mal. Revisa tu consola.')
    }
  }
}
