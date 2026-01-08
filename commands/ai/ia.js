import fetch from 'node-fetch'

export default {
  command: ['ia', 'chatgpt', 'lucoa', 'gpt'],
  category: 'ia',

  run: async ({ client, m, usedPrefix, command, text }) => {
    
    const username = m.pushName || 'Humano'
    // Personalidad
    const logic = `Eres Lucoa-Bot (Quetzalcoatl). Una diosa dragona amable, despreocupada y coqueta ("Ara ara"). Tu creador es MatheoDark. Responde en español de forma divertida y breve. Estás hablando con ${username}.`

    if (!text) return m.reply(`🍟 *¡Hola! Soy Lucoa.*\n\nCuéntame algo.\n*Ejemplo:* ${usedPrefix + command} Hola`)

    await client.sendMessage(m.chat, { react: { text: '💭', key: m.key } })

    try {
        // 🟢 API PRIMARIA: RyzenDesu (ChatGPT)
        // Esta API acepta 'prompt' separado del 'text', ideal para roles.
        const apiUrl = `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(logic)}`
        
        const res = await fetch(apiUrl)
        const json = await res.json()

        // Ryzen devuelve { response: "..." }
        if (!json.response) throw new Error('API sin respuesta válida')

        await client.sendMessage(m.chat, { 
            text: json.response + `\n\n> 🐲 Powered by MatheoDark` 
        }, { quoted: m })

    } catch (error) {
        console.error(error)
        // 🟡 API SECUNDARIA: Siputzx (Llama 3)
        try {
            const backupUrl = `https://api.siputzx.my.id/api/ai/llama3?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(logic)}`
            const res2 = await fetch(backupUrl)
            const json2 = await res2.json()

            if (!json2.data) throw new Error('Backup falló')

            await client.sendMessage(m.chat, { 
                text: json2.data + `\n\n> 🐲 Powered by MatheoDark` 
            }, { quoted: m })

        } catch (e2) {
             m.reply('😵 Estoy un poco mareada hoy. Intenta más tarde.')
        }
    }
  }
}
