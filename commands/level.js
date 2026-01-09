function canLevelUp(level, exp, multiplier = 1) {
  // Fórmula de nivel: (Nivel+1)^2 * 100 * Multiplicador
  const required = Math.floor(Math.pow(level + 1, 2) * 100 * multiplier)
  return exp >= required
}

export default async (m) => {
  // Validamos que exista el usuario en la DB
  if (!m.sender || !global.db.data.users[m.sender]) return

  const user = global.db.data.users[m.sender]
  const multiplier = global.multiplier || 1 // Fallback si no hay multiplicador global

  // Inicializamos valores si no existen
  user.level = user.level || 0
  user.exp = user.exp || 0

  let before = user.level
  
  // Bucle para subir múltiples niveles si tiene mucha EXP de golpe
  while (canLevelUp(user.level, user.exp, multiplier)) {
    user.level++
  }

  // Opcional: Notificar si subió de nivel (puedes descomentarlo)
  /*
  if (user.level > before) {
      m.reply(`🎉 ¡Felicidades! Has subido al nivel *${user.level}* 🆙`)
  }
  */
};
