// Ejecución local: npm start
const app = require('./src/app');
const env = require('./src/config/env');

const faltantes = env.faltantes();
if (faltantes.length > 0) {
  console.error(`Faltan variables de entorno: ${faltantes.join(', ')}. Copia .env.example como .env`);
  process.exit(1);
}

app.listen(env.PORT, () => {
  console.log(`Servidor en http://localhost:${env.PORT}`);
});
