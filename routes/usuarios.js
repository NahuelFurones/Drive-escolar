const bcrypt = require('bcryptjs');
const db = require('../db/db');
const { nowISO } = require('../utils');

module.exports = function(app) {
  app.get('/', (req, res) => res.redirect('/login'));

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
};