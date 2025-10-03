const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const db = require('../db/db');
const { getFileById } = require('../models/fileModel');
const { ensureAuth } = require('../middlewares/auth');
const { nowISO } = require('../utils');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4());
  }
});
const upload = multer({ storage });

module.exports = function(app) {
  app.post('/upload', ensureAuth, upload.single('archivo'), (req, res) => {
    const userId = req.session.user.id;
    db.run(`INSERT INTO files(owner_id,original_name,stored_name,mime,size,created_at)
            VALUES(?,?,?,?,?,?)`,
            [userId, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, nowISO()],
            ()=> res.redirect('/dashboard'));
  });

  app.get('/files/:id/download', ensureAuth, (req, res) => {
    const fileId = req.params.id, userId = req.session.user.id;
    db.get(`SELECT * FROM files WHERE id=?`, [fileId], (err, file) => {
      if (!file) return res.status(404).send('No encontrado');
      if (file.owner_id === userId) return res.download(path.join(UPLOAD_DIR, file.stored_name), file.original_name);
      db.get(`SELECT * FROM permissions WHERE file_id=? AND user_id=? AND can_read=1`, [fileId, userId], (e, perm) => {
        if (!perm) return res.status(403).send('Sin permiso');
        res.download(path.join(UPLOAD_DIR, file.stored_name), file.original_name);
      });
    });
  });

  app.post('/files/:id/delete', ensureAuth, (req, res) => {
    const fileId = req.params.id, userId = req.session.user.id;
    db.get(`SELECT * FROM files WHERE id=?`, [fileId], (err, file) => {
      if (!file) return res.status(404).send('No encontrado');
      if (file.owner_id !== userId) return res.status(403).send('Sin permiso');
      db.run(`DELETE FROM files WHERE id=?`, [fileId], err2 => {
        if (!err2) {
          fs.unlink(path.join(UPLOAD_DIR, file.stored_name), ()=>{});
          return res.redirect('/dashboard');
        }
        res.status(500).send('Error al eliminar');
      });
    });
  });

  app.post('/files/:id/share', ensureAuth, (req, res) => {
    const fileId = req.params.id;
    const { targetEmail, read, write, del, share } = req.body;
    const userId = req.session.user.id;

    db.get(`SELECT * FROM files WHERE id=?`, [fileId], (err, file) => {
      if (!file || file.owner_id !== userId) return res.status(403).send('No autorizado');
      db.get(`SELECT * FROM users WHERE email=?`, [targetEmail], (e, target) => {
        if (!target) return res.status(404).send('Usuario no encontrado');
        db.run(`INSERT INTO permissions(file_id,user_id,can_read,can_write,can_delete,can_share)
                VALUES(?,?,?,?,?,?)
                ON CONFLICT(file_id,user_id) DO UPDATE SET
                  can_read=?, can_write=?, can_delete=?, can_share=?`,
          [fileId, target.id, read, write, del, share, read, write, del, share],
          ()=> res.sendStatus(200));
      });
    });
  });
};