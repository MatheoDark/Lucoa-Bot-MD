import fetch from 'node-fetch';

export default {
  // Más nombres para el mismo comando
  command: ['iaimg', 'dalle', 'aiimage', 'genimg'],
  category: 'ia',

  run: async ({ client, m, text, command, usedPrefix }) => {
    // Mensaje de ayuda si no escriben nada
    if (!text) {
      return m.reply(
        `╭─── ⋆🐉⋆ ───\n` +
        `│ *Generador de Imágenes IA* (◕ᴗ◕✿)\n` +
        `├───────────────\n` +
        `│ ❀ *Uso:* \`${usedPrefix + command} descripción | resolución\`\n` +
        `│\n` +
        `│ ❀ *Ejemplos:*\n` +
        `│ • ${usedPrefix + command} un gato astronauta | 1\n` +
        `│ • ${usedPrefix + command} paisaje cyberpunk | 2\n` +
        `│\n` +
        `│ ❀ *Resoluciones:*\n` +
        `│ 1️⃣ = 1:1 (Cuadrado)\n` +
        `│ 2️⃣ = 16:9 (Horizontal/PC)\n` +
        `│ 3️⃣ = 9:16 (Vertical/Celular)\n` +
        `╰─── ⋆✨⋆ ───`
      )
    }

    // Separar el texto del número de resolución
    let [prompt, resInput] = text.split('|').map(v => v.trim())

    const ratios = {
      '1': '1:1',
      '2': '16:9',
      '3': '9:16'
    }

    let ratio
    // Si puso un número válido, úsalo. Si no, elige uno al azar.
    if (resInput && ratios[resInput]) {
      ratio = ratios[resInput]
    } else {
      const random = Object.values(ratios)
      ratio = random[Math.floor(Math.random() * random.length)]
    }

    await m.reply('🐲 *Imaginando tu pedido...* (◕ᴗ◕✿)')

    // Función para generar imagen con reintentos y fallback
    const generateImage = async (retries = 3) => {
      const dims = { '1:1': [1024, 1024], '16:9': [1280, 720], '9:16': [720, 1280] }
      const [w, h] = dims[ratio] || [1024, 1024]
      
      // ========== INTENTA CON POLLINATIONS ==========
      console.log('[iaimg] Intentando con Pollinations...')
      for (let i = 0; i < retries; i++) {
        try {
          const seed = Math.floor(Math.random() * 999999)
          const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`
          
          const res = await fetch(imageUrl, { timeout: 15000 })
          if (!res.ok) {
            if (i < retries - 1) {
              await new Promise(r => setTimeout(r, 2000 * (i + 1)))
              continue
            }
            throw new Error(`Pollinations: ${res.status}`)
          }
          
          const ct = res.headers.get('content-type') || ''
          if (!ct.includes('image')) throw new Error('Respuesta inválida')
          
          const buffer = Buffer.from(await res.arrayBuffer())
          if (buffer.length < 1000) throw new Error('Imagen vacía')
          
          console.log('[iaimg] ✅ Imagen generada con Pollinations')
          return buffer
        } catch (err) {
          console.log(`[iaimg] Intento ${i + 1}/${retries} falló: ${err.message}`)
          if (i === retries - 1) throw err
          await new Promise(r => setTimeout(r, 2000))
        }
      }
    }

    // Función fallback con Hugging Face
    const generateImageHF = async () => {
      console.log('[iaimg] Fallback: Intentando con Hugging Face...')
      
      // Usar model de Hugging Face más estable
      const hfUrl = `https://huggingface.co/models/search?other=text-to-image&pipeline_tag=text-to-image&sort=trending`
      
      // Alternativa: Usar inference API de Hugging Face con modelos estables
      try {
        const models = [
          'stabilityai/stable-diffusion-3-medium',
          'black-forest-labs/FLUX.1-dev',
          'stabilityai/stable-diffusion-2-1'
        ]
        
        // Para este fallback, devolvemos mensaje informativo
        // Ya que HF API necesita token
        console.log('[iaimg] ⚠️ Fallback no configurado (requiere API key)')
        throw new Error('Fallback no disponible sin clave API')
      } catch (err) {
        console.log('[iaimg] Fallback fallido:', err.message)
        throw err
      }
    }

    try {
      let buffer
      try {
        buffer = await generateImage(2)
      } catch (err) {
        console.log('[iaimg] Pollinations fallido, intentando fallback...')
        buffer = await generateImageHF()
      }
      
      await client.sendMessage(
        m.chat,
        {
          image: buffer,
          caption: 
            `🐉 *Imagen Generada* (✿❛◡❛)\n\n` +
            `❀ *Pedido:* ${prompt}\n` +
            `❀ *Ratio:* ${ratio}\n\n` +
            `${global.dev || "> 🐉 Powered by MatheoDark"}`
        },
        { quoted: m }
      )

    } catch (err) {
      console.error('[iaimg]', err.message)
      m.reply(
        '🐲 No se pudo generar la imagen. (╥﹏╥)\n\n' +
        '> *Razón:* Pollinations está experimentando problemas de servicio.\n' +
        '> Intenta más tarde o usa otro comando.'
      )
    }
  }
}
