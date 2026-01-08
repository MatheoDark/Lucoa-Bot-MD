import axios from 'axios'
import fetch from 'node-fetch'

export default {
  // ✅ 'megumin' eliminado
  command: ['ia', 'chatgpt', 'lucoa'],
  category: 'ia',

  run: async ({ client, m, usedPrefix, command, text }) => {
    
    const isQuotedImage = m.quoted && (m.quoted.msg || m.quoted).mimetype && (m.quoted.msg || m.quoted).mimetype.startsWith('image/')
    const isImage = (m.mimetype && m.mimetype.startsWith('image/')) || isQuotedImage

    const username = m.pushName || 'Humano'
    const basePrompt = `
    Instrucciones: Eres Lucoa-Bot (Quetzalcoatl), una ex-diosa dragona amable, despreocupada y con actitud de "Ara ara".
    Tu creador es MatheoDark.
    Responde siempre en español, de forma coqueta pero tierna, usando emojis.
    Si te preguntan quién eres, di que eres Lucoa, la dragona de MatheoDark.
    No uses lenguaje técnico, sé casual y divertida.
    Usuario actual: ${username}.
    `.trim();

    try {
        // --- MODO VISIÓN (Imagen) ---
        if (isImage) {
            await m.reply('👀 *A ver, déjame ver esa imagen...* (Analizando)')
            
            const q = m.quoted ? m.quoted : m
            const imgBuffer = await q.download()
            if (!imgBuffer) return m.reply('❌ No pude descargar la imagen.')

            const content = text || '¿Qué ves en esta imagen? Descríbela al estilo Lucoa.'
            const imgBase64 = Buffer.from(imgBuffer).toString('base64')

            const response = await axios.post('https://api.siputzx.my.id/api/ai/gemini-vision', {
                prompt: basePrompt + " " + content,
                image: imgBase64
            }).catch(e => null)

            if (!response || !response.data) {
                 return m.reply('❌ No pude analizar la imagen en este momento, cariño.')
            }

            const txt = response.data.data || response.data.result || response.data.message
            
            await client.sendMessage(m.chat, { 
                text: `✨ *ANÁLISIS DE LUCOA* ✨\n\n${txt}\n\n> 🐲 Powered by MatheoDark` 
            }, { quoted: m })

        } 
        
        // --- MODO TEXTO (Chat) ---
        else {
            if (!text) return m.reply(`🍟 *¡Hola! Soy Lucoa.*\n\nDime algo para charlar o pregúntame lo que quieras.\n\n*Ejemplo:* ${usedPrefix + command} ¿Qué te gusta comer?`)

            await client.sendMessage(m.chat, { react: { text: '💭', key: m.key } })

            const apiUrl = 'https://delirius-api-oficial.vercel.app/api/ia/gpt4'
            
            const res = await axios.get(apiUrl, {
                params: {
                    text: text,
                    system: basePrompt
                }
            })

            const respuesta = res.data.data || res.data.result

            if (!respuesta) throw new Error('Sin respuesta de API')

            await client.sendMessage(m.chat, { 
                text: respuesta + `\n\n> 🐲 Powered by MatheoDark` 
            }, { quoted: m })
        }

    } catch (error) {
        console.error('Error en IA:', error)
        m.reply('😵 *Ugh...* Me mareé un poco (Error de API). Inténtalo de nuevo, cariño.')
    }
  }
}
