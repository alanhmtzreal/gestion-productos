const env = require('../config/env');
const { conectarDB } = require('../config/db');
const { ErrorApi } = require('./errores');

// Garantiza la conexión a MongoDB antes de llegar a cualquier ruta del API
const requiereDB = async (req, res, next) => {
  const faltantes = env.faltantes();
  if (faltantes.length > 0) {
    console.error(`Faltan variables de entorno: ${faltantes.join(', ')}`);
    return next(new ErrorApi(500, 'El servidor no está configurado'));
  }
  try {
    await conectarDB();
    return next();
  } catch (error) {
    console.error('No se pudo conectar a MongoDB:', error.message);
    return next(new ErrorApi(503, 'La base de datos no está disponible'));
  }
};

module.exports = requiereDB;
