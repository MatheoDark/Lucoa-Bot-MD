import path from 'path'
import _ from 'lodash'
import fs from 'fs'
import yargs from 'yargs/yargs'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

global.opts = Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
const dbPath = path.join(__dirname, 'datos.db')
const backupDir = path.join(__dirname, '..', 'backups')

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
    users: '{}',
    chats: '{}',
    settings: '{}',
  },
}

global.DATABASE = global.db

// --- 📥 CARGAR DATOS (Lectura) ---
global.loadDatabase = function loadDatabase() {
  if (global.db.READ) return global.db.data
  global.db.READ = true

  const usuarios = conn.prepare(`SELECT key, data FROM usuarios`).all()
  for (const row of usuarios) {
    try {
      global.db.data.users[row.key] = JSON.parse(row.data)
    } catch {}
  }

  const chats = conn.prepare(`SELECT id, contenido FROM chats`).all()
  for (const row of chats) {
    try {
      global.db.data.chats[row.id] = JSON.parse(row.contenido)
    } catch {}
  }

  const settings = conn.prepare(`SELECT clave, valor FROM settings`).all()
  for (const row of settings) {
    try {
      global.db.data.settings[row.clave] = JSON.parse(row.valor)
    } catch {}
  }

  global.db.chain = _.chain(global.db.data)
  global.db.READ = false

  // Guardamos snapshot inicial para comparar cambios luego
  global.db._snapshot.users = JSON.stringify(global.db.data.users)
  global.db._snapshot.chats = JSON.stringify(global.db.data.chats)
  global.db._snapshot.settings = JSON.stringify(global.db.data.settings)

  return global.db.data
}

// --- 🕵️ DETECTAR CAMBIOS ---
function hasPendingChanges() {
  const { users, chats, settings } = global.db.data
  const snap = global.db._snapshot

  return (
    snap.users !== JSON.stringify(users) ||
    snap.chats !== JSON.stringify(chats) ||
    snap.settings !== JSON.stringify(settings)
  )
}

// --- 💾 GUARDAR DATOS (Escritura) ---
global.saveDatabase = function saveDatabase() {
  if (!hasPendingChanges()) return

  const { users, chats, settings } = global.db.data

  // Usamos transacción para que sea atómico (todo o nada)
  const transaction = conn.transaction(() => {
    const insertUser = conn.prepare(`REPLACE INTO usuarios (key, data) VALUES (?, ?)`)
    for (const [key, data] of Object.entries(users)) {
      insertUser.run(key, JSON.stringify(data))
    }

    const insertChat = conn.prepare(`REPLACE INTO chats (id, contenido) VALUES (?, ?)`)
    for (const [id, contenido] of Object.entries(chats)) {
      insertChat.run(id, JSON.stringify(contenido))
    }

    const insertSetting = conn.prepare(`REPLACE INTO settings (clave, valor) VALUES (?, ?)`)
    for (const [clave, valor] of Object.entries(settings)) {
      insertSetting.run(clave, JSON.stringify(valor))
    }
  })

  try {
    transaction()
    // Actualizamos snapshot solo si la transacción fue exitosa
    global.db._snapshot.users = JSON.stringify(users)
    global.db._snapshot.chats = JSON.stringify(chats)
    global.db._snapshot.settings = JSON.stringify(settings)
  } catch (err) {
    console.error('Error guardando DB:', err)
  }
}

// --- ⏱️ AUTO-GUARDADO ---
let lastSave = Date.now()

// Revisa cambios cada 500ms, guarda si pasó 1s desde el último guardado
setInterval(() => {
  const now = Date.now()
  const elapsed = now - lastSave

  if (elapsed >= 1000 && hasPendingChanges()) {
    global.saveDatabase()
    lastSave = now
  }
}, 500)

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

export default global.db
