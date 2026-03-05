import { resolveLidToRealJid } from '../../lib/utils.js'
import { updateMissionProgress } from './missions.js'

// ═══════════════════════════════════════════
//  🧠 TRIVIA ANIME — Responde preguntas de anime
// ═══════════════════════════════════════════

const COOLDOWN = 2 * 60 * 1000 // 2 minutos
const STREAK_BONUS = 0.12 // +12% por racha
const MAX_STREAK = 8

// Dificultad: fácil / medio / difícil / experto
const DIFICULTAD = {
  facil:   { time: 30000, coinsMin: 5000,  coinsMax: 12000,  expMin: 300,  expMax: 800,   emoji: '🟢', label: 'Fácil' },
  medio:   { time: 25000, coinsMin: 10000, coinsMax: 25000,  expMin: 600,  expMax: 1500,  emoji: '🟡', label: 'Medio' },
  dificil: { time: 20000, coinsMin: 18000, coinsMax: 40000,  expMin: 1000, expMax: 2500,  emoji: '🔴', label: 'Difícil' },
  experto: { time: 15000, coinsMin: 30000, coinsMax: 65000,  expMin: 2000, expMax: 5000,  emoji: '🟣', label: 'Experto' },
}

global.triviaGames = global.triviaGames || {}

// ═══════════════════════════════════════════
//  BANCO DE PREGUNTAS (120+)
// ═══════════════════════════════════════════

const PREGUNTAS = [
  // ── DEMON SLAYER ──
  { q: '¿Cuál es el nombre de la respiración que usa Tanjiro al inicio?', opts: ['Respiración del Agua', 'Respiración del Sol', 'Respiración del Trueno', 'Respiración del Viento'], a: 0, serie: 'Demon Slayer', d: 'facil' },
  { q: '¿Quién mató a la familia de Tanjiro?', opts: ['Akaza', 'Muzan Kibutsuji', 'Kokushibo', 'Doma'], a: 1, serie: 'Demon Slayer', d: 'facil' },
  { q: '¿Cuál es la forma especial de Zenitsu?', opts: ['Trueno de Dios', 'Primer Estilo: Rayo', 'Relámpago Durmiente', 'Golpe Veloz'], a: 1, serie: 'Demon Slayer', d: 'medio' },
  { q: '¿De qué color es el pelo de Mitsuri Kanroji?', opts: ['Rojo', 'Rosa y verde', 'Morado', 'Dorado'], a: 1, serie: 'Demon Slayer', d: 'facil' },
  { q: '¿Cuál es el rango de Tanjiro al final del entrenamiento?', opts: ['Kanoe', 'Kinoe', 'Mizunoto', 'Hinoto'], a: 0, serie: 'Demon Slayer', d: 'dificil' },
  { q: '¿Quién es la Luna Superior 3?', opts: ['Doma', 'Kokushibo', 'Akaza', 'Hantengu'], a: 2, serie: 'Demon Slayer', d: 'medio' },
  { q: '¿Cuántas formas tiene la Respiración del Agua?', opts: ['8', '10', '11', '12'], a: 2, serie: 'Demon Slayer', d: 'dificil' },
  { q: '¿Quién creó la primera Respiración?', opts: ['Tanjiro', 'Yoriichi Tsugikuni', 'Muzan', 'Kokushibo'], a: 1, serie: 'Demon Slayer', d: 'experto' },

  // ── ATTACK ON TITAN ──
  { q: '¿Cuántos metros mide el Titán Colosal?', opts: ['30 metros', '60 metros', '50 metros', '100 metros'], a: 1, serie: 'Attack on Titan', d: 'facil' },
  { q: '¿Cuál es el nombre verdadero de la isla donde vive Eren?', opts: ['Marley', 'Paradis', 'Eldia', 'Hizuru'], a: 1, serie: 'Attack on Titan', d: 'medio' },
  { q: '¿Quién es el Titán Acorazado?', opts: ['Bertholdt', 'Reiner', 'Zeke', 'Porco'], a: 1, serie: 'Attack on Titan', d: 'facil' },
  { q: '¿Cuál es el clan de Levi y Mikasa?', opts: ['Reiss', 'Fritz', 'Ackerman', 'Yeager'], a: 2, serie: 'Attack on Titan', d: 'facil' },
  { q: '¿Cuántos Titanes Cambiantes existen en total?', opts: ['7', '8', '9', '10'], a: 2, serie: 'Attack on Titan', d: 'medio' },
  { q: '¿Quién es el Titán Bestia?', opts: ['Eren', 'Zeke Yeager', 'Grisha', 'Falco'], a: 1, serie: 'Attack on Titan', d: 'facil' },
  { q: '¿Cuál era el plan de Eren con el Retumbar?', opts: ['Destruir Marley', 'Aplastar el mundo entero', 'Liberar a Ymir', 'Destruir los muros'], a: 1, serie: 'Attack on Titan', d: 'medio' },
  { q: '¿Cuántos años dura la maldición de Ymir?', opts: ['10 años', '13 años', '15 años', '20 años'], a: 1, serie: 'Attack on Titan', d: 'dificil' },

  // ── DEATH NOTE ──
  { q: '¿Cuántos segundos tiene Light para escribir un nombre después de ver la cara?', opts: ['No tiene límite de tiempo', '40 segundos', '23 días después muere', 'Debe ser inmediato'], a: 0, serie: 'Death Note', d: 'dificil' },
  { q: '¿Cuál es el nombre real de L?', opts: ['L Lawliet', 'Ryuzaki', 'Hideki Ryuga', 'Eraldo Coil'], a: 0, serie: 'Death Note', d: 'medio' },
  { q: '¿Qué shinigami le da el Death Note a Light?', opts: ['Rem', 'Ryuk', 'Sidoh', 'Gelus'], a: 1, serie: 'Death Note', d: 'facil' },
  { q: '¿Cuál es la fruta favorita de Ryuk?', opts: ['Uvas', 'Fresas', 'Manzanas', 'Peras'], a: 2, serie: 'Death Note', d: 'facil' },
  { q: '¿Quién sucede a L como detective?', opts: ['Mello y Near', 'Matsuda', 'Aizawa', 'Watari'], a: 0, serie: 'Death Note', d: 'medio' },
  { q: '¿Cuántos Death Notes caen al mundo humano en la historia?', opts: ['1', '2', '3', '4'], a: 1, serie: 'Death Note', d: 'experto' },

  // ── NARUTO ──
  { q: '¿Cuál es el jutsu insignia de Naruto?', opts: ['Rasengan', 'Kage Bunshin no Jutsu', 'Chidori', 'Sage Mode'], a: 1, serie: 'Naruto', d: 'facil' },
  { q: '¿Quién fue el maestro de Jiraiya?', opts: ['Hashirama', 'Tobirama', 'Hiruzen Sarutobi', 'Minato'], a: 2, serie: 'Naruto', d: 'medio' },
  { q: '¿Cuál es el nombre del hermano de Sasuke?', opts: ['Obito', 'Shisui', 'Itachi', 'Madara'], a: 2, serie: 'Naruto', d: 'facil' },
  { q: '¿Qué bijuu está sellado dentro de Naruto?', opts: ['Shukaku', 'Matatabi', 'Kurama', 'Gyuki'], a: 2, serie: 'Naruto', d: 'facil' },
  { q: '¿Quién fue el primer Hokage?', opts: ['Tobirama Senju', 'Hashirama Senju', 'Hiruzen Sarutobi', 'Minato Namikaze'], a: 1, serie: 'Naruto', d: 'facil' },
  { q: '¿Cuál es el verdadero objetivo de Itachi al masacrar su clan?', opts: ['Odio', 'Proteger a Konoha y Sasuke', 'Poder', 'Órdenes de Madara'], a: 1, serie: 'Naruto', d: 'medio' },
  { q: '¿Quién fue el líder original de Akatsuki?', opts: ['Pain', 'Obito', 'Yahiko', 'Madara'], a: 2, serie: 'Naruto', d: 'dificil' },
  { q: '¿Cuál es el ojo de Sasuke que desbloquea el Amaterasu?', opts: ['Izquierdo', 'Derecho', 'Ambos', 'Ninguno, es del Mangekyo'], a: 0, serie: 'Naruto', d: 'experto' },

  // ── ONE PIECE ──
  { q: '¿Cuál es la primera fruta del diablo que se ve en One Piece?', opts: ['Gomu Gomu no Mi', 'Bara Bara no Mi', 'Mera Mera no Mi', 'Hana Hana no Mi'], a: 0, serie: 'One Piece', d: 'facil' },
  { q: '¿Cuántos miembros tiene la tripulación de Luffy (Mugiwara)?', opts: ['9', '10', '11', '8'], a: 1, serie: 'One Piece', d: 'facil' },
  { q: '¿Quién es el espadachín de los Sombreros de Paja?', opts: ['Sanji', 'Brook', 'Zoro', 'Jinbe'], a: 2, serie: 'One Piece', d: 'facil' },
  { q: '¿Cuál es la recompensa de Luffy después de Wano?', opts: ['1.5 billones', '3 billones', '5 billones', '4 billones'], a: 1, serie: 'One Piece', d: 'medio' },
  { q: '¿Quién le dio el sombrero de paja a Luffy?', opts: ['Gold Roger', 'Shanks', 'Rayleigh', 'Garp'], a: 1, serie: 'One Piece', d: 'facil' },
  { q: '¿Cuántos Yonkou hay al mismo tiempo?', opts: ['3', '4', '5', '6'], a: 1, serie: 'One Piece', d: 'medio' },
  { q: '¿Cuál es el verdadero nombre de la Gomu Gomu no Mi?', opts: ['Hito Hito no Mi: Modelo Nika', 'Gomu Gomu no Mi: Despertar', 'Mochi Mochi no Mi', 'Sube Sube no Mi'], a: 0, serie: 'One Piece', d: 'dificil' },
  { q: '¿Quién es Joy Boy?', opts: ['Roger', 'Luffy', 'Zunesha', 'Un antiguo rey del Siglo Vacío'], a: 3, serie: 'One Piece', d: 'experto' },

  // ── DRAGON BALL ──
  { q: '¿Cuántas esferas del dragón hay en la Tierra?', opts: ['5', '6', '7', '8'], a: 2, serie: 'Dragon Ball', d: 'facil' },
  { q: '¿Cuál es el nivel de poder de Goku cuando llega a Namek?', opts: ['9000', '90000', '5000', '180000'], a: 1, serie: 'Dragon Ball', d: 'dificil' },
  { q: '¿Cuál fue la primera transformación de Goku en Super Saiyan?', opts: ['Contra Cell', 'Contra Freezer', 'Contra Vegeta', 'Contra Majin Buu'], a: 1, serie: 'Dragon Ball', d: 'facil' },
  { q: '¿Cuál es el nombre del hijo mayor de Goku?', opts: ['Goten', 'Gohan', 'Trunks', 'Pan'], a: 1, serie: 'Dragon Ball', d: 'facil' },
  { q: '¿Quién creó a los Androides?', opts: ['Dr. Brief', 'Dr. Gero', 'Bulma', 'Dr. Myuu'], a: 1, serie: 'Dragon Ball', d: 'medio' },

  // ── MY HERO ACADEMIA ──
  { q: '¿Cómo se llama el quirk de Deku?', opts: ['Full Cowling', 'One For All', 'All For One', 'Detroit Smash'], a: 1, serie: 'My Hero Academia', d: 'facil' },
  { q: '¿Quién es el héroe #1 antes de retirarse?', opts: ['Endeavor', 'All Might', 'Hawks', 'Best Jeanist'], a: 1, serie: 'My Hero Academia', d: 'facil' },
  { q: '¿De qué tipo es la explosión de Bakugo?', opts: ['Fuego', 'Nitroglicerina (sudor)', 'Pólvora', 'Energía'], a: 1, serie: 'My Hero Academia', d: 'medio' },
  { q: '¿Cuál es el nombre real del villano Dabi?', opts: ['Tomura', 'Toya Todoroki', 'Himiko', 'Spinner'], a: 1, serie: 'My Hero Academia', d: 'dificil' },
  { q: '¿Cuántos usuarios de One For All hubo antes de Deku?', opts: ['7', '8', '9', '10'], a: 1, serie: 'My Hero Academia', d: 'experto' },

  // ── HUNTER x HUNTER ──
  { q: '¿Cuál es el apellido de Killua?', opts: ['Freecss', 'Zoldyck', 'Kurta', 'Paradinight'], a: 1, serie: 'Hunter x Hunter', d: 'facil' },
  { q: '¿Qué tipo de Nen usa Gon?', opts: ['Transmutación', 'Emisión', 'Potenciación', 'Conjuración'], a: 2, serie: 'Hunter x Hunter', d: 'medio' },
  { q: '¿Cuántos miembros tiene el Genei Ryodan?', opts: ['10', '12', '13', '15'], a: 2, serie: 'Hunter x Hunter', d: 'medio' },
  { q: '¿Cuál es el Nen de Killua?', opts: ['Potenciación', 'Transmutación', 'Emisión', 'Manipulación'], a: 1, serie: 'Hunter x Hunter', d: 'dificil' },
  { q: '¿Cuál es la restricción de Kurapika al usar Chain Jail?', opts: ['Solo funciona en el Genei Ryodan', 'Pierde la vista', 'Muere en 24h', 'No puede usar Nen'], a: 0, serie: 'Hunter x Hunter', d: 'experto' },

  // ── JUJUTSU KAISEN ──
  { q: '¿Cuál es la técnica de dominio de Gojo?', opts: ['Dominio Malevolente', 'Void Infinito', 'Expansión Ilimitada', 'Cielo Purpura'], a: 2, serie: 'Jujutsu Kaisen', d: 'medio' },
  { q: '¿Cuántos dedos de Sukuna hay en total?', opts: ['10', '15', '20', '25'], a: 2, serie: 'Jujutsu Kaisen', d: 'facil' },
  { q: '¿Quién es la mejor amiga de Nobara?', opts: ['Maki', 'Miwa', 'Saori', 'Mai'], a: 2, serie: 'Jujutsu Kaisen', d: 'dificil' },
  { q: '¿Cuál es la técnica innata de Megumi?', opts: ['Proyección de sombras', 'Diez Sombras Sagradas', 'Manipulación de shikigami', 'Invocación oscura'], a: 1, serie: 'Jujutsu Kaisen', d: 'medio' },
  { q: '¿Quién mató a Gojo Satoru?', opts: ['Sukuna', 'Kenjaku', 'Toji', 'Mahoraga'], a: 0, serie: 'Jujutsu Kaisen', d: 'medio' },
  { q: '¿Cuál es el nombre del dominio de Sukuna?', opts: ['Chimera Shadow Garden', 'Coffin of the Iron Mountain', 'Malevolent Shrine', 'Infinite Void'], a: 2, serie: 'Jujutsu Kaisen', d: 'dificil' },

  // ── FULLMETAL ALCHEMIST ──
  { q: '¿Qué intentaron transmutar los hermanos Elric?', opts: ['Oro', 'A su madre', 'Una piedra filosofal', 'Un homúnculo'], a: 1, serie: 'Fullmetal Alchemist', d: 'facil' },
  { q: '¿Cuántos homúnculos hay en FMA Brotherhood?', opts: ['5', '6', '7', '8'], a: 2, serie: 'Fullmetal Alchemist', d: 'medio' },
  { q: '¿Cuál es el verdadero nombre de "Father"?', opts: ['Hohenheim', 'Dwarf in the Flask', 'Van Hohenheim', 'Pride'], a: 1, serie: 'Fullmetal Alchemist', d: 'experto' },

  // ── BLEACH ──
  { q: '¿Cuál es el nombre del Zanpakuto de Ichigo?', opts: ['Senbonzakura', 'Zangetsu', 'Hyorinmaru', 'Zabimaru'], a: 1, serie: 'Bleach', d: 'facil' },
  { q: '¿Quién es el capitán de la 10ma división?', opts: ['Byakuya', 'Toshiro Hitsugaya', 'Kenpachi', 'Shunsui'], a: 1, serie: 'Bleach', d: 'medio' },
  { q: '¿Cuál es la forma final de Aizen?', opts: ['Mariposa', 'Hollow', 'Fusión con el Hogyoku', 'Shinigami puro'], a: 2, serie: 'Bleach', d: 'dificil' },
  { q: '¿Qué es Ichigo realmente?', opts: ['Shinigami', 'Quincy', 'Hollow', 'Todo lo anterior'], a: 3, serie: 'Bleach', d: 'experto' },

  // ── CHAINSAW MAN ──
  { q: '¿Cuál es el sueño de Denji al inicio de la serie?', opts: ['Ser millonario', 'Tener una novia', 'Comer pan con mermelada', 'Vengarse del diablo'], a: 2, serie: 'Chainsaw Man', d: 'facil' },
  { q: '¿Cómo se activa la transformación de Denji?', opts: ['Gritando', 'Tirando de la cadena del pecho', 'Comiendo sangre', 'Un ritual'], a: 1, serie: 'Chainsaw Man', d: 'facil' },
  { q: '¿Cuál es el poder del Diablo del Control?', opts: ['Controlar mentes', 'Controlar a cualquier ser mediante contratos', 'Controlar el tiempo', 'Controlar demonios'], a: 1, serie: 'Chainsaw Man', d: 'medio' },
  { q: '¿Qué le pasa a un demonio cuando Chainsaw Man lo devora?', opts: ['Muere', 'Se borra de la existencia', 'Renace', 'Se fusiona con Denji'], a: 1, serie: 'Chainsaw Man', d: 'dificil' },

  // ── EVANGELION ──
  { q: '¿Cuántos Ángeles aparecen en Evangelion?', opts: ['13', '17', '18', '20'], a: 2, serie: 'Evangelion', d: 'dificil' },
  { q: '¿Quién es el padre de Shinji?', opts: ['Kaji', 'Gendo Ikari', 'Fuyutsuki', 'Kaworu'], a: 1, serie: 'Evangelion', d: 'facil' },
  { q: '¿Qué es realmente el Eva-01?', opts: ['Un robot', 'Un clon de Ángel con alma humana', 'Un ser artificial', 'Un mecha puro'], a: 1, serie: 'Evangelion', d: 'experto' },

  // ── TOKYO GHOUL ──
  { q: '¿De qué tipo de ghoul es Kaneki?', opts: ['Medio ghoul (artificial)', 'Ghoul puro', 'Quinque', 'Natural'], a: 0, serie: 'Tokyo Ghoul', d: 'facil' },
  { q: '¿Cuál es la máscara icónica de Kaneki?', opts: ['De conejo', 'De calavera', 'Parche en un ojo con cremallera', 'Máscara de gas'], a: 2, serie: 'Tokyo Ghoul', d: 'medio' },
  { q: '¿Cuál es el tipo de kagune de Kaneki?', opts: ['Ukaku', 'Koukaku', 'Rinkaku', 'Bikaku'], a: 2, serie: 'Tokyo Ghoul', d: 'dificil' },

  // ── RE:ZERO ──
  { q: '¿Cuál es la habilidad de Subaru?', opts: ['Regeneración', 'Return by Death', 'Viaje en el tiempo', 'Invocación'], a: 1, serie: 'Re:Zero', d: 'facil' },
  { q: '¿Quién es Rem?', opts: ['Una elfa', 'Una oni/demonio sirvienta', 'Una bruja', 'Una princesa'], a: 1, serie: 'Re:Zero', d: 'facil' },
  { q: '¿Cuántas brujas pecado existen en Re:Zero?', opts: ['5', '6', '7', '9'], a: 2, serie: 'Re:Zero', d: 'dificil' },
  { q: '¿Quién le otorgó Return by Death a Subaru?', opts: ['Emilia', 'Satella', 'Echidna', 'Roswaal'], a: 1, serie: 'Re:Zero', d: 'medio' },

  // ── KONOSUBA ──
  { q: '¿Cuál es la única magia de Megumin?', opts: ['Fireball', 'Explosión', 'Thunder', 'Inferno'], a: 1, serie: 'Konosuba', d: 'facil' },
  { q: '¿Por qué Aqua es considerada inútil?', opts: ['No tiene magia', 'Atrae monstruos y es torpe', 'Es muy débil', 'No puede pelear'], a: 1, serie: 'Konosuba', d: 'facil' },
  { q: '¿Cuál era la clase de Kazuma antes de isekai?', opts: ['Estudiante/NEET', 'Guerrero', 'Mago', 'Ladrón'], a: 0, serie: 'Konosuba', d: 'medio' },

  // ── FRIEREN ──
  { q: '¿Cuántos años tiene Frieren aproximadamente?', opts: ['100', '500', '1000+', '300'], a: 2, serie: 'Frieren', d: 'medio' },
  { q: '¿Cuál es la raza de Frieren?', opts: ['Humana', 'Elfa', 'Enana', 'Demonio'], a: 1, serie: 'Frieren', d: 'facil' },
  { q: '¿Quién fue el guerrero legendario que viajó con Frieren?', opts: ['Stark', 'Fern', 'Himmel', 'Eisen'], a: 2, serie: 'Frieren', d: 'medio' },
  { q: '¿Cuántos años duró el viaje original de Frieren con el grupo del héroe?', opts: ['5 años', '10 años', '20 años', '50 años'], a: 1, serie: 'Frieren', d: 'dificil' },

  // ── SOLO LEVELING ──
  { q: '¿Cuál era el rango de Jinwoo antes del despertar?', opts: ['Rango S', 'Rango E', 'Rango D', 'Rango C'], a: 1, serie: 'Solo Leveling', d: 'facil' },
  { q: '¿Cómo se llama el poder de Jinwoo?', opts: ['Shadow Monarch', 'System', 'Player', 'The Architect'], a: 0, serie: 'Solo Leveling', d: 'medio' },
  { q: '¿Cuál es la sombra más fuerte de Jinwoo?', opts: ['Iron', 'Igris', 'Beru', 'Tusk'], a: 2, serie: 'Solo Leveling', d: 'dificil' },

  // ── FAIRY TAIL ──
  { q: '¿De qué tipo de Dragon Slayer es Natsu?', opts: ['Hierro', 'Cielo', 'Fuego', 'Sombra'], a: 2, serie: 'Fairy Tail', d: 'facil' },
  { q: '¿Cuál es el nombre del gremio rival de Fairy Tail?', opts: ['Blue Pegasus', 'Phantom Lord', 'Sabertooth', 'Lamia Scale'], a: 2, serie: 'Fairy Tail', d: 'medio' },
  { q: '¿Quién es E.N.D.?', opts: ['Un demonio', 'Natsu', 'Zeref', 'Acnologia'], a: 1, serie: 'Fairy Tail', d: 'experto' },

  // ── SWORD ART ONLINE ──
  { q: '¿En qué piso está el boss final de SAO?', opts: ['50', '75', '100', '99'], a: 2, serie: 'Sword Art Online', d: 'medio' },
  { q: '¿Cuál es el nombre real de Kirito?', opts: ['Kazuma', 'Kirigaya Kazuto', 'Kirito Asada', 'Narusaka'], a: 1, serie: 'Sword Art Online', d: 'facil' },

  // ── STEINS;GATE ──
  { q: '¿Cuál es la bebida favorita de Okabe?', opts: ['Café', 'Dr. Pepper', 'Cola', 'Jugo'], a: 1, serie: 'Steins;Gate', d: 'medio' },
  { q: '¿Cómo envían mensajes al pasado en Steins;Gate?', opts: ['Máquina del tiempo', 'D-Mail (microondas + celular)', 'Un portal', 'Teletransportación'], a: 1, serie: 'Steins;Gate', d: 'dificil' },

  // ── OVERLORD ──
  { q: '¿Cuál es el nombre real de Ainz Ooal Gown?', opts: ['Momonga', 'Touch Me', 'Ulbert', 'Peroroncino'], a: 0, serie: 'Overlord', d: 'medio' },
  { q: '¿Cuál es el nivel máximo en Yggdrasil?', opts: ['50', '80', '100', '120'], a: 2, serie: 'Overlord', d: 'dificil' },

  // ── VINLAND SAGA ──
  { q: '¿Quién mató al padre de Thorfinn?', opts: ['Floki', 'Askeladd', 'Canute', 'Thorkell'], a: 1, serie: 'Vinland Saga', d: 'medio' },
  { q: '¿Cuál es el sueño de Thorfinn en la segunda temporada?', opts: ['Venganza', 'Encontrar Vinland (tierra sin guerra)', 'Ser rey', 'Ser el mejor guerrero'], a: 1, serie: 'Vinland Saga', d: 'dificil' },

  // ── SPY x FAMILY ──
  { q: '¿Cuál es la habilidad secreta de Anya?', opts: ['Superfuerza', 'Telepatía', 'Invisibilidad', 'Volar'], a: 1, serie: 'Spy x Family', d: 'facil' },

  // ── GENERAL / CULTURA ANIME ──
  { q: '¿Qué anime tiene el "Dominio de la Expansión Ilimitada"?', opts: ['Bleach', 'Naruto', 'Jujutsu Kaisen', 'Hunter x Hunter'], a: 2, serie: 'General', d: 'facil' },
  { q: '¿En qué anime aparece el concepto de "Nen"?', opts: ['Dragon Ball', 'Naruto', 'Hunter x Hunter', 'Bleach'], a: 2, serie: 'General', d: 'facil' },
  { q: '¿Qué anime tiene "Titanes" como enemigos principales?', opts: ['Claymore', 'Attack on Titan', 'God Eater', 'Kabaneri'], a: 1, serie: 'General', d: 'facil' },
  { q: '¿Qué personaje dice "Plus Ultra"?', opts: ['Goku', 'Naruto', 'All Might', 'Luffy'], a: 2, serie: 'General', d: 'facil' },
  { q: '¿Qué anime tiene el "Gear 5"?', opts: ['Naruto', 'Bleach', 'One Piece', 'Dragon Ball'], a: 2, serie: 'General', d: 'facil' },
  { q: '¿Cuál fue el primer anime en ganar un Oscar?', opts: ['Akira', 'Ghost in the Shell', 'El viaje de Chihiro', 'Your Name'], a: 2, serie: 'General', d: 'medio' },
  { q: '¿Qué estudio animó Demon Slayer?', opts: ['MAPPA', 'Bones', 'Ufotable', 'Wit Studio'], a: 2, serie: 'General', d: 'medio' },
  { q: '¿En qué año se estrenó Naruto (anime)?', opts: ['1999', '2000', '2002', '2004'], a: 2, serie: 'General', d: 'medio' },
  { q: '¿Qué estudio animó Jujutsu Kaisen?', opts: ['MAPPA', 'Bones', 'Ufotable', 'Madhouse'], a: 0, serie: 'General', d: 'medio' },
  { q: '¿Cuál fue el primer manga publicado en la revista Shonen Jump?', opts: ['Dragon Ball', 'Kochikame', 'Astro Boy', 'Naruto'], a: 1, serie: 'General', d: 'experto' },
  { q: '¿Qué significa "Shonen" en japonés?', opts: ['Chica joven', 'Chico joven', 'Adulto', 'Niño pequeño'], a: 1, serie: 'General', d: 'medio' },
  { q: '¿Qué estudio animó Attack on Titan (temporada final)?', opts: ['Wit Studio', 'MAPPA', 'Bones', 'Ufotable'], a: 1, serie: 'General', d: 'dificil' },
  { q: '¿Cuál es el anime más largo en emisión?', opts: ['One Piece', 'Naruto', 'Sazae-san', 'Detective Conan'], a: 2, serie: 'General', d: 'experto' },
  { q: '¿Qué mangaka creó One Piece?', opts: ['Akira Toriyama', 'Masashi Kishimoto', 'Eiichiro Oda', 'Tite Kubo'], a: 2, serie: 'General', d: 'facil' },
  { q: '¿En qué anime un personaje dice "Omae wa mou shindeiru"?', opts: ['Dragon Ball Z', 'Fist of the North Star', 'Naruto', 'JoJo'], a: 1, serie: 'General', d: 'medio' },
  { q: '¿Cuál de estos NO es un género de anime?', opts: ['Seinen', 'Josei', 'Shounen', 'Hokage'], a: 3, serie: 'General', d: 'medio' },
  { q: '¿Qué significa "isekai"?', opts: ['Otro mundo', 'Vida escolar', 'Romance', 'Ciencia ficción'], a: 0, serie: 'General', d: 'facil' },
  { q: '¿Cuál de estos personajes es un "trap" clásico del anime?', opts: ['Kirito', 'Astolfo (Fate)', 'Natsu', 'Goku'], a: 1, serie: 'General', d: 'medio' },
  { q: '¿Qué anime popularizó el concepto de "Stand"?', opts: ['Naruto', 'JoJo\'s Bizarre Adventure', 'Bleach', 'YuYu Hakusho'], a: 1, serie: 'General', d: 'facil' },
]

const LETRAS = ['🅰️', '🅱️', '🇨', '🇩']

// Generar pista: revela una letra del nombre de la respuesta
function generarPista(pregunta) {
  const respuesta = pregunta.opts[pregunta.a]
  const palabras = respuesta.split(' ')
  if (palabras.length > 1) {
    return `La respuesta tiene *${palabras.length}* palabras y empieza con *"${respuesta[0]}..."*`
  }
  return `Empieza con *"${respuesta.slice(0, 2)}..."* y tiene *${respuesta.length}* letras`
}

// ── BEFORE: Escucha las respuestas ──
export async function before(m, { client }) {
  if (!m.chat || !global.triviaGames?.[m.chat]) return
  const game = global.triviaGames[m.chat]
  if (!m.quoted || m.quoted.id !== game.messageId) return

  const senderId = await resolveLidToRealJid(m.sender, client, m.chat)

  // Modo multijugador: cualquiera puede responder
  // Modo normal: solo el que inició
  if (!game.multiplayer && senderId !== game.player) return

  const resp = m.text?.trim()?.toUpperCase()
  const opcionMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, '1': 0, '2': 1, '3': 2, '4': 3 }
  const sel = opcionMap[resp]

  if (sel === undefined) return

  // En modo multiplayer verificar que no haya respondido ya
  if (game.multiplayer) {
    if (game.answered?.has(senderId)) return
    if (!game.answered) game.answered = new Set()
    game.answered.add(senderId)
  }

  const user = global.db.data.users[senderId]
  if (!user) return

  const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
  const settings = global.db.data.settings[botId] || {}
  const monedas = settings.currency || 'monedas'

  const pregunta = game.pregunta
  const dif = DIFICULTAD[pregunta.d] || DIFICULTAD.medio
  const elapsed = ((Date.now() - game.startTime) / 1000).toFixed(1)
  const timeLimit = dif.time

  if (sel === pregunta.a) {
    // Primer acierto en multiplayer cierra la trivia
    if (game.multiplayer) clearTimeout(game.timeout)
    else clearTimeout(game.timeout)

    // Racha
    user.triviaStreak = (user.triviaStreak || 0) + 1
    const streak = Math.min(user.triviaStreak, MAX_STREAK)
    const streakMult = 1 + (streak - 1) * STREAK_BONUS

    // Bonus por velocidad
    const speedBonus = Math.max(0, 1 - ((Date.now() - game.startTime) / timeLimit))
    const speedMult = 1 + speedBonus * 0.6 // hasta +60% por velocidad

    // Bonus por dificultad (coins ya escalan, pero damos extra multiplicador)
    const coins = Math.floor((dif.coinsMin + Math.random() * (dif.coinsMax - dif.coinsMin)) * streakMult * speedMult)
    const exp = Math.floor((dif.expMin + Math.random() * (dif.expMax - dif.expMin)) * streakMult)

    user.coins = (user.coins || 0) + coins
    user.exp = (user.exp || 0) + exp
    user.triviaWins = (user.triviaWins || 0) + 1
    user.triviaTotal = (user.triviaTotal || 0) + 1

    // Stats de categoría
    if (!user.triviaStats) user.triviaStats = {}
    if (!user.triviaStats[pregunta.serie]) user.triviaStats[pregunta.serie] = { wins: 0, total: 0 }
    user.triviaStats[pregunta.serie].wins++
    user.triviaStats[pregunta.serie].total++

    // Bonus por pista NO usada
    const noPistaBonus = !game.hintUsed ? Math.floor(coins * 0.15) : 0
    if (noPistaBonus > 0) user.coins += noPistaBonus

    // Bonus multiplayer
    const mpBonus = game.multiplayer ? Math.floor(coins * 0.25) : 0
    if (mpBonus > 0) user.coins += mpBonus

    try { updateMissionProgress(user, 'commands') } catch(e) {}

    const streakText = streak > 1 ? `\n│ 🔥 Racha: *x${streak}* (+${Math.round((streakMult - 1) * 100)}% bonus)` : ''
    const speedText = speedBonus > 0.4 ? '\n│ ⚡ *¡Respuesta veloz!* +bonus velocidad' : ''
    const pistaText = noPistaBonus > 0 ? `\n│ 🧩 Sin pista: +*¥${noPistaBonus.toLocaleString()}*` : ''
    const mpText = mpBonus > 0 ? `\n│ 👥 Bonus multijugador: +*¥${mpBonus.toLocaleString()}*` : ''
    const winRate = user.triviaTotal > 0 ? Math.round((user.triviaWins / user.triviaTotal) * 100) : 0
    const totalCoins = coins + noPistaBonus + mpBonus

    await client.reply(m.chat, `╭─── ⋆🐉⋆ ───
│ 🧠 *¡CORRECTO!* ✅
├───────────────
│ 📖 Serie: *${pregunta.serie}*
│ ${dif.emoji} Dificultad: *${dif.label}*
│ ⏱️ Tiempo: *${elapsed}s*${streakText}${speedText}${pistaText}${mpText}
├───────────────
│ 💰 +*¥${totalCoins.toLocaleString()} ${monedas}*
│ ✨ +*${exp.toLocaleString()} XP*
│ 📊 Record: *${user.triviaWins}* victorias (*${winRate}%* acierto)
╰─── ⋆✨⋆ ───`, m)

    delete global.triviaGames[m.chat]
  } else {
    user.triviaTotal = (user.triviaTotal || 0) + 1
    if (!user.triviaStats) user.triviaStats = {}
    if (!user.triviaStats[pregunta.serie]) user.triviaStats[pregunta.serie] = { wins: 0, total: 0 }
    user.triviaStats[pregunta.serie].total++

    // En modo multiplayer, no se cierra la trivia — otros pueden responder
    if (game.multiplayer) {
      await client.reply(m.chat, `❌ *Incorrecto* — La opción *${pregunta.opts[sel]}* no es la correcta. ¡Otros pueden seguir intentando!`, m)
      user.triviaStreak = 0
      return
    }

    clearTimeout(game.timeout)
    user.triviaStreak = 0
    const correcta = pregunta.opts[pregunta.a]
    const dato = obtenerDatoCurioso(pregunta.serie)

    await client.reply(m.chat, `╭─── ⋆🐉⋆ ───
│ 🧠 *¡INCORRECTO!* ❌
├───────────────
│ 📖 Serie: *${pregunta.serie}*
│ ${dif.emoji} Dificultad: *${dif.label}*
│ ✅ Respuesta correcta: *${correcta}*
│ 😅 Tu respuesta: *${pregunta.opts[sel]}*
│ 🔥 Racha perdida${dato ? `\n│\n│ 💡 *Dato curioso:* ${dato}` : ''}
│
│ 💪 ¡Sigue intentando!
╰─── ⋆✨⋆ ───`, m)

    delete global.triviaGames[m.chat]
  }
}

// Datos curiosos cuando fallas
function obtenerDatoCurioso(serie) {
  const datos = {
    'Demon Slayer': [
      'Demon Slayer batió records de taquilla en Japón superando a El viaje de Chihiro.',
      'Zenitsu fue el personaje más popular en las encuestas japonesas.',
      'La respiración del Sol es la original de la cual nacen todas las demás.',
    ],
    'Attack on Titan': [
      'Isayama originalmente quería que todos los personajes murieran al final.',
      'Levi fue diseñado basándose en Rorschach de Watchmen.',
      'El manga empezó en 2009 y terminó en 2021, 12 años de historia.',
    ],
    'Naruto': [
      'Naruto iba a ser originalmente sobre un chico que cocinaba ramen.',
      'Kishimoto es fan de Dragon Ball y eso influyó mucho en la serie.',
      'El Rasengan está inspirado en el Kamehameha de Dragon Ball.',
    ],
    'One Piece': [
      'Oda dijo que One Piece está al 80% de la historia total.',
      'Sanji originalmente se iba a llamar "Naruto".',
      'El manga de One Piece ha vendido más de 500 millones de copias.',
    ],
    'Dragon Ball': [
      'Goku está inspirado en Sun Wukong, el Rey Mono de la mitología china.',
      'El Super Saiyan fue inventado porque Toriyama no quería dibujar pelo negro.',
      'Dragon Ball fue rechazado 3 veces antes de ser publicado.',
    ],
    'Jujutsu Kaisen': [
      'Gojo fue diseñado para ser el personaje más fuerte desde el inicio.',
      'Gege Akutami eligió los dedos de Sukuna porque son 20 objetos.',
      'JJK está inspirado en Bleach y Yu Yu Hakusho.',
    ],
    'Death Note': [
      'Light Yagami fue votado como el mejor villano de anime de todos los tiempos.',
      'El final del manga y del anime son diferentes.',
      'Ryuk fue diseñado basándose en Edward Scissorhands.',
    ],
    'General': [
      'El término "anime" en Japón se refiere a TODA la animación, no solo la japonesa.',
      'El primer anime reconocido data de 1917 en Japón.',
      'Studio Ghibli toma su nombre de un avión italiano de la Segunda Guerra Mundial.',
    ],
  }
  const lista = datos[serie]
  if (!lista) return null
  return lista[Math.floor(Math.random() * lista.length)]
}

// ── COMANDO ──
export default {
  command: ['trivia', 'quiz', 'pregunta', 'triviastats'],
  category: 'rpg',
  run: async ({ client, m, args, usedPrefix, command }) => {
    if (!m.isGroup) return m.reply('🐲 Solo en grupos (◕ᴗ◕✿)')

    const chat = global.db.data.chats[m.chat] || {}
    if (chat.adminonly || !chat.rpg) return m.reply('🐉 La economía está dormida zzZ')

    const userId = await resolveLidToRealJid(m.sender, client, m.chat)
    let user = global.db.data.users[userId]
    if (!user) {
      global.db.data.users[userId] = { coins: 0, exp: 0 }
      user = global.db.data.users[userId]
    }

    // ── Subcomando: stats ──
    if (command === 'triviastats' || args[0] === 'stats') {
      const wins = user.triviaWins || 0
      const total = user.triviaTotal || 0
      const streak = user.triviaStreak || 0
      const rate = total > 0 ? Math.round((wins / total) * 100) : 0
      const stats = user.triviaStats || {}

      let catText = ''
      const entries = Object.entries(stats).sort((a, b) => b[1].wins - a[1].wins)
      for (const [cat, s] of entries.slice(0, 8)) {
        const catRate = s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0
        catText += `│ • ${cat}: *${s.wins}/${s.total}* (${catRate}%)\n`
      }
      if (!catText) catText = '│ Aún no tienes stats por serie\n'

      return m.reply(`╭─── ⋆🐉⋆ ───
│ 📊 *TRIVIA STATS*
├───────────────
│ ✅ Victorias: *${wins}*
│ 📝 Total respuestas: *${total}*
│ 🎯 Porcentaje: *${rate}%*
│ 🔥 Racha actual: *x${streak}*
├───────────────
│ 📖 *Por categoría:*
${catText}╰─── ⋆✨⋆ ───`)
    }

    // ── Subcomando: pista ──
    if (args[0] === 'pista' || args[0] === 'hint') {
      const game = global.triviaGames[m.chat]
      if (!game) return m.reply('🐲 No hay trivia activa. Usa *' + usedPrefix + 'trivia* para empezar.')
      if (game.hintUsed) return m.reply('🐲 Ya se usó la pista en esta pregunta.')
      game.hintUsed = true
      const pista = generarPista(game.pregunta)
      return m.reply(`╭─── ⋆🐉⋆ ───\n│ 🧩 *PISTA:* ${pista}\n│ ⚠️ No recibirás bonus de "sin pista"\n╰─── ⋆✨⋆ ───`)
    }

    // Verificar si hay trivia activa
    if (global.triviaGames[m.chat]) return m.reply('🐲 Ya hay una trivia activa. Espera a que termine o usa *' + usedPrefix + 'trivia pista* para una pista (◕︿◕)')

    // Cooldown
    if (!user.triviaCooldown) user.triviaCooldown = 0
    const remaining = user.triviaCooldown - Date.now()
    if (remaining > 0) {
      const mins = Math.floor(remaining / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      return m.reply(`🐲 Espera *${mins}m ${secs}s* para otra trivia (◕︿◕✿)`)
    }

    // Modo multijugador con argumento "vs" o "multi"
    const isMultiplayer = args[0] === 'vs' || args[0] === 'multi'

    // Filtrar por dificultad si se especifica
    let pool = [...PREGUNTAS]
    const difArg = args.find(a => ['facil', 'medio', 'dificil', 'experto'].includes(a?.toLowerCase()))
    if (difArg) {
      const filtered = pool.filter(p => p.d === difArg.toLowerCase())
      if (filtered.length > 0) pool = filtered
    }

    // Filtrar por serie si se especifica
    const serieArg = args.find(a => !['facil', 'medio', 'dificil', 'experto', 'vs', 'multi', 'stats', 'pista', 'hint'].includes(a?.toLowerCase()))
    if (serieArg) {
      const filtered = pool.filter(p => p.serie.toLowerCase().includes(serieArg.toLowerCase()))
      if (filtered.length > 0) pool = filtered
    }

    // Elegir pregunta aleatoria
    const pregunta = pool[Math.floor(Math.random() * pool.length)]
    const dif = DIFICULTAD[pregunta.d] || DIFICULTAD.medio
    const streak = user.triviaStreak || 0
    const timeSeconds = Math.round(dif.time / 1000)

    const optsText = pregunta.opts.map((o, i) => `│ ${LETRAS[i]} *${o}*`).join('\n')
    const streakInfo = streak > 0 ? `\n│ 🔥 Racha actual: *x${streak}*` : ''
    const mpTag = isMultiplayer ? '\n│ 👥 *MODO MULTIJUGADOR* — ¡Todos pueden responder!' : ''
    const rewardRange = `¥${dif.coinsMin.toLocaleString()} ~ ¥${dif.coinsMax.toLocaleString()}`

    const msg = `╭─── ⋆🐉⋆ ───
│ 🧠 *TRIVIA ANIME*
│ ${dif.emoji} Dificultad: *${dif.label}*${mpTag}
├───────────────
│ 📖 *${pregunta.serie}*
│
│ ❓ ${pregunta.q}
│
${optsText}
│${streakInfo}
│ ⏱️ Tienes *${timeSeconds} segundos*
│ 💰 Recompensa: *${rewardRange}*
│ 💡 Responde con *A*, *B*, *C* o *D*
│ 🧩 Usa *${usedPrefix}trivia pista* para una pista
╰─── ⋆✨⋆ ───`

    const sent = await client.reply(m.chat, msg, m)

    global.triviaGames[m.chat] = {
      pregunta,
      player: userId,
      multiplayer: isMultiplayer,
      messageId: sent.key.id,
      startTime: Date.now(),
      hintUsed: false,
      answered: new Set(),
      timeout: setTimeout(async () => {
        if (global.triviaGames[m.chat]) {
          const correcta = pregunta.opts[pregunta.a]
          user.triviaStreak = 0
          user.triviaTotal = (user.triviaTotal || 0) + 1
          const dato = obtenerDatoCurioso(pregunta.serie)
          await client.reply(m.chat, `╭─── ⋆🐉⋆ ───
│ 🧠 *¡TIEMPO AGOTADO!* ⏰
├───────────────
│ ✅ La respuesta era: *${correcta}*
│ 🔥 Racha perdida${dato ? `\n│\n│ 💡 *Dato curioso:* ${dato}` : ''}
│
│ 💪 Usa *${usedPrefix}trivia* para intentar de nuevo
╰─── ⋆✨⋆ ───`, m)
          delete global.triviaGames[m.chat]
        }
      }, dif.time)
    }

    user.triviaCooldown = Date.now() + COOLDOWN
  }
}
