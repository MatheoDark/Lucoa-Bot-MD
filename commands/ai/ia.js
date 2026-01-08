import fetch from 'node-fetch'

export default {
  command: ['ia', 'chatgpt', 'lucoa', 'gpt'],
  category: 'ia',

  run: async ({ client, m, usedPrefix, command, text }) => {
    
    const username = m.pushName || 'Humano'
    const logic = `Eres Lucoa-Bot (Quetzalcoatl). Diosa dragona amable, coqueta ("Ara ara"). Tu creador es MatheoDark. Responde en español divertido a ${username}.`

    if (!text) return m.reply(`🍟 *¡Hola! Soy Lucoa.*\n\nCuéntame algo.\n*Ejemplo:* ${usedPrefix + command} Hola`)

    await client.sendMessage(m.chat, { react: { text: '💭', key: m.key } })

    try {
        // 🟢 API DE RESPALDO (Delirius GPT Web)
        // Esta API es muy simple y devuelve un JSON claro.
        const apiUrl = `https://delirius-api-oficial.vercel.app/api/ia/gptweb?text=${encodeURIComponent(text)}`
        
        const res = await fetch(apiUrl)
        const json = await res.json()

        // AQUÍ ESTÁ EL ARREGLO: Extraemos .gpt, si no existe probamos .result
        const respuestaTexto = json.gpt || json.result || json.data || "No tengo palabras..."

        await client.sendMessage(m.chat, { 
            text: respuestaTexto + `\n\n> 🐲 Powered by MatheoDark` 
        }, { quoted: m })

    } catch (error) {
        console.error(error)
        m.reply('😵 Mis servidores están echando humo. Intenta más tarde.')
    }
  }
}
