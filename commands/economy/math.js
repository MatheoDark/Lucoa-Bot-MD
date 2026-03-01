import { resolveLidToRealJid } from '../../lib/utils.js';

// Aseguramos que el objeto global exista
global.math = global.math || {};

const limits = {
  facil: 10,
  medio: 50,
  dificil: 90,
  imposible: 100,
  imposible2: 200
};

// Generador seguro sin 'eval'
const generarProblema = (dificultad) => {
  const maxLimit = limits[dificultad] || 30;
  const num1 = Math.floor(Math.random() * maxLimit) + 1;
  const num2 = Math.floor(Math.random() * maxLimit) + 1;
  
  // Lista de operaciones
  const ops = ['+', '-', '*', '/'];
  const operador = ops[Math.floor(Math.random() * ops.length)];

  let resultado = 0;
  let simbolo = operador;

  switch (operador) {
      case '+': resultado = num1 + num2; break;
      case '-': resultado = num1 - num2; break;
      case '*': resultado = num1 * num2; simbolo = '×'; break;
      case '/': 
          // Para división, aseguramos que sea exacta o fácil de leer
          resultado = (num1 / num2);
          simbolo = '÷';
          // Si tiene decimales, lo fijamos a 2, si es entero se queda igual
          if (!Number.isInteger(resultado)) resultado = parseFloat(resultado.toFixed(2));
          break;
  }

  return {
    problema: `${num1} ${simbolo} ${num2}`,
    resultado: resultado
  };
};

async function run({ client, m, args, command, usedPrefix }) {
  const chatId = m.chat;

  // ✅ NUEVO: Helper para limpiar juego correctamente
  const cleanupGame = (cId) => {
    const game = global.math[cId]
    if (game?.tiempoLimite) {
      clearTimeout(game.tiempoLimite)
    }
    delete global.math[cId]
  }
  const chatData = global.db.data.chats[chatId] || {};
  
  // Validaciones de grupo
  if (m.isGroup && (chatData.adminonly || !chatData.rpg)) {
       // Solo respondemos si está intentando iniciar juego, no si responde mensajes
       if (command === 'math' || command === 'matematicas') {
           return m.reply('🐉 Los juegos están dormidos en este grupo zzZ')
       }
       return;
  }

  // --- LÓGICA DE RESPONDER (El usuario responde al mensaje del bot) ---
  // Detectamos si el usuario citó un mensaje y si hay juego activo
  const juego = global.math[chatId];
  const quotedMsg = m.quoted ? m.quoted : null;

  // Si hay juego activo y el usuario citó el mensaje del problema (o usó el comando responder)
  if (juego && juego.juegoActivo && (command === 'responder' || (quotedMsg && quotedMsg.id === juego.problemMessageId))) {
    
    // Obtenemos la respuesta: o del comando "responder 50" o del texto del mensaje citado
    let respuestaUsuario = '';
    if (command === 'responder') {
        respuestaUsuario = args[0];
    } else {
        // Si solo respondió el mensaje, tomamos el texto de su mensaje
        respuestaUsuario = args.join(' '); 
    }

    if (!respuestaUsuario) return; // Si no escribió nada, ignoramos

    // Resolvemos Usuario (ID Real) para dar EXP
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    let user = global.db.data.users[userId];
    if (!user) {
         global.db.data.users[userId] = { exp: 0 };
         user = global.db.data.users[userId];
    }

    // Normalizamos respuesta (quitamos espacios y convertimos a número)
    const respNum = parseFloat(respuestaUsuario.trim());
    const respCorrecta = parseFloat(juego.respuesta);

    // Verificamos (con un pequeño margen de error por si acaso hay decimales raros)
    if (Math.abs(respNum - respCorrecta) < 0.01) {
        
        // --- GANADOR ---
        const expGanada = Math.floor(Math.random() * 50) + 20; // 20 a 70 EXP
        user.exp = (user.exp || 0) + expGanada;

        cleanupGame(chatId)

        return client.sendMessage(chatId, { 
            text: `╭─── ⋆🐉⋆ ───\n│ ✅ *¡CORRECTO!*\n├───────────────\n│ 🧠 Respuesta: *${juego.respuesta}*\n│ ✨ Ganaste: *${expGanada} EXP*\n╰─── ⋆✨⋆ ───`,
            mentions: [userId]
        }, { quoted: m });

    } else {
        // --- ERROR ---
        juego.intentos += 1;
        const intentosMax = 3;
        
        if (juego.intentos >= intentosMax) {
            cleanupGame(chatId)
            return m.reply(`🐲 Incorrecto, sin intentos (╥﹏╥)\n│ La respuesta era: *${juego.respuesta}*`);
        } else {
            return m.reply(`🐲 Incorrecto, intenta de nuevo (◕︿◕)\n│ Intentos: ${juego.intentos}/${intentosMax}`);
        }
    }
  }

  // --- LÓGICA DE INICIAR JUEGO (math) ---
  if (command === 'math' || command === 'matematicas') {
    if (juego?.juegoActivo) {
        return m.reply('🐲 Ya hay un juego activo, responde ese primero (◕ᴗ◕)');
    }

    const dificultad = args[0]?.toLowerCase();
    const dificultadesValidas = Object.keys(limits); // ['facil', 'medio', ...]

    if (!dificultad || !dificultadValidas.includes(dificultad)) {
      return m.reply(`🐲 Elige una dificultad (◕ᴗ◕✿)\n│\n│ *${dificultadesValidas.join(', ')}*\n│\n│ Ejemplo: *${usedPrefix}math medio*`);
    }

    const { problema, resultado } = generarProblema(dificultad);

    // Enviamos el mensaje y guardamos su ID
    const txt = `╭─── ⋆🐉⋆ ───\n│ 🧠 *CÁLCULO MENTAL* (${dificultad})\n├───────────────\n│ Resuelve: *${problema}*\n│\n│ ⏳ Tienes 60s\n│ Responde con el resultado\n╰─── ⋆✨⋆ ───`;
    
    const problemMessage = await client.sendMessage(chatId, { text: txt }, { quoted: m });

    global.math[chatId] = {
      juegoActivo: true,
      problema,
      respuesta: resultado.toString(),
      intentos: 0,
      problemMessageId: problemMessage.key.id, // Guardamos ID para detectar respuestas
      tiempoLimite: setTimeout(() => {
        if (global.math[chatId]?.juegoActivo) {
          client.sendMessage(chatId, { text: `🐲 ¡Tiempo agotado! La respuesta era: *${resultado}* (╥﹏╥)` })
          cleanupGame(chatId)
        }
      }, 60000)
    };
  }
}

export default {
  command: ['math', 'matematicas', 'responder'],
  category: 'rpg',
  run
};
