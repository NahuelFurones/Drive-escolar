// Servidor Express con "Drive" multiusuario
const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const db = require('./db/db');
const middlewares = require('./middlewares/middlewares');
const routes = require('./routes/routes');

const app = express();

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares básicos
middlewares(app);

// Rutas
routes(app);

app.listen(3000, ()=> console.log('Servidor en http://localhost:3000'));

// Función para obtener la fecha y hora actual en formato ISO
function nowISO() {
  return new Date().toISOString();
}