const mongoose = require('mongoose');
const env = require('./env');

// En Vercel cada función puede reutilizar el proceso entre peticiones:
// se guarda la promesa de conexión para no abrir una nueva cada vez
let conexion = null;

const conectarDB = (uri = env.MONGODB_URI) => {
  if (!conexion) {
    conexion = mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 }).catch((error) => {
      conexion = null; // permite reintentar en la siguiente petición
      throw error;
    });
  }
  return conexion;
};

const desconectarDB = async () => {
  conexion = null;
  await mongoose.disconnect();
};

module.exports = { conectarDB, desconectarDB };
