// Pruebas unitarias de autenticación: controlador y middleware con modelos simulados
process.env.JWT_SECRET = 'secreto-de-prueba';

jest.mock('../../src/models/Usuario', () => ({ create: jest.fn(), findOne: jest.fn(), findById: jest.fn() }));
jest.mock('../../src/models/TokenRevocado', () => ({ exists: jest.fn(), updateOne: jest.fn() }));

const jwt = require('jsonwebtoken');
const Usuario = require('../../src/models/Usuario');
const TokenRevocado = require('../../src/models/TokenRevocado');
const auth = require('../../src/controllers/auth.controller');
const requiereAuth = require('../../src/middleware/auth');
const { validarProducto, validarLogin } = require('../../src/middleware/validar');

const respuestaFalsa = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('controlador de autenticación', () => {
  test('registrar responde 201 con token y sin contraseña', async () => {
    Usuario.create.mockResolvedValue({ id: 'u1', nombre: 'Ana', email: 'ana@test.com' });
    const res = respuestaFalsa();

    await auth.registrar({ body: { nombre: 'Ana', email: 'ana@test.com', password: 'secreta123' } }, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const cuerpo = res.json.mock.calls[0][0];
    expect(jwt.verify(cuerpo.token, 'secreto-de-prueba').sub).toBe('u1');
    expect(JSON.stringify(cuerpo)).not.toContain('secreta123');
  });

  test('iniciarSesion con contraseña incorrecta lanza 401', async () => {
    const usuario = { compararPassword: jest.fn().mockResolvedValue(false) };
    Usuario.findOne.mockReturnValue({ select: () => Promise.resolve(usuario) });

    await expect(auth.iniciarSesion({ body: { email: 'ana@test.com', password: 'mala' } }, respuestaFalsa()))
      .rejects.toMatchObject({ status: 401 });
  });

  test('iniciarSesion busca el correo en minúsculas', async () => {
    Usuario.findOne.mockReturnValue({ select: () => Promise.resolve(null) });

    await expect(auth.iniciarSesion({ body: { email: ' ANA@Test.com ', password: 'x' } }, respuestaFalsa()))
      .rejects.toMatchObject({ status: 401 });
    expect(Usuario.findOne).toHaveBeenCalledWith({ email: 'ana@test.com' });
  });

  test('cerrarSesion guarda el identificador del token hasta su vencimiento', async () => {
    const res = respuestaFalsa();

    await auth.cerrarSesion({ usuario: { id: 'u1', jti: 'abc', exp: 2000000000 } }, res);

    expect(TokenRevocado.updateOne).toHaveBeenCalledWith(
      { jti: 'abc' },
      { $setOnInsert: { jti: 'abc', usuario: 'u1', expiraEn: new Date(2000000000 * 1000) } },
      { upsert: true },
    );
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'Sesión cerrada' });
  });
});

describe('middleware requiereAuth', () => {
  const ejecutar = async (authorization) => {
    const req = { headers: { authorization } };
    const next = jest.fn();
    await requiereAuth(req, {}, next);
    return { req, error: next.mock.calls[0][0] };
  };

  test('sin token responde 401', async () => {
    const { error } = await ejecutar(undefined);
    expect(error.status).toBe(401);
  });

  test('con token firmado con otro secreto responde 401', async () => {
    const token = jwt.sign({ nombre: 'X' }, 'otro-secreto', { subject: 'u1', jwtid: 'j1' });
    const { error } = await ejecutar(`Bearer ${token}`);
    expect(error.status).toBe(401);
  });

  test('con token revocado responde 401', async () => {
    TokenRevocado.exists.mockResolvedValue({ _id: 'x' });
    const token = auth.crearToken({ id: 'u1', nombre: 'Ana' });
    const { error } = await ejecutar(`Bearer ${token}`);
    expect(error.status).toBe(401);
  });

  test('con token válido deja pasar y guarda el usuario', async () => {
    TokenRevocado.exists.mockResolvedValue(null);
    const token = auth.crearToken({ id: 'u1', nombre: 'Ana' });
    const { req, error } = await ejecutar(`Bearer ${token}`);
    expect(error).toBeUndefined();
    expect(req.usuario).toMatchObject({ id: 'u1', nombre: 'Ana' });
  });
});

describe('middleware de validación', () => {
  const validar = (middleware, body) => {
    const next = jest.fn();
    middleware({ body }, {}, next);
    return next.mock.calls[0][0];
  };

  test('validarProducto acepta un producto correcto', () => {
    expect(validar(validarProducto, { nombre: 'Taza', precio: 80, stock: 3, categoria: 'Hogar' })).toBeUndefined();
  });

  test('validarProducto lista todos los errores', () => {
    const error = validar(validarProducto, { nombre: '', precio: -1, stock: 1.5, categoria: 'Juguetes' });
    expect(error.status).toBe(400);
    expect(error.detalles).toHaveLength(4);
  });

  test('validarLogin rechaza objetos en lugar de texto', () => {
    expect(validar(validarLogin, { email: { $gt: '' }, password: 'x' }).status).toBe(400);
  });
});
