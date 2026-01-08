import fetch from 'node-fetch'

export default {
  command: ['ia', 'chatgpt', 'lucoa', 'gpt'],
  category: 'ia',

  run: async ({ client, m, usedPrefix, command, text }) => {
    
    const username = m.pushName || 'Humano'
    // Personalidad compacta para que la API la entienda mejor
    const systemPrompt = `Actúa como Lucoa-Bot (Quetzalcoatl). Eres una diosa dragona amable y coqueta ("Ara ara"). Tu creador es MatheoDark. Responde en español de forma divertida a ${username}.`

    try {
        if (!text) return m.reply(`🍟 *¡Hola! Soy Lucoa.*\n\nCuéntame algo.\n*Ejemplo:* ${usedPrefix + command} Hola`)

        await client.sendMessage(m.chat, { react: { text: '💭', key: m.key } })

        // 🟢 API DE RESPALDO (Skizo/Siputzx) - Muy fiable para chat
        // Usamos Llama 3 que es muy buena siguiendo roles
        const apiUrl = `https://api.siputzx.my.id/api/ai/llama3?prompt=${encodeURIComponent(systemPrompt)}&text=${encodeURIComponent(text)}`
        
        const res = await fetch(apiUrl)
        const json = await res.json()

        if (!json.status || !json.data) throw new Error('API sin datos')

        await client.sendMessage(m.chat, { 
            text: json.data + `\n\n> 🐲 Powered by MatheoDark` 
        }, { quoted: m })

    } catch (error) {
        console.error('Error en IA:', error)
        // Backup final: API simple de GPT
        try {
            const backupUrl = `https://delirius-api-oficial.vercel.app/api/ia/gptweb?text=${encodeURIComponent(text)}`
            const res2 = await fetch(backupUrl)
            const json2 = await res2.json()
            
            await client.sendMessage(m.chat, { 
                text: json2.gpt + `\n\n> 🐲 Powered by MatheoDark` 
            }, { quoted: m })
        } catch (e2) {
             m.reply('😵 Mis servidores están echando humo. Intenta más tarde.')
        }
    }
  }
}
