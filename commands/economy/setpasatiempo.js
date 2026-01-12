import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['setpasatiempo', 'sethobby'],
  category: 'profile',
  run: async ({ client, m, args, usedPrefix }) => {
    const prefa = usedPrefix || '/'
    
    // Resolver usuario
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    const user = global.db.data.users[userId]

    if (!user) return m.reply('❌ Usuario no registrado.')

    const input = args.join(' ').trim()

    const hobbies = [
      '📚 Leer', '✍️ Escribir', '🎤 Cantar', '💃 Bailar', '🎮 Jugar', 
      '🎨 Dibujar', '🍳 Cocinar', '✈️ Viajar', '🏊 Nadar', '📸 Fotografía',
      '🎧 Escuchar música', '🏀 Deportes', '🎬 Ver películas', '🌿 Jardinería',
      '🧵 Manualidades', '🎲 Juegos de mesa', '🏋️‍♂️ Gimnasio', '🚴 Ciclismo',
      '🎯 Tiro con arco', '🍵 Ceremonia del té', '🧘‍♂️ Meditación', '🎪 Malabares',
      '🛠️ Bricolaje', '🎹 Tocar instrumentos', '🐶 Cuidar mascotas', '🌌 Astronomía',
      '♟️ Ajedrez', '🍷 Catación de vinos', '🛍️ Compras', '🏕️ Acampar',
      '🎣 Pescar', '📱 Tecnología', '🎭 Teatro', '🍽️ Gastronomía', '🏺 Coleccionar',
      '✂️ Costura', '🧁 Repostería', '📝 Blogging', '🚗 Automóviles', '🧩 Rompecabezas',
      '🎳 Bolos', '🏄 Surf', '⛷️ Esquí', '🎿 Snowboard', '🤿 Buceo', '🏹 Tiro al blanco',
      '🧭 Orientación', '🏇 Equitación', '🎨 Pintura', '📊 Invertir', '🌡️ Meteorología',
      '🔍 Investigar', '💄 Maquillaje', '💇‍♂️ Peluquería', '🛌 Dormir', '🍺 Cervecería',
      '🪓 Carpintería', '🧪 Experimentos', '📻 Radioafición', '🗺️ Geografía', '💎 Joyería', 
      'Otro 🌟'
    ]

    // Si no hay input, mostrar lista
    if (!input) {
      let lista = '🎯 *Elige un pasatiempo:*\n\n'
      hobbies.forEach((h, i) => lista += `${i + 1}) ${h}\n`)
      lista += `\n*Uso:*\n${prefa}sethobby 1\n${prefa}sethobby Leer`
      return m.reply(lista)
    }

    let selected = ''

    // Opción A: Número
    if (/^\d+$/.test(input)) {
      const index = parseInt(input) - 1
      if (index >= 0 && index < hobbies.length) selected = hobbies[index]
      else return m.reply(`《✧》 Número inválido. (1-${hobbies.length})`)
    } 
    // Opción B: Texto
    else {
      const cleanInput = input.replace(/[^\w\s]/g, '').toLowerCase().trim()
      selected = hobbies.find(h => h.replace(/[^\w\s]/g, '').toLowerCase().includes(cleanInput))
      if (!selected) return m.reply('《✧》 Pasatiempo no encontrado en la lista.')
    }

    user.pasatiempo = selected
    return m.reply(`✎ Pasatiempo actualizado a:\n> *${user.pasatiempo}*`)
  },
};
