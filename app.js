// Servidor Express con "Drive" multiusuario
const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const db = require('./db');
const { getFileById } = require('./db');

// Transport con Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nahuel.i.furones@gmail.com',   // TU CUENTA DEDICADA
    pass: 'euwt bcou jslj cgrg'      // LA APP PASSWORD DE GOOGLE
  }
}); 

const app = express();

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares básicos
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'tu_secreto', resave: false, saveUninitialized: false }));
app.use(helmet());
app.use(express.static(path.join(__dirname, 'public')));

// Define UPLOAD_DIR si no está definido
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4());
  }
});
const upload = multer({ storage });
// ---------------- Rutas ----------------
app.post('/files/:id/email', async (req, res) => {
  const fileId = req.params.id;
  const { targetEmail } = req.body;
  const user = req.session.user;

  try {
    const file = await getFileById(fileId); // <-- Usamos la función helper
    if (!file) return res.status(404).send('Archivo no encontrado');

    const filePath = path.join(UPLOAD_DIR, file.stored_name);

    const mailOptions = {
      from: 'drive.colegio@gmail.com',
      to: targetEmail,
      subject: `Archivo compartido: ${file.original_name}`,
      text: `El usuario ${user.nombre} te compartió un archivo.`,
      attachments: [
        { filename: file.original_name, path: filePath }
      ]
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error enviando correo');
      }
      console.log('Correo enviado: ' + info.response);
      res.redirect('/dashboard');
    });
  } catch (err) {
    res.status(500).send('Error en la base de datos');
  }
});

// Página principal
app.get('/', (req, res) => res.redirect('/login'));

// --------- LOGIN ----------
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email=?`, [email], (err, user) => {
    if (!user) return res.render('login', { error: 'Correo o contraseña incorrectos.' });
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.render('login', { error: 'Correo o contraseña incorrectos.' });
    }
    req.session.user = user;
    res.redirect('/dashboard');
  });
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

// --------- REGISTRO ---------
app.get('/ingreDatos', (req, res) => res.render('ingreDatos', { error: null }));
app.post('/ingreDatos', (req, res) => {
  const { tipo, nombre, dni, fecha } = req.body;
  if (!tipo || tipo === 'Seleccionar' || !nombre || !dni || dni.length !== 8 || !fecha) {
    return res.render('ingreDatos', { error: 'Completa todos los datos correctamente.' });
  }
  req.session.personalData = { tipo, nombre, dni, fecha };
  res.redirect('/crearCuenta');
});

app.get('/crearCuenta', (req, res) => {
  if (!req.session.personalData) return res.redirect('/ingreDatos');
  res.render('crearCuenta', { error: null });
});
app.post('/crearCuenta', (req, res) => {
  const { email, password, telefono } = req.body;
  const { tipo, nombre, dni, fecha } = req.session.personalData;
  const hash = bcrypt.hashSync(password, 10);
  db.run(`INSERT INTO users(tipo,nombre,dni,fecha,email,password_hash,telefono,created_at)
          VALUES(?,?,?,?,?,?,?,?)`,
          [tipo, nombre, dni, fecha, email, hash, telefono, nowISO()],
          function(err){
            if (err) return res.render('crearCuenta', { error: 'Este correo ya está registrado.' });
            req.session.personalData = null;
            res.redirect('/login');
          });
});

// --------- DASHBOARD ---------
app.get('/dashboard', ensureAuth, (req, res) => {
  const userId = req.session.user.id;
  const q = `
    SELECT f.id,f.original_name,f.size,f.created_at,u.nombre as owner_nombre,f.owner_id
    FROM files f JOIN users u ON u.id=f.owner_id
    WHERE f.owner_id=? OR f.id IN (SELECT file_id FROM permissions WHERE user_id=? AND can_read=1)
    ORDER BY f.created_at DESC`;
  db.all(q, [userId, userId], (err, files) => {
    res.render('dashboard', { user: req.session.user, success: null, files });
  });
});

// --------- SUBIR ARCHIVOS ---------
app.post('/upload', ensureAuth, upload.single('archivo'), (req, res) => {
  const userId = req.session.user.id;
  db.run(`INSERT INTO files(owner_id,original_name,stored_name,mime,size,created_at)
          VALUES(?,?,?,?,?,?)`,
          [userId, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, nowISO()],
          ()=> res.redirect('/dashboard'));
});

// --------- DESCARGA ---------
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

// --------- ELIMINAR ARCHIVOS ---------
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

// --------- COMPARTIR ARCHIVOS ---------
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

// --------- PROTECCIÓN DE RUTAS ---------
function ensureAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// Función para obtener la fecha y hora actual en formato ISO
function nowISO() {
  return new Date().toISOString();
}

// ---------------- SERVER ----------------
app.listen(3000, ()=> console.log('Servidor en http://localhost:3000'));