const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const path = require('path');
const { getFileById } = require('../db');

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/crearCuenta', (req, res) => {
    res.render('crearCuenta');
});

router.get('/ingreDatos', (req, res) => {
    res.render('ingreDatos');
});

router.get('/dashboard', (req, res) => {
    const user = req.session.user;
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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'nahuel.i.furones@gmail.com',
        pass: 'dwww vapx emid nzgj'
      }
    });

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

    await transporter.sendMail(mailOptions);
    res.send('Email enviado correctamente');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error enviando email');
  }
});


module.exports = router;