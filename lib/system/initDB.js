const isNumber = (x) => typeof x === 'number' && !isNaN(x)

function initDB(m, client) {
  // Validación de seguridad por si client.user es undefined (pasa a veces al reconectar)
  if (!client?.user?.id) return
  
  // Validación adicional para m.sender y m.chat
  if (!m?.sender || !m?.chat) return

  // Asegurar que la estructura de db existe
  if (!global.db?.data) {
    global.db = global.db || {}
    global.db.data = global.db.data || {}
  }
  global.db.data.settings = global.db.data.settings || {}
  global.db.data.users = global.db.data.users || {}
  global.db.data.chats = global.db.data.chats || {}

  const jid = client.user.id.split(':')[0] + '@s.whatsapp.net'

  // --- SETTINGS (Configuración del Bot) ---
  const settings = global.db.data.settings[jid] ||= {}
  settings.self ??= false
  settings.prefijo ??= ['/', '#', '.']
  settings.id ??= '120363423354513567@newsletter'
  // ... (tus textos largos) ...
  settings.currency ??= 'DarksitoCoins 💰'
  settings.owner ??= 'ᥫMatheoDark◢)凸'

  // --- USERS (Datos Globales del Usuario) ---
  const user = global.db.data.users[m.sender] ||= {}
  user.name ??= m.pushName || 'Usuario' // Agregamos fallback al pushName
  user.exp = isNumber(user.exp) ? user.exp : 0
  user.level = isNumber(user.level) ? user.level : 0
  user.usedcommands = isNumber(user.usedcommands) ? user.usedcommands : 0
  
  // Mover economía aquí es lo ideal, pero si usas economía por grupo, déjalo abajo.
  // user.coins = isNumber(user.coins) ? user.coins : 0  <-- Recomendado

  user.pasatiempo ??= 'No definido' // Mejor que string vacío
  user.description ??= ''
  user.marry ??= ''
  user.genre ??= ''
  user.birth ??= ''
  user.metadatos ??= {} // Mejor objeto vacío que null para evitar crash
  user.metadatos2 ??= {}

  // --- CHATS (Configuración de Grupos) ---
  const chat = global.db.data.chats[m.chat] ||= {}
  
  // ESTA ES LA PARTE POLÉMICA (Economía por grupo)
  chat.users ||= {} 
  chat.users[m.sender] ||= {}
  chat.users[m.sender].coins = isNumber(chat.users[m.sender].coins) ? chat.users[m.sender].coins : 0
  chat.users[m.sender].bank = isNumber(chat.users[m.sender].bank) ? chat.users[m.sender].bank : 0
  chat.users[m.sender].characters = Array.isArray(chat.users[m.sender].characters) ? chat.users[m.sender].characters : []

  // Configs del grupo
  chat.bannedGrupo ??= false
  chat.welcome ??= true
  chat.nsfw ??= false
  chat.alerts ??= true
  chat.gacha ??= true
  chat.rpg ??= true
  chat.adminonly ??= false
  chat.primaryBot ??= null
  chat.antilinks ??= true
  chat.personajesReservados ||= []
}

export default initDB;
