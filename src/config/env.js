// Lee las variables de entorno. En local vienen de .env; en Vercel, de la configuración del proyecto.
require('dotenv').config({ quiet: true });

const obligatorias = ['MONGODB_URI', 'JWT_SECRET'];

const faltantes = () => obligatorias.filter((nombre) => !process.env[nombre]);

module.exports = {
  get PORT() { return Number(process.env.PORT) || 3000; },
  get MONGODB_URI() { return process.env.MONGODB_URI; },
  get JWT_SECRET() { return process.env.JWT_SECRET; },
  get JWT_EXPIRES_IN() { return process.env.JWT_EXPIRES_IN || '2h'; },
  faltantes,
};
