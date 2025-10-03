const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares y estáticos
require('./middlewares/middlewares')(app);

// Rutas separadas (nombres en español)
require('./routes/usuarios')(app);
require('./routes/archivos')(app);
require('./routes/mails')(app);
require('./routes/panel')(app);

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));