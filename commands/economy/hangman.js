import { resolveLidToRealJid } from "../../lib/utils.js"

// --- CONFIGURACIÓN ---
const TIME_LIMIT = 5 * 60 * 1000; // 5 minutos por juego
const COOLDOWN = 10 * 60 * 1000;  // 10 minutos de espera
const PENALTY_EXP = 100;
const PENALTY_COINS = 200;
const REWARD_EXP = 500;
const REWARD_COINS = 1000;

// Asegurar objeto de juegos
global.games = global.games || {};

// --- FUNCIÓN BEFORE (Escucha las respuestas) ---
export async function before(m, { client }) {
  // Validaciones básicas
  if (!m.chat || !global.db.data.chats[m.chat] || !global.games[m.chat]) return;
  
  const game = global.games[m.chat];
  
  // Validar si es el mensaje correcto
  // 1. Debe ser una respuesta al mensaje del bot O el bot debe ser el admin del juego
  // 2. Solo el jugador que inició puede responder (según tu lógica original)
  if (!m.quoted || m.quoted.id !== game.messageId) return;
  
  // Resolver ID Real del jugador actual
  const senderId = await resolveLidToRealJid(m.sender, client, m.chat);
  
  // Si quieres que cualquiera pueda responder, quita esta línea:
  if (senderId !== game.player) return; 

  try {
    const guess = m.text.trim().toLowerCase();
    const word = game.word;
    
    // ECONOMÍA GLOBAL (CRÍTICO)
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const currency = settings.currency || 'Coins'

    let user = global.db.data.users[senderId];
    if (!user) {
        // Inicializar si no existe
        global.db.data.users[senderId] = { exp: 0, coins: 0, ahorcadoCooldown: 0 };
        user = global.db.data.users[senderId];
    }

    // Validar entrada
    if (!/^[a-zñ]+$/i.test(guess)) {
      return m.reply(`✧ Por favor, envía solo letras (sin números ni símbolos).`);
    }

    // --- CASO 1: ADIVINAR PALABRA COMPLETA ---
    if (guess.length > 1) {
      if (guess === word) {
        // GANAR
        user.exp = (user.exp || 0) + REWARD_EXP;
        user.coins = (user.coins || 0) + REWARD_COINS;
        user.ahorcadoCooldown = Date.now() + COOLDOWN;

        const info = `➪ *¡GANASTE!* 🎉\n\n> Palabra: *${word.toUpperCase()}*\n> Premio: *${REWARD_EXP} EXP* y *${REWARD_COINS} ${currency}*\n> Nuevo Saldo: ${user.coins} ${currency}\n\n⏳ Debes esperar *${msToTime(COOLDOWN)}* para jugar de nuevo.`;
        
        clearTimeout(game.timeout);
        delete global.games[m.chat];
        return await client.reply(m.chat, info, m);
      } else {
        // FALLAR PALABRA COMPLETA (Pierde un intento)
        game.attemptsLeft -= 1;
      }
    } 
    // --- CASO 2: ADIVINAR LETRA ---
    else {
      if (game.guessedLetters.has(guess)) {
        return m.reply(`✧ La letra *${guess.toUpperCase()}* ya fue usada.`);
      }

      game.guessedLetters.add(guess);
      let correct = false;

      // Revelar letra
      for (let i = 0; i < word.length; i++) {
        if (word[i] === guess) {
          game.hidden[i] = guess;
          correct = true;
        }
      }

      if (!correct) {
        game.attemptsLeft -= 1;
      }
    }

    // --- VERIFICAR ESTADO DEL JUEGO ---
    const hiddenWord = game.hidden.join(' ');
    
    // 1. ¿Ganó completando letras?
    if (game.hidden.join('') === word) {
        user.exp = (user.exp || 0) + REWARD_EXP;
        user.coins = (user.coins || 0) + REWARD_COINS;
        user.ahorcadoCooldown = Date.now() + COOLDOWN;

        const info = `➪ *¡GANASTE!* 🎉\n\n> Palabra: *${word.toUpperCase()}*\n> Premio: *${REWARD_EXP} EXP* y *${REWARD_COINS} ${currency}*\n> Nuevo Saldo: ${user.coins} ${currency}\n\n⏳ Debes esperar *${msToTime(COOLDOWN)}* para jugar de nuevo.`;
        
        clearTimeout(game.timeout);
        delete global.games[m.chat];
        return await client.reply(m.chat, info, m);
    }

    // 2. ¿Perdió por intentos?
    if (game.attemptsLeft <= 0) {
        user.exp = Math.max(0, (user.exp || 0) - PENALTY_EXP);
        user.coins = Math.max(0, (user.coins || 0) - PENALTY_COINS);
        user.ahorcadoCooldown = Date.now() + COOLDOWN;

        const info = `➪ *PERDISTE* 💀\n\n> Palabra: *${word.toUpperCase()}*\n> Castigo: -${PENALTY_EXP} EXP, -${PENALTY_COINS} ${currency}\n\n${hangmanArt[6]}\n\n⏳ Espera *${msToTime(COOLDOWN)}*.`;
        
        clearTimeout(game.timeout);
        delete global.games[m.chat];
        return await client.reply(m.chat, info, m);
    }

    // 3. Juego Continúa
    const usedLetters = Array.from(game.guessedLetters).join(', ').toUpperCase() || 'Ninguna';
    const info = `➪ *AHORCADO*\n\n> Palabra: ${hiddenWord.toUpperCase()}\n> Vidas: ${game.attemptsLeft}\n> Usadas: ${usedLetters}\n${hangmanArt[6 - game.attemptsLeft]}\n\n✧ Responde con una letra o la palabra completa.`;
    
    const sentMsg = await client.reply(m.chat, info, m);
    game.messageId = sentMsg.key.id; // Actualizamos ID para seguir el hilo

  } catch (e) {
    console.error('Error in hangman before:', e);
  }
}

// --- COMANDO PRINCIPAL (RUN) ---
const handler = {
  command: ['ahorcado', 'hangman'],
  category: 'game',
  run: async ({ client, m, args, usedPrefix }) => {
    const prefa = usedPrefix || '/'
    
    // Validaciones
    if (args[0] === 'cancel' && global.games[m.chat]) {
        clearTimeout(global.games[m.chat].timeout);
        delete global.games[m.chat];
        return m.reply('✧ Juego del ahorcado cancelado.');
    }

    if (global.db.data.chats[m.chat].adminonly) return m.reply(`❒ Solo admins.`);
    if (!global.db.data.chats[m.chat].rpg) return m.reply(`❒ Economía pausada.`);

    if (global.games[m.chat]) {
      return m.reply(`✧ Ya hay un juego activo. Termínalo o escribe *${prefa}ahorcado cancel*.`);
    }

    // Resolver Usuario y Cooldown (Global)
    const userId = await resolveLidToRealJid(m.sender, client, m.chat);
    let user = global.db.data.users[userId];

    if (!user) {
        global.db.data.users[userId] = { exp: 0, coins: 0, ahorcadoCooldown: 0 };
        user = global.db.data.users[userId];
    }

    if (!user.ahorcadoCooldown) user.ahorcadoCooldown = 0;
    const remainingTime = user.ahorcadoCooldown - Date.now();
    
    if (remainingTime > 0) {
      return m.reply(`✿ Debes esperar *${msToTime(remainingTime)}* para jugar de nuevo.`);
    }

    // Iniciar Juego
    const word = words[Math.floor(Math.random() * words.length)];
    const maxAttempts = 6;

    global.games[m.chat] = {
      word: word,
      hidden: Array(word.length).fill('_'),
      attemptsLeft: maxAttempts,
      guessedLetters: new Set(),
      messageId: null,
      player: userId, // Guardamos ID real
      timeout: null
    };

    // Pista inicial (1 letra revelada al azar)
    const randomIndex = Math.floor(Math.random() * word.length);
    const revealedLetter = word[randomIndex];
    for (let i = 0; i < word.length; i++) {
        if (word[i] === revealedLetter) global.games[m.chat].hidden[i] = revealedLetter;
    }
    global.games[m.chat].guessedLetters.add(revealedLetter);

    // Timeout de 5 minutos
    global.games[m.chat].timeout = setTimeout(() => {
        if (global.games[m.chat]) {
            const w = global.games[m.chat].word;
            client.reply(m.chat, `✧ ¡Tiempo agotado! La palabra era: *${w.toUpperCase()}*`, m);
            delete global.games[m.chat];
        }
    }, TIME_LIMIT);

    // Mensaje Inicial
    const hiddenWord = global.games[m.chat].hidden.join(' ');
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[botId] || {}
    const currency = settings.currency || 'Coins'

    const info = `➪ *JUEGO DEL AHORCADO* 💀\n\n> Palabra: ${hiddenWord.toUpperCase()}\n> Vidas: ${maxAttempts}\n> Pista: ${revealedLetter.toUpperCase()}\n${hangmanArt[0]}\n\n✧ Tienes 5 minutos. Gana *${REWARD_COINS} ${currency}*.\n✧ Responde a este mensaje con una letra.`;

    const sentMsg = await client.reply(m.chat, info, m);
    global.games[m.chat].messageId = sentMsg.key.id;
  }
}

// --- RECURSOS ---
function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60);
  return `${minutes}m ${seconds}s`;
}

const words = [
  'estrella', 'ventana', 'puerta', 'computadora', 'televisor', 'desenlace', 'animacion', 
  'instruccion', 'contraseña', 'bicampeonato', 'melancolia', 'desconocido', 'interrogante', 
  'subterraneo', 'tratamiento', 'plan', 'hielo', 'helado', 'reencarnacion', 'resultado', 
  'caricatura', 'desintegrado', 'graduacion', 'rechazo', 'murmullo', 'escalofrio', 'condor',
  'universidad', 'biblioteca', 'montaña', 'telefono', 'elefante', 'hipopotamo', 'murcielago', 
  'arquitectura', 'electricidad', 'fotografia', 'aguacate', 'contenedor', 'tenedor', 
  'circunferencia', 'inverosimil', 'yacimiento', 'jengibre', 'bumeran', 'metafisica', 
  'jugabilidad', 'olvidar', 'hentai', 'maltrato', 'alquimia', 'silueta', 'tridente',
  'bicicleta', 'sombrero', 'paraguas', 'manzana', 'naranja', 'linterna', 'brujula', 
  'teclado', 'mochila', 'espejo', 'martillo', 'pincel', 'reloj', 'museo', 'aeropuerto', 
  'teatro', 'catedral', 'prision', 'torre', 'alegria', 'tristeza', 'sorpresa', 'excitacion', 
  'enojo', 'calma', 'ansiedad', 'degenerada', 'inodoro', 'nintendo', 'twitter', 'quimera', 
  'cosmico', 'castillo', 'jirafa', 'serpiente', 'tortuga', 'chocolate', 'youtube', 'cama', 
  'diccionario', 'kilometro', 'valquiria', 'negro', 'barcelona', 'singapur', 'vasectomia', 
  'relampago', 'oreja', 'vocero', 'washington', 'anomalia', 'japon', 'mondongo', 'volcan', 
  'arrecife', 'lechuza', 'cangrejo', 'cactus', 'pinguino', 'delfin', 'laberinto', 'pantano',
  'galaxia', 'cometa', 'ballena', 'tiburon', 'hospital', 'mercado', 'megumin', 'diamond'
];

const hangmanArt = [
  `
   ------
   |    |
        |
        |
        |
        |
  =========`,
  `
   ------
   |    |
   O    |
        |
        |
        |
  =========`,
  `
   ------
   |    |
   O    |
   |    |
        |
        |
  =========`,
  `
   ------
   |    |
   O    |
  /|    |
        |
        |
  =========`,
  `
   ------
   |    |
   O    |
  /|\\   |
        |
        |
  =========`,
  `
   ------
   |    |
   O    |
  /|\\   |
  /     |
        |
  =========`,
  `
   ------
   |    |
   O    |
  /|\\   |
  / \\   |
        |
  ========= GAME OVER`
];

export default handler;
