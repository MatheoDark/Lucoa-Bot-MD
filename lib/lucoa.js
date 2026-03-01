// ═══════════════════════════════════════════
//  🐉 LUCOA AESTHETIC SYSTEM
//  Tema visual unificado para Lucoa Bot MD
//  Inspirado en Quetzalcoatl (Lucoa)
//  de Kobayashi-san Chi no Maid Dragon
// ═══════════════════════════════════════════

// ─── Símbolos temáticos ───
const dragon = '🐉'
const dragonFace = '🐲'
const flower = '❀'
const sparkle = '✦'
const gem = '💎'
const star = '✧'
const petal = '🌸'

// ─── Kaomojis Lucoa ───
const kaomojis = [
  '(◕ᴗ◕✿)',
  '(●\'◡\'●)',
  '꒰ঌ🐉໒꒱',
  '(ᐢ..ᐢ)♡',
  '₍ᐢ..ᐢ₎',
  '(˶ᵔ ᵕ ᵔ˶)',
  '(≧◡≦)',
  '(✿◠‿◠)',
  '(♡ω♡)',
  '(⁀ᗢ⁀)',
]

const kaomojis_sad = [
  '(╥﹏╥)',
  '(◞‸◟)',
  '(っ˘̩╭╮˘̩)っ',
  '(ᗒᗩᗕ)',
  '(T_T)',
]

const kaomojis_angry = [
  '(╬ Ò﹏Ó)',
  '(¬_¬")',
  '(ᗒᗣᗕ)՞',
]

const kaomojis_happy = [
  '(◕ᴗ◕✿)',
  '(≧◡≦) ♡',
  '(˶ᵔ ᵕ ᵔ˶)',
  '(ノ◕ヮ◕)ノ*:・゚✧',
  'ヽ(>∀<☆)ノ',
]

// ─── Funciones utilitarias ───

/** Kaomoji aleatorio */
function kao() {
  return kaomojis[Math.floor(Math.random() * kaomojis.length)]
}

function kaoHappy() {
  return kaomojis_happy[Math.floor(Math.random() * kaomojis_happy.length)]
}

function kaoSad() {
  return kaomojis_sad[Math.floor(Math.random() * kaomojis_sad.length)]
}

/** Header con estilo dragón */
function header(title) {
  return `╭─── ⋆🐉⋆ ───\n│  ${title}\n├─────────────`
}

/** Footer dragón */
function footer() {
  return `╰─── ⋆✨⋆ ───`
}

/** Línea de contenido */
function line(text) {
  return `│ ${text}`
}

/** Separador */
function sep() {
  return `│`
}

/** Box completo con título y líneas */
function box(title, lines) {
  let msg = `╭─── ⋆🐉⋆ ───\n│  *${title}*\n├─────────────\n`
  for (const l of lines) {
    msg += `│ ${l}\n`
  }
  msg += `╰─── ⋆✨⋆ ───`
  return msg
}

/** Box simple sin header grueso */
function miniBox(title, lines) {
  let msg = `┌ 🐲 *${title}*\n`
  for (const l of lines) {
    msg += `│ ${l}\n`
  }
  msg += `└───────`
  return msg
}

/** Mensaje de éxito */
function success(text) {
  return `✨ ${text} ${kaoHappy()}`
}

/** Mensaje de error */
function error(text) {
  return `🐲 ${text} ${kaoSad()}`
}

/** Mensaje de espera */
function wait(text = 'Procesando...') {
  return `🔮 *${text}* ${kao()}`
}

/** Mensaje de advertencia */
function warn(text) {
  return `🌸 ${text}`
}

/** Formato de monedas */
function coins(amount, currency = 'Coins') {
  return `¥${Number(amount).toLocaleString()} ${currency}`
}

/** Recompensa con estilo */
function reward(label, amount, currency) {
  return `${flower} *${label}* › *${coins(amount, currency)}*`
}

/** Cooldown message */
function cooldown(time) {
  return `⏳ Debes esperar *${time}* ${kaoSad()}`
}

/** Dev / firma */
function firma() {
  return `> 🐉 *Lucoa Bot* · ᵖᵒʷᵉʳᵉᵈ ᵇʸ ℳᥝ𝗍ɦᥱ᥆Ɗᥝrƙ`
}

/** Título de categoría para menú */
function catTitle(emoji, name) {
  return `╭── ${emoji} *${name}* ──`
}

/** Fin de categoría */
function catEnd() {
  return `╰──────────⋆✦⋆`
}

/** Item de comando en menú */
function cmdItem(prefix, name, desc) {
  let line = `│ ${flower} ${prefix}${name}`
  if (desc) line += `\n│   ╰ _${desc}_`
  return line
}

/** Mensaje de bienvenida RPG */
function rpgDisabled() {
  return `🐲 Los comandos de economía están desactivados en este grupo ${kaoSad()}\n> Usa *#enable rpg* para activarlos.`
}

/** Grupo solamente */
function groupOnly() {
  return `🐲 Este comando solo funciona en grupos ${kaoSad()}`
}

export {
  dragon, dragonFace, flower, sparkle, gem, star, petal,
  kaomojis, kaomojis_sad, kaomojis_angry, kaomojis_happy,
  kao, kaoHappy, kaoSad,
  header, footer, line, sep, box, miniBox,
  success, error, wait, warn,
  coins, reward, cooldown,
  firma, catTitle, catEnd, cmdItem,
  rpgDisabled, groupOnly,
}
