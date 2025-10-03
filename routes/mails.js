const path = require('path');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const db = require('../db/db');
const { getFileById } = require('../models/fileModel');
const { getMailHistoryByUser } = require('../models/mailModel');
const { ensureAuth } = require('../middlewares/auth');
const { nowISO } = require('../utils');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nahuel.i.furones@gmail.com',
    pass: 'euwt bcou jslj cgrg'
  }
});

module.exports = function(app) {
  app.post('/files/:id/email', async (req, res) => {
    const fileId = req.params.id;
    const { targetEmail } = req.body;
    const user = req.session.user;
    try {
      const file = await getFileById(fileId);
      if (!file) return res.status(404).send('Archivo no encontrado');

      const filePath = path.join(__dirname, '..', 'uploads', file.stored_name);

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
        db.run(
          `INSERT INTO mail_history(sender_id, file_id, target_email, sent_at) VALUES (?, ?, ?, ?)`,
          [user.id, fileId, targetEmail, nowISO()],
          ()=> {
            console.log('Correo enviado: ' + info.response);
            res.redirect('/dashboard');
          }
        );
      });
    } catch (err) {
      res.status(500).send('Error en la base de datos');
    }
  });

  app.post('/crear-pdf-personalizado', ensureAuth, async (req, res) => {
    const userId = req.session.user.id;
    let mailHistory = [];
    try {
      mailHistory = await getMailHistoryByUser(userId);
    } catch (err) {
      return res.status(500).send('Error obteniendo historial de emails');
    }

    let fileName = 'historial_emails.pdf';
    const logoPath = path.join(__dirname, '..', 'public', 'src', 'chacabuco_logo.png');
    const titulo = 'Historial de Emails Enviados';
    const azul = '#003366';
    const rojo = '#c62828';

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    let buffers = [];
    let responded = false;

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      if (responded) return;
      responded = true;
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.end(pdfData);
    });

    doc.on('error', (err) => {
      if (!responded) {
        responded = true;
        if (!res.headersSent) res.status(500).send('Error generando PDF');
      }
    });

    function safeAddHeader(doc) {
      try {
        const logoWidth = 60;
        const logoHeight = 50;
        const marginTop = 30;
        const marginLeft = 50;
        const marginRight = 50;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        // Borde azul alrededor de la página
        doc.save();
        doc.lineWidth(6).strokeColor(azul);
        doc.moveTo(0, 0).lineTo(pageWidth, 0)
           .lineTo(pageWidth, pageHeight)
           .lineTo(0, pageHeight)
           .lineTo(0, 0)
           .stroke();
        doc.restore();

        // Logo a la derecha
        let logoY = marginTop - 5;
        if (fs.existsSync(logoPath)) {
          doc.image(
            logoPath,
            pageWidth - logoWidth - marginRight,
            logoY,
            { width: logoWidth, height: logoHeight }
          );
        }

        // Título alineado con el logo
        const titleFontSize = 18;
        doc.fontSize(titleFontSize).fillColor(azul);
        const titleHeight = doc.heightOfString(titulo, { width: pageWidth - logoWidth - marginLeft - marginRight });
        const titleY = logoY + (logoHeight - titleHeight) / 2;
        doc.text(
          titulo,
          marginLeft,
          titleY,
          { align: 'left' }
        );

        // Línea roja debajo del encabezado
        doc.save();
        doc.moveTo(marginLeft, marginTop + logoHeight + 10)
           .lineTo(pageWidth - marginRight, marginTop + logoHeight + 10)
           .lineWidth(3)
           .strokeColor(rojo)
           .stroke();
        doc.restore();

        // Ajuste para el inicio del contenido
        doc.y = Math.max(doc.y, marginTop + logoHeight + 30);
      } catch (e) {
        doc.moveDown(2.5);
      }
    }

    safeAddHeader(doc);
    doc.fontSize(12).fillColor(azul).text(`Usuario: ${req.session.user.nombre}`);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`);
    doc.moveDown();

    if (!mailHistory || mailHistory.length === 0) {
      doc.fontSize(12).fillColor(azul).text('No has enviado archivos por mail aún.');
    } else {
      mailHistory.forEach((mh, idx) => {
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
          safeAddHeader(doc);
        }
        doc.fontSize(12).fillColor('#22223b').text(
          `${idx + 1}. Archivo: `,
          { continued: true }
        );
        doc.fillColor(rojo).text(`${mh.original_name}`, { continued: true });
        doc.fillColor('#22223b').text(' Enviado a: ', { continued: true });
        doc.fillColor(azul).text(`${mh.target_email}`, { continued: true });
        doc.fillColor('#22223b').text(' Fecha: ', { continued: true });
        doc.fillColor(rojo).text(`${new Date(mh.sent_at).toLocaleString()}`);
        doc.moveDown(0.5);
      });
    }

    doc.end();

    setTimeout(() => {
      if (!responded) {
        responded = true;
        if (!res.headersSent) res.status(500).send('Timeout generando PDF');
      }
    }, 10000);
  });
};