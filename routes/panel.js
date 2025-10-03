const db = require('../db/db');
const { getMailHistoryByUser } = require('../models/mailModel');
const { ensureAuth } = require('../middlewares/auth');

module.exports = function(app) {
  app.get('/dashboard', ensureAuth, async (req, res) => {
    const userId = req.session.user.id;
    const q = `
      SELECT f.id,f.original_name,f.size,f.created_at,u.nombre as owner_nombre,f.owner_id
      FROM files f JOIN users u ON u.id=f.owner_id
      WHERE f.owner_id=? OR f.id IN (SELECT file_id FROM permissions WHERE user_id=? AND can_read=1)
      ORDER BY f.created_at DESC`;
    db.all(q, [userId, userId], async (err, files) => {
      let mailHistory = [];
      try {
        mailHistory = await getMailHistoryByUser(userId);
      } catch {}
      res.render('dashboard', { user: req.session.user, success: null, files, mailHistory });
    });
  });
};
