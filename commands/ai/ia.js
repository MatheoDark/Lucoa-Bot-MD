import fetch from 'node-fetch'

export default {
  command: ['ia', 'chatgpt', 'lucoa', 'gpt'],
  category: 'ia',

  run: async ({ client, m, usedPrefix, command, text }) => {
    
    const username = m.pushName || 'Humano'
    
    // Personalidad fusionada en el texto
    // Al mezclar la instrucción con el mensaje, cualquier IA entenderá el rol.
    const logic = `Instrucciones de sistema: Actúa como "Lucoa-Bot" (Quetzalcoatl). Eres una diosa dragona amable, despreocupada y coqueta ("Ara ara"). Tu creador es MatheoDark. Responde en español de forma divertida y breve, usa emojis. Estás hablando con ${username}.
    
    Mensaje del usuario: ${text}`

    if (!text) return m.reply(`🍟 *¡Hola! Soy Lucoa.*\n\nCuéntame algo.\n*Ejemplo:* ${usedPrefix + command} Hola`)

    await client.sendMessage(m.chat, { react: { text: '💭', key: m.key } })

    try {
        // 🟢 INTENTO 1: Hercai API (Muy estable)
        // Usamos encodeURIComponent para evitar errores con caracteres raros
        const apiUrl = `https://hercai.onrender.com/v3/hercai?question=${encodeURIComponent(logic)}`
        
        const res = await fetch(apiUrl)
        const json = await res.json()

        // Hercai devuelve { reply: "..." }
        if (!json.reply) throw new Error('Hercai sin respuesta')

        await client.sendMessage(m.chat, { 
            text: json.reply + `\n\n> 🐲 Powered by MatheoDark` 
        }, { quoted: m })

    } catch (error) {
        console.error("Fallo Hercai, intentando Backup...")
        
        // 🟡 INTENTO 2: Blackbox (Backup de emergencia)
        try {
            const backupUrl = `https://api.eliasar-yt.com/api/ai/blackbox?text=${encodeURIComponent(logic)}`
            const res2 = await fetch(backupUrl)
            const json2 = await res2.json()

            // A veces devuelve .result, a veces .response
            const respuesta = json2.result || json2.response || "Estoy algo cansada hoy... inténtalo luego."

            await client.sendMessage(m.chat, { 
                text: respuesta + `\n\n> 🐲 Powered by MatheoDark` 
            }, { quoted: m })

        } catch (e2) {
             m.reply('😵 Mis servidores están dormidos. Intenta en 5 minutos.')
        }
    }
  }
}
