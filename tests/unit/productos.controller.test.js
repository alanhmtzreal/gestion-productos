// Pruebas unitarias del controlador de productos: el modelo de Mongoose se reemplaza por un mock
jest.mock('../../src/models/Producto', () => {
  const Modelo = { find: jest.fn(), findById: jest.fn(), create: jest.fn() };
  Modelo.CATEGORIAS = ['Electrónica', 'Hogar', 'Ropa', 'Alimentos', 'Papelería', 'Deportes', 'Otros'];
  return Modelo;
});

const Producto = require('../../src/models/Producto');
const controlador = require('../../src/controllers/productos.controller');

const USUARIO = '64b000000000000000000001';
const OTRO = '64b000000000000000000002';

const respuestaFalsa = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
};

// find().sort().populate() y findById().populate() devuelven promesas encadenadas
const consulta = (resultado) => {
  const q = { sort: jest.fn(() => q), populate: jest.fn(() => Promise.resolve(resultado)) };
  return q;
};

beforeEach(() => jest.clearAllMocks());

describe('listar', () => {
  test('devuelve todos los productos sin filtros', async () => {
    const lista = [{ nombre: 'Lápiz' }];
    Producto.find.mockReturnValue(consulta(lista));
    const res = respuestaFalsa();

    await controlador.listar({ query: {} }, res);

    expect(Producto.find).toHaveBeenCalledWith({});
    expect(res.json).toHaveBeenCalledWith(lista);
  });

  test('busca por nombre sin distinguir mayúsculas y escapa caracteres especiales', async () => {
    Producto.find.mockReturnValue(consulta([]));

    await controlador.listar({ query: { q: 'usb (3.0)', categoria: 'Electrónica' } }, respuestaFalsa());

    const filtro = Producto.find.mock.calls[0][0];
    expect(filtro.categoria).toBe('Electrónica');
    expect(filtro.nombre).toBeInstanceOf(RegExp);
    expect(filtro.nombre.test('Memoria USB (3.0)')).toBe(true);
    expect(filtro.nombre.test('usb 30')).toBe(false);
  });

  test('ignora un filtro que no sea texto (intento de inyección)', async () => {
    Producto.find.mockReturnValue(consulta([]));

    await controlador.listar({ query: { q: { $ne: null } } }, respuestaFalsa());

    expect(Producto.find).toHaveBeenCalledWith({});
  });
});

describe('obtener', () => {
  test('responde el producto encontrado', async () => {
    const producto = { nombre: 'Taza' };
    Producto.findById.mockReturnValue(consulta(producto));
    const res = respuestaFalsa();

    await controlador.obtener({ params: { id: 'abc' } }, res);

    expect(res.json).toHaveBeenCalledWith(producto);
  });

  test('lanza 404 si no existe', async () => {
    Producto.findById.mockReturnValue(consulta(null));

    await expect(controlador.obtener({ params: { id: 'abc' } }, respuestaFalsa()))
      .rejects.toMatchObject({ status: 404 });
  });
});

describe('crear', () => {
  test('asigna el usuario de la sesión e ignora creadoPor del cuerpo', async () => {
    Producto.create.mockImplementation(async (datos) => ({ _id: 'nuevo', ...datos }));
    const res = respuestaFalsa();
    const body = { nombre: '  Cuaderno  ', precio: 35, stock: 10, categoria: 'Papelería', creadoPor: OTRO };

    await controlador.crear({ body, usuario: { id: USUARIO } }, res);

    expect(Producto.create).toHaveBeenCalledWith({
      nombre: 'Cuaderno', descripcion: '', precio: 35, stock: 10, categoria: 'Papelería', creadoPor: USUARIO,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('actualizar y eliminar', () => {
  const productoGuardado = (creadoPor) => ({
    creadoPor, set: jest.fn(), save: jest.fn().mockResolvedValue(), deleteOne: jest.fn().mockResolvedValue(),
  });
  const body = { nombre: 'Mouse', descripcion: 'Inalámbrico', precio: 250, stock: 4, categoria: 'Electrónica' };

  test('el dueño puede actualizar', async () => {
    const producto = productoGuardado(USUARIO);
    Producto.findById.mockResolvedValue(producto);
    const res = respuestaFalsa();

    await controlador.actualizar({ params: { id: 'p1' }, body, usuario: { id: USUARIO } }, res);

    expect(producto.set).toHaveBeenCalledWith(body);
    expect(producto.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(producto);
  });

  test('otro usuario recibe 403 y no se guarda nada', async () => {
    const producto = productoGuardado(USUARIO);
    Producto.findById.mockResolvedValue(producto);

    await expect(controlador.actualizar({ params: { id: 'p1' }, body, usuario: { id: OTRO } }, respuestaFalsa()))
      .rejects.toMatchObject({ status: 403 });
    expect(producto.save).not.toHaveBeenCalled();
  });

  test('el dueño puede eliminar y responde 204', async () => {
    const producto = productoGuardado(USUARIO);
    Producto.findById.mockResolvedValue(producto);
    const res = respuestaFalsa();

    await controlador.eliminar({ params: { id: 'p1' }, usuario: { id: USUARIO } }, res);

    expect(producto.deleteOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });

  test('eliminar un producto inexistente lanza 404', async () => {
    Producto.findById.mockResolvedValue(null);

    await expect(controlador.eliminar({ params: { id: 'p1' }, usuario: { id: USUARIO } }, respuestaFalsa()))
      .rejects.toMatchObject({ status: 404 });
  });
});
