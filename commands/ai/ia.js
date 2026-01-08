import fetch from 'node-fetch'

export default {
  command: ['ia', 'chatgpt', 'lucoa', 'gpt'],
  category: 'ia',

  run: async ({ client, m, usedPrefix, command, text }) => {
    
    const username = m.pushName || 'Humano'
    
    // Personalidad de Lucoa
    const logic = `Instrucciones: Eres Lucoa-Bot (Quetzalcoatl). Una diosa dragona amable, despreocupada y coqueta ("Ara ara"). Tu creador es MatheoDark. Responde en español de forma divertida y breve, usa emojis. Estás hablando con ${username}.`

    if (!text) return m.reply(`🍟 *¡Hola! Soy Lucoa.*\n\nCuéntame algo.\n*Ejemplo:* ${usedPrefix + command} Hola`)

    await client.sendMessage(m.chat, { react: { text: '💭', key: m.key } })

    // 📋 LISTA DE APIS (Si una falla, prueba la siguiente)
    const apis = [
        {
            nombre: "Siputzx (Llama 3)",
            getUrl: (q, p) => `https://api.siputzx.my.id/api/ai/llama3?prompt=${encodeURIComponent(p)}&text=${encodeURIComponent(q)}`,
            path: (json) => json.data // Dónde está la respuesta en el JSON
        },
        {
            nombre: "Delirius (GPT-4)",
            getUrl: (q, p) => `https://delirius-api-oficial.vercel.app/api/ia/gpt4?text=${encodeURIComponent(p + "\nUsuario: " + q)}`,
            path: (json) => json.data
        },
        {
            nombre: "Dark-Yasiya (GPT-3.5)",
            getUrl: (q, p) => `https://www.dark-yasiya-api.site/ai/chatgpt?text=${encodeURIComponent(p + "\nUsuario: " + q)}`,
            path: (json) => json.result
        }
    ]

    let respuesta = null;

    // 🔄 BUCLE DE INTENTOS
    for (let i = 0; i < apis.length; i++) {
        const api = apis[i];
        try {
            const url = api.getUrl(text, logic);
            const res = await fetch(url);
            
            // Verificamos si la respuesta es válida antes de parsear
            if (!res.ok) throw new Error(`Status ${res.status}`);
            
            const json = await res.json();
            const resultado = api.path(json);

            if (resultado) {
                respuesta = resultado;
                break; // ¡Éxito! Salimos del bucle
            }
        } catch (e) {
            console.log(`❌ Falló API ${api.nombre}: ${e.message}`);
            // Continuamos a la siguiente API...
        }
    }

    // ENVIAR RESULTADO O ERROR FINAL
    if (respuesta) {
        await client.sendMessage(m.chat, { 
            text: respuesta + `\n\n> 🐲 Powered by MatheoDark` 
        }, { quoted: m });
    } else {
        await client.sendMessage(m.chat, { 
            text: '😵 *Ugh...* Me duele la cabeza. Todas mis conexiones neuronales fallaron hoy. Intenta más tarde.' 
        }, { quoted: m });
    }
  }
}
