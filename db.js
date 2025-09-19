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

// Busca un archivo por ID
function getFileById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM files WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Obtener historial de mails enviados por usuario
function getMailHistoryByUser(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT mh.*, f.original_name 
       FROM mail_history mh 
       JOIN files f ON f.id = mh.file_id
       WHERE mh.sender_id = ?
       ORDER BY mh.sent_at DESC`,
      [userId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

module.exports = db;
module.exports.getFileById = getFileById;
module.exports.getMailHistoryByUser = getMailHistoryByUser;