// Pruebas de rutas: recorren la app completa contra un MongoDB en memoria
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let app;
let desconectarDB;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('productos_test');
  process.env.JWT_SECRET = 'secreto-de-prueba';
  app = require('../../src/app');
  ({ desconectarDB } = require('../../src/config/db'));
});

afterAll(async () => {
  await desconectarDB();
  await mongo.stop();
});

const registrar = async (email) => {
  const res = await request(app).post('/api/auth/register').send({ nombre: 'Usuario', email, password: 'contrasena123' });
  return res.body.token;
};

const PRODUCTO = { nombre: 'Teclado', descripcion: 'Mecánico', precio: 899.9, stock: 5, categoria: 'Electrónica' };

describe('autenticación', () => {
  test('registro, login y perfil', async () => {
    const registro = await request(app).post('/api/auth/register')
      .send({ nombre: 'Ana', email: 'ana@test.com', password: 'contrasena123' });
    expect(registro.status).toBe(201);
    expect(registro.body.usuario).not.toHaveProperty('password');

    const duplicado = await request(app).post('/api/auth/register')
      .send({ nombre: 'Ana', email: 'ANA@test.com', password: 'contrasena123' });
    expect(duplicado.status).toBe(409);

    const malo = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'incorrecta' });
    expect(malo.status).toBe(401);

    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'contrasena123' });
    expect(login.status).toBe(200);

    const perfil = await request(app).get('/api/auth/perfil').set('Authorization', `Bearer ${login.body.token}`);
    expect(perfil.body.email).toBe('ana@test.com');
  });

  test('cerrar sesión invalida el token', async () => {
    const token = await registrar('salir@test.com');
    const conToken = (r) => r.set('Authorization', `Bearer ${token}`);

    expect((await conToken(request(app).get('/api/productos'))).status).toBe(200);
    expect((await conToken(request(app).post('/api/auth/logout'))).status).toBe(200);
    expect((await conToken(request(app).get('/api/productos'))).status).toBe(401);
  });

  test('registro con datos inválidos responde 400 con detalles', async () => {
    const res = await request(app).post('/api/auth/register').send({ nombre: 'A', email: 'mal', password: '1' });
    expect(res.status).toBe(400);
    expect(res.body.detalles).toHaveLength(3);
  });
});

describe('productos', () => {
  test('las rutas de productos exigen token', async () => {
    expect((await request(app).get('/api/productos')).status).toBe(401);
    expect((await request(app).post('/api/productos').send(PRODUCTO)).status).toBe(401);
  });

  test('CRUD completo', async () => {
    const token = await registrar('crud@test.com');
    const auth = { Authorization: `Bearer ${token}` };

    const creado = await request(app).post('/api/productos').set(auth).send(PRODUCTO);
    expect(creado.status).toBe(201);
    const { _id: id } = creado.body;

    const lista = await request(app).get('/api/productos?q=tecla').set(auth);
    expect(lista.body.map((p) => p._id)).toContain(id);
    expect(lista.body[0].creadoPor.nombre).toBe('Usuario');

    const editado = await request(app).put(`/api/productos/${id}`).set(auth).send({ ...PRODUCTO, stock: 2 });
    expect(editado.status).toBe(200);
    expect(editado.body.stock).toBe(2);

    expect((await request(app).delete(`/api/productos/${id}`).set(auth)).status).toBe(204);
    expect((await request(app).get(`/api/productos/${id}`).set(auth)).status).toBe(404);
  });

  test('solo el dueño puede modificar o eliminar', async () => {
    const dueno = { Authorization: `Bearer ${await registrar('dueno@test.com')}` };
    const otro = { Authorization: `Bearer ${await registrar('otro@test.com')}` };

    const { body: producto } = await request(app).post('/api/productos').set(dueno).send(PRODUCTO);

    expect((await request(app).get(`/api/productos/${producto._id}`).set(otro)).status).toBe(200);
    expect((await request(app).put(`/api/productos/${producto._id}`).set(otro).send(PRODUCTO)).status).toBe(403);
    expect((await request(app).delete(`/api/productos/${producto._id}`).set(otro)).status).toBe(403);
  });

  test('valida datos e identificadores', async () => {
    const auth = { Authorization: `Bearer ${await registrar('valida@test.com')}` };

    const invalido = await request(app).post('/api/productos').set(auth).send({ nombre: '', precio: 'gratis' });
    expect(invalido.status).toBe(400);
    expect((await request(app).get('/api/productos/123').set(auth)).status).toBe(400);
    expect((await request(app).get('/api/no-existe')).status).toBe(404);
  });
});
