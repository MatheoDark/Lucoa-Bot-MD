import fetch from 'node-fetch'

export default {
  command: ['ia', 'chatgpt', 'lucoa', 'gpt'],
  category: 'ia',

  run: async ({ client, m, usedPrefix, command, text }) => {
    
    const username = m.pushName || 'Humano'
    
    // Personalidad (Se envía junto al texto para asegurar que la IA la lea)
    const logic = `Instrucciones: Eres Lucoa-Bot (Quetzalcoatl). Una diosa dragona amable, despreocupada y coqueta ("Ara ara"). Tu creador es MatheoDark. Responde en español de forma divertida y breve. Estás hablando con ${username}.`

    if (!text) return m.reply(`🍟 *¡Hola! Soy Lucoa.*\n\nCuéntame algo.\n*Ejemplo:* ${usedPrefix + command} Hola`)

    await client.sendMessage(m.chat, { react: { text: '💭', key: m.key } })

    try {
        // 🟢 API PRIMARIA: Gurusensei (Llama 3 - Cloudflare)
        // Esta API es extremadamente rápida y estable.
        const query = `${logic}\n\nUsuario dice: ${text}`
        const apiUrl = `https://api.gurusensei.workers.dev/llama?prompt=${encodeURIComponent(query)}`
        
        const res = await fetch(apiUrl)
        const json = await res.json()

        // Gurusensei devuelve { response: "..." }
        if (!json.response) throw new Error('API 1 sin respuesta')

        await client.sendMessage(m.chat, { 
            text: json.response + `\n\n> 🐲 Powered by MatheoDark` 
        }, { quoted: m })

    } catch (error) {
        console.log("Fallo API 1, intentando Backup...")
        
        // 🟡 API SECUNDARIA: Delirius (GPTWeb - Vercel)
        try {
            const queryBackup = `${logic}\n\nPregunta: ${text}`
            const backupUrl = `https://delirius-api-oficial.vercel.app/api/ia/gptweb?text=${encodeURIComponent(queryBackup)}`
            
            const res2 = await fetch(backupUrl)
            const json2 = await res2.json()

            // Delirius devuelve { gpt: "..." }
            const respuesta = json2.gpt || "Ugh, me duele la cabeza... inténtalo luego."

            await client.sendMessage(m.chat, { 
                text: respuesta + `\n\n> 🐲 Powered by MatheoDark` 
            }, { quoted: m })

        } catch (e2) {
             console.error(e2)
             m.reply('😵 Mis conexiones divinas están fallando. Intenta más tarde.')
        }
    }
  }
}
