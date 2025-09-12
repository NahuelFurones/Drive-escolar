const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const path = require('path');
const { getFileById } = require('../db');

// Render the login page
router.get('/login', (req, res) => {
    res.render('login');
});

// Render the account creation page
router.get('/crearCuenta', (req, res) => {
    res.render('crearCuenta');
});

// Render the data input page
router.get('/ingreDatos', (req, res) => {
    res.render('ingreDatos');
});

// Render the dashboard page
router.get('/dashboard', (req, res) => {
    const user = req.session.user; // Assuming user data is stored in session
    if (!user) {
        return res.redirect('/login');
    }
    res.render('dashboard', { user });
});

router.post('/files/:id/email', async (req, res) => {
  const fileId = req.params.id;
  const targetEmail = req.body.targetEmail;

  try {
    const file = await getFileById(fileId);
    if (!file) return res.status(404).send('Archivo no encontrado');

    // Configura el transporter de Nodemailer (usa tu cuenta Gmail)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'nahuel.i.furones@gmail.com',
        pass: 'dwww vapx emid nzgj' // Usa una App Password de Google
      }
    });

    // Prepara el archivo adjunto
    const filePath = path.join(__dirname, '../uploads', file.id);
    const mailOptions = {
      from: 'nahuel.i.furones@gmail.com',
      to: targetEmail,
      subject: `Archivo compartido: ${file.original_name}`,
      text: `Te compartieron el archivo "${file.original_name}"`,
      attachments: [
        {
          filename: file.original_name,
          path: filePath
        }
      ]
    };

    // Envía el email
    await transporter.sendMail(mailOptions);
    res.send('Email enviado correctamente');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error enviando email');
  }
});


module.exports = router;