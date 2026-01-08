import fetch from 'node-fetch'

export default {
  // Agregué variaciones para asegurar que responda
  command: ['ia', 'chatgpt', 'lucoa', 'gpt'],
  category: 'ia',

  run: async ({ client, m, usedPrefix, command, text }) => {
    
    // Configuración de Personalidad
    const username = m.pushName || 'Humano'
    const basePrompt = `
    Personaje: Lucoa-Bot (Quetzalcoatl).
    Personalidad: Diosa dragona, hermana mayor, despreocupada, coqueta "Ara ara", amable.
    Creador: MatheoDark.
    Contexto: Estás hablando por WhatsApp con ${username}.
    Instrucción: Responde en español, sé breve y divertida. No uses lenguaje técnico.
    `.trim();

    try {
        // --- MODO TEXTO (Chat) ---
        if (!text) return m.reply(`🍟 *¡Hola! Soy Lucoa.*\n\nCuéntame algo o pregúntame lo que quieras.\n\n*Ejemplo:* ${usedPrefix + command} ¿Cómo estás hoy?`)

        await client.sendMessage(m.chat, { react: { text: '💭', key: m.key } })

        // 🟢 NUEVA API (Más estable)
        // Inyectamos la personalidad directamente en el prompt para asegurar que funcione
        const fullPrompt = `${basePrompt}\n\nUsuario dice: ${text}`;
        const apiUrl = `https://api.eliasar-yt.com/api/ai/gpt4o?text=${encodeURIComponent(fullPrompt)}`
        
        const res = await fetch(apiUrl)
        const json = await res.json()

        if (!json.status || !json.results) throw new Error('API sin respuesta')

        await client.sendMessage(m.chat, { 
            text: json.results + `\n\n> 🐲 Powered by MatheoDark` 
        }, { quoted: m })

    } catch (error) {
        console.error('Error en IA:', error)
        // Si falla la primera, intentamos una API de respaldo (Backup)
        try {
            const backupUrl = `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(basePrompt)}`
            const resBackup = await fetch(backupUrl)
            const jsonBackup = await resBackup.json()
            
            await client.sendMessage(m.chat, { 
                text: jsonBackup.response + `\n\n> 🐲 Powered by MatheoDark` 
            }, { quoted: m })
            
        } catch (e2) {
            m.reply('😵 *Ugh...* Mis neuronas fallaron. La API está caída, intenta en un rato.')
        }
    }
  }
}
