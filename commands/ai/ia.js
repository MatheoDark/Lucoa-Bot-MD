import fetch from 'node-fetch'

export default {
  command: ['ia', 'chatgpt', 'lucoa', 'gpt'],
  category: 'ia',

  run: async ({ client, m, usedPrefix, command, text }) => {
    
    const username = m.pushName || 'Humano'
    
    // 1. Definimos la personalidad
    const logic = `Instrucciones: Eres Lucoa-Bot (Quetzalcoatl). Eres una diosa dragona amable, despreocupada y coqueta ("Ara ara"). Tu creador es MatheoDark. Responde en español de forma divertida y breve. Estás hablando con ${username}.`

    if (!text) return m.reply(`🍟 *¡Hola! Soy Lucoa.*\n\nCuéntame algo.\n*Ejemplo:* ${usedPrefix + command} Hola`)

    await client.sendMessage(m.chat, { react: { text: '💭', key: m.key } })

    try {
        // 🟢 API PRIMARIA: Dark-Yasiya (GPT-4)
        // Fusionamos la lógica + el texto del usuario en una sola petición
        const query = `${logic}\n\nUsuario dice: ${text}`
        const apiUrl = `https://www.dark-yasiya-api.site/ai/chatgpt?text=${encodeURIComponent(query)}`
        
        const res = await fetch(apiUrl)
        const json = await res.json()

        if (!json.result) throw new Error('API 1 Falló')

        await client.sendMessage(m.chat, { 
            text: json.result + `\n\n> 🐲 Powered by MatheoDark` 
        }, { quoted: m })

    } catch (error) {
        // 🟡 API SECUNDARIA: Vyturex (Backup)
        try {
            const queryBackup = `${logic}\n\nUsuario dice: ${text}`
            const backupUrl = `https://api.vyturex.com/v1/ai/gpt4?content=${encodeURIComponent(queryBackup)}`
            const res2 = await fetch(backupUrl)
            const json2 = await res2.json() // Vyturex a veces devuelve texto plano o json

            const respuesta = json2.result || json2.data || "Error en backup"

            await client.sendMessage(m.chat, { 
                text: respuesta + `\n\n> 🐲 Powered by MatheoDark` 
            }, { quoted: m })

        } catch (e2) {
             console.error(e2)
             m.reply('😵 Mis servidores están echando humo. Intenta más tarde.')
        }
    }
  }
}
