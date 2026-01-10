const isNumber = (x) => typeof x === 'number' && !isNaN(x)

function initDB(m, client) {
  // 1. Validaciones de seguridad
  if (!client?.user?.id || !m?.sender || !m?.chat) return

  const jid = client.user.id.split(':')[0] + '@s.whatsapp.net'

  // 2. Inicializar estructura base si no existe
  if (!global.db?.data) {
    global.db = global.db || {}
    global.db.data = global.db.data || {}
  }
  global.db.data.settings = global.db.data.settings || {}
  global.db.data.users = global.db.data.users || {}
  global.db.data.chats = global.db.data.chats || {}

  // ───────────────────────────────────────────────
  // ⚙️ SETTINGS (Configuración del Bot)
  // ───────────────────────────────────────────────
  const settings = global.db.data.settings[jid] ||= {}
  
  settings.self ??= false
  settings.prefijo ??= ['/', '#', '.']
  
  // 🔥 TUS DATOS ACTUALIZADOS 🔥
  settings.id ??= '120363423354513567@newsletter' // ID del Canal (Newsletter)
  settings.nameid ??= '✨ Lucoa Updates ✨'
  settings.link ??= 'https://whatsapp.com/channel/0029Vb7LZZD5K3zb3S98eA1j' // Tu enlace
  settings.icon ??= 'https://i.ibb.co/9Hc0y97/default-group.png'
  settings.banner ??= 'https://github.com/MatheoDark/Lucoa-Bot-MD/blob/main/media/banner2.jpg?raw=true' // TU FOTO DE BANNER
  
  settings.currency ??= 'DarksitoCoins 💰'
  settings.owner ??= 'ᥫMatheoDark◢)凸'

  // ───────────────────────────────────────────────
  // 👤 USERS (ECONOMÍA GLOBAL)
  // ───────────────────────────────────────────────
  const user = global.db.data.users[m.sender] ||= {}
  
  user.name ??= m.pushName || 'Usuario'
  user.exp = isNumber(user.exp) ? user.exp : 0
  user.level = isNumber(user.level) ? user.level : 0
  
  // ✅ ECONOMÍA GLOBAL
  user.coins = isNumber(user.coins) ? user.coins : 0
  user.bank = isNumber(user.bank) ? user.bank : 0
  
  user.usedcommands = isNumber(user.usedcommands) ? user.usedcommands : 0
  user.pasatiempo ??= 'No definido'
  user.description ??= ''
  user.marry ??= ''
  user.genre ??= ''
  user.birth ??= ''
  user.metadatos ??= {} 
  user.metadatos2 ??= {}

  // ───────────────────────────────────────────────
  // 🏰 CHATS (GACHA LOCAL)
  // ───────────────────────────────────────────────
  const chat = global.db.data.chats[m.chat] ||= {}
  
  chat.users ||= {} 
  chat.users[m.sender] ||= {}

  // ✅ GACHA LOCAL
  chat.users[m.sender].characters = Array.isArray(chat.users[m.sender].characters) ? chat.users[m.sender].characters : []

  // Configuración del grupo
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
