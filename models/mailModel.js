const db = require('../db/db');

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

module.exports = { getMailHistoryByUser };
