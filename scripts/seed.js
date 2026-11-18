// Carga datos de ejemplo (npm run seed). Se puede ejecutar varias veces sin duplicar.
const env = require('../src/config/env');
const { conectarDB, desconectarDB } = require('../src/config/db');
const Usuario = require('../src/models/Usuario');
const Producto = require('../src/models/Producto');

const PRODUCTOS = [
  { nombre: 'Audífonos inalámbricos', descripcion: 'Bluetooth 5.3, 30 horas de batería', precio: 649, stock: 12, categoria: 'Electrónica' },
  { nombre: 'Termo de acero', descripcion: '750 ml, mantiene la temperatura 12 horas', precio: 289.5, stock: 25, categoria: 'Hogar' },
  { nombre: 'Cuaderno profesional', descripcion: '100 hojas, cuadro chico', precio: 42, stock: 80, categoria: 'Papelería' },
  { nombre: 'Playera deportiva', descripcion: 'Tela transpirable, talla M', precio: 199, stock: 18, categoria: 'Ropa' },
  { nombre: 'Balón de fútbol', descripcion: 'Tamaño 5, cosido a máquina', precio: 349, stock: 7, categoria: 'Deportes' },
];

const sembrar = async () => {
  if (env.faltantes().length > 0) throw new Error('Configura MONGODB_URI y JWT_SECRET en .env');
  const { SEED_EMAIL: email, SEED_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('Define SEED_EMAIL y SEED_PASSWORD en .env');

  await conectarDB();
  let usuario = await Usuario.findOne({ email });
  if (!usuario) usuario = await Usuario.create({ nombre: 'Administrador', email, password });

  await Promise.all(PRODUCTOS.map((producto) => Producto.updateOne(
    { nombre: producto.nombre },
    { $setOnInsert: { ...producto, creadoPor: usuario.id } },
    { upsert: true },
  )));
  console.log(`Listo: usuario ${email} y ${PRODUCTOS.length} productos de ejemplo.`);
};

sembrar()
  .catch((error) => {
    console.error('Error al cargar los datos:', error.message);
    process.exitCode = 1;
  })
  .finally(desconectarDB);
