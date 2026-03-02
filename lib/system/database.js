import path from 'path'
import _ from 'lodash'
import fs from 'fs'
import yargs from 'yargs/yargs'
import Database from 'better-sqlite3'

global.opts = Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
const dbPath = path.join(process.cwd(), 'lib', 'datos.db')
const backupDir = path.join(process.cwd(), 'backups')

// 🔧 FIX: Bandera de cambios pendientes (evita JSON.stringify cada 500ms)
let _dirty = false

/** Marca la DB como modificada (para que el auto-save la guarde) */
global.markDBDirty = function () { _dirty = true }

// --- 🛡️ INTEGRIDAD DE BASE DE DATOS ---
function checkDatabaseIntegrity() {
  if (!fs.existsSync(dbPath)) return true

  try {
    const test = new Database(dbPath, { readonly: true })
    const result = test.prepare('PRAGMA integrity_check').get()
    test.close()
    return result.integrity_check === 'ok'
  } catch {
    return false
  }
}

let restored = false
if (!checkDatabaseIntegrity()) {
  console.error('⚠️ Base de datos corrupta detectada. Iniciando restauración...')
  restored = restoreFromBackup()
}

// --- 🔌 CONEXIÓN ---
const conn = new Database(dbPath, { fileMustExist: false, timeout: 10000 })

// Modo WAL para mejor rendimiento y concurrencia
conn.pragma('journal_mode = WAL')
if (restored) {
  conn.pragma('wal_checkpoint(TRUNCATE)')
}

// Inicialización de Tablas
conn.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    key TEXT PRIMARY KEY,
    data TEXT
  );
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    contenido TEXT
  );
  CREATE TABLE IF NOT EXISTS settings (
    clave TEXT PRIMARY KEY,
    valor TEXT
  );
`)

// --- 🌐 ESTRUCTURA GLOBAL ---
global.db = {
  conn,
  data: {
    users: {},
    chats: {},
    settings: {},
  },
  chain: null,
  READ: false,
  _snapshot: {
    userKeys: new Set(),
    chatKeys: new Set(),
    settingKeys: new Set(),
  },
}

global.DATABASE = global.db

// --- 📥 CARGAR DATOS (Lectura) ---
// 🔧 FIX: _dbLoaded evita recargar y sobreescribir cambios en memoria
let _dbLoaded = false

global.loadDatabase = function loadDatabase() {
  if (_dbLoaded) return global.db.data

  const usuarios = conn.prepare(`SELECT key, data FROM usuarios`).all()
  for (const row of usuarios) {
    try {
      global.db.data.users[row.key] = JSON.parse(row.data)
    } catch (e) {
      console.error(`⚠️ Error parseando usuario ${row.key}:`, e.message)
    }
  }

  const chats = conn.prepare(`SELECT id, contenido FROM chats`).all()
  for (const row of chats) {
    try {
      global.db.data.chats[row.id] = JSON.parse(row.contenido)
    } catch (e) {
      console.error(`⚠️ Error parseando chat ${row.id}:`, e.message)
    }
  }

  const settings = conn.prepare(`SELECT clave, valor FROM settings`).all()
  for (const row of settings) {
    try {
      global.db.data.settings[row.clave] = JSON.parse(row.valor)
    } catch (e) {
      console.error(`⚠️ Error parseando setting ${row.clave}:`, e.message)
    }
  }

  global.db.chain = _.chain(global.db.data)
  _dbLoaded = true
  _dirty = false

  // 🔧 FIX: Guardar snapshot de las KEYS existentes para detectar eliminaciones
  global.db._snapshot.userKeys = new Set(Object.keys(global.db.data.users))
  global.db._snapshot.chatKeys = new Set(Object.keys(global.db.data.chats))
  global.db._snapshot.settingKeys = new Set(Object.keys(global.db.data.settings))

  return global.db.data
}

// --- 🕵️ DETECTAR CAMBIOS ---
// 🔧 FIX: Usa bandera _dirty en vez de JSON.stringify cada 500ms
function hasPendingChanges() {
  return _dirty
}

// --- 💾 GUARDAR DATOS (Escritura) ---
global.saveDatabase = function saveDatabase() {
  if (!hasPendingChanges()) return

  const { users, chats, settings } = global.db.data
  const snap = global.db._snapshot

  // Usamos transacción para que sea atómico (todo o nada)
  const transaction = conn.transaction(() => {
    // 🔧 FIX: Detectar y ELIMINAR registros borrados de memoria
    // --- Usuarios ---
    const currentUserKeys = new Set(Object.keys(users))
    if (snap.userKeys) {
      for (const oldKey of snap.userKeys) {
        if (!currentUserKeys.has(oldKey)) {
          conn.prepare(`DELETE FROM usuarios WHERE key = ?`).run(oldKey)
        }
      }
    }
    const insertUser = conn.prepare(`REPLACE INTO usuarios (key, data) VALUES (?, ?)`)
    for (const [key, data] of Object.entries(users)) {
      try {
        insertUser.run(key, JSON.stringify(data))
      } catch (e) {
        console.error(`⚠️ Error serializando usuario ${key}:`, e.message)
      }
    }

    // --- Chats ---
    const currentChatKeys = new Set(Object.keys(chats))
    if (snap.chatKeys) {
      for (const oldKey of snap.chatKeys) {
        if (!currentChatKeys.has(oldKey)) {
          conn.prepare(`DELETE FROM chats WHERE id = ?`).run(oldKey)
        }
      }
    }
    const insertChat = conn.prepare(`REPLACE INTO chats (id, contenido) VALUES (?, ?)`)
    for (const [id, contenido] of Object.entries(chats)) {
      try {
        insertChat.run(id, JSON.stringify(contenido))
      } catch (e) {
        console.error(`⚠️ Error serializando chat ${id}:`, e.message)
      }
    }

    // --- Settings ---
    const currentSettingKeys = new Set(Object.keys(settings))
    if (snap.settingKeys) {
      for (const oldKey of snap.settingKeys) {
        if (!currentSettingKeys.has(oldKey)) {
          conn.prepare(`DELETE FROM settings WHERE clave = ?`).run(oldKey)
        }
      }
    }
    const insertSetting = conn.prepare(`REPLACE INTO settings (clave, valor) VALUES (?, ?)`)
    for (const [clave, valor] of Object.entries(settings)) {
      try {
        insertSetting.run(clave, JSON.stringify(valor))
      } catch (e) {
        console.error(`⚠️ Error serializando setting ${clave}:`, e.message)
      }
    }
  })

  try {
    transaction()
    // 🔧 FIX: Actualizar snapshot de keys después de guardar exitosamente
    snap.userKeys = new Set(Object.keys(users))
    snap.chatKeys = new Set(Object.keys(chats))
    snap.settingKeys = new Set(Object.keys(settings))
    _dirty = false
  } catch (err) {
    console.error('❌ Error guardando DB:', err)
    // Mantener _dirty = true para reintentar en el siguiente ciclo
  }
}

// --- ⏱️ AUTO-GUARDADO ---
// 🔧 FIX: Intervalo más eficiente, ya no hace JSON.stringify cada 500ms
setInterval(() => {
  if (_dirty) {
    try {
      global.saveDatabase()
    } catch (e) {
      console.error('❌ Error en auto-save:', e.message)
    }
  }
}, 3000) // Guardar cada 3 segundos si hay cambios (era 500ms, excesivo)

// --- 📦 SISTEMA DE BACKUPS ---
function createBackup() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const now = new Date()
  const timestamp = now.toISOString().replace(/:/g, '-')
  const backupFile = path.join(backupDir, `datos-${timestamp}.db`)

  // Forzar guardado antes de backup
  global.saveDatabase()

  // Checkpoint para asegurar que todo esté en el archivo principal y no en el WAL
  try {
      conn.pragma('wal_checkpoint(FULL)')
      fs.copyFileSync(dbPath, backupFile)
  } catch (e) {
      console.error('Error creando backup:', e)
      return
  }

  // Rotación de backups (Mantiene los 3 más recientes)
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('datos-') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
    }))
    .sort((a, b) => a.time - b.time)

  while (backups.length > 3) {
    const old = backups.shift()
    fs.unlinkSync(path.join(backupDir, old.name))
  }
}

function getBackupsOrdered() {
  if (!fs.existsSync(backupDir)) return []

  return fs.readdirSync(backupDir)
    .filter(f => f.startsWith('datos-') && f.endsWith('.db'))
    .map(f => ({
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time) // Más reciente primero
}

function restoreFromBackup() {
  const backups = getBackupsOrdered()

  if (!backups.length) {
    console.error('❌ No hay backups disponibles para restaurar.')
    return false
  }

  for (const backup of backups) {
    try {
      console.warn('🔁 Intentando restaurar backup:', backup.path)
      
      // Limpieza previa
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal')
      if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm')

      fs.copyFileSync(backup.path, dbPath)
      
      // Verificar integridad del backup copiado
      const test = new Database(dbPath, { readonly: true })
      const res = test.prepare('PRAGMA integrity_check').get()
      test.close()

      if (res.integrity_check === 'ok') {
        console.warn('✅ Backup válido restaurado con éxito.')
        return true
      }

      console.warn('⚠️ Backup corrupto, probando el siguiente...')
    } catch (e) {
      console.warn('⚠️ Error al procesar backup:', e.message)
    }
  }

  console.error('❌ CRÍTICO: Ningún backup es válido.')
  return false
}

// Carga inicial
global.loadDatabase()

// Crear backup al iniciar
createBackup()

// Backup automático cada 24 horas
setInterval(() => {
  createBackup()
}, 24 * 60 * 60 * 1000)

// 🔧 FIX: Guardar DB al cerrar proceso (PM2 restart, etc.)
function gracefulSave() {
  try {
    _dirty = true // Forzar guardado final
    global.saveDatabase()
    conn.pragma('wal_checkpoint(TRUNCATE)')
    console.log('✅ DB guardada antes de cerrar.')
  } catch (e) {
    console.error('❌ Error guardando DB al cerrar:', e.message)
  }
}
// 🔧 FIX: Exponer globalmente para que index.js lo llame en su shutdown unificado
global._gracefulSaveDB = gracefulSave

// Solo guardar en 'exit' (el SIGINT/SIGTERM lo maneja index.js de forma centralizada)
process.on('exit', gracefulSave)

export default global.db
