const db = require('../db/db');

function getFileById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM files WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

module.exports = { getFileById };
