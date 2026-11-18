const path = require('path');
const express = require('express');
const requiereDB = require('./middleware/db');
const authRoutes = require('./routes/auth.routes');
const productosRoutes = require('./routes/productos.routes');
const { rutaNoEncontrada, manejadorErrores } = require('./middleware/errores');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
// En Vercel la carpeta public la sirve su CDN; en local la sirve Express
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));

app.use('/api', requiereDB);
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);

// Deben ir al final para atrapar lo que ninguna ruta atendió
app.use('/api', rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
