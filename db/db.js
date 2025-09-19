const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.sqlite');

db.serialize(() => {
  // Activar claves foráneas
  db.run(`PRAGMA foreign_keys = ON`);

  // Tabla de usuarios
  db.run(`CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    dni TEXT NOT NULL,
    fecha TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    telefono TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  // Tabla de archivos
  db.run(`CREATE TABLE IF NOT EXISTS files(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Tabla de permisos cruzados
  db.run(`CREATE TABLE IF NOT EXISTS permissions(
    file_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    can_read INTEGER NOT NULL DEFAULT 1,
    can_write INTEGER NOT NULL DEFAULT 0,
    can_delete INTEGER NOT NULL DEFAULT 0,
    can_share INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(file_id, user_id),
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Tabla de historial de mails enviados
  db.run(`CREATE TABLE IF NOT EXISTS mail_history(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    target_email TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
  )`);
});

module.exports = db;