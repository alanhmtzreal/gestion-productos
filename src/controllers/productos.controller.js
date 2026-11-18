const Producto = require('../models/Producto');
const { ErrorApi } = require('../middleware/errores');

// Solo estos campos se toman del cuerpo; el cliente no puede fijar creadoPor
const camposProducto = ({ nombre, descripcion = '', precio, stock, categoria }) => ({
  nombre: nombre.trim(), descripcion: descripcion.trim(), precio, stock, categoria,
});

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const listar = async (req, res) => {
  const { q, categoria } = req.query;
  const filtro = {};
  if (typeof q === 'string' && q.trim()) filtro.nombre = new RegExp(escaparRegex(q.trim()), 'i');
  if (typeof categoria === 'string' && categoria) filtro.categoria = categoria;

  const productos = await Producto.find(filtro).sort({ createdAt: -1 }).populate('creadoPor', 'nombre');
  res.json(productos);
};

const obtener = async (req, res) => {
  const producto = await Producto.findById(req.params.id).populate('creadoPor', 'nombre');
  if (!producto) throw new ErrorApi(404, 'Producto no encontrado');
  res.json(producto);
};

const crear = async (req, res) => {
  const producto = await Producto.create({ ...camposProducto(req.body), creadoPor: req.usuario.id });
  res.status(201).json(producto);
};

// Regla de negocio: solo quien creó el producto puede modificarlo o eliminarlo
const buscarPropio = async (id, usuarioId) => {
  const producto = await Producto.findById(id);
  if (!producto) throw new ErrorApi(404, 'Producto no encontrado');
  if (String(producto.creadoPor) !== String(usuarioId)) {
    throw new ErrorApi(403, 'Solo quien creó el producto puede modificarlo o eliminarlo');
  }
  return producto;
};

const actualizar = async (req, res) => {
  const producto = await buscarPropio(req.params.id, req.usuario.id);
  producto.set(camposProducto(req.body));
  await producto.save();
  res.json(producto);
};

const eliminar = async (req, res) => {
  const producto = await buscarPropio(req.params.id, req.usuario.id);
  await producto.deleteOne();
  res.status(204).end();
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
