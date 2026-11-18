const mongoose = require('mongoose');
const { CATEGORIAS } = require('../models/Producto');
const { ErrorApi } = require('./errores');

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const esTexto = (valor) => typeof valor === 'string' && valor.trim() !== '';
const esNumero = (valor) => typeof valor === 'number' && Number.isFinite(valor);

// Crea un middleware a partir de una función que devuelve la lista de errores
const validar = (reglas) => (req, res, next) => {
  const errores = reglas(req.body ?? {});
  if (errores.length > 0) return next(new ErrorApi(400, 'Datos inválidos', errores));
  return next();
};

const validarRegistro = validar(({ nombre, email, password }) => {
  const errores = [];
  if (!esTexto(nombre) || nombre.trim().length < 2) errores.push('El nombre debe tener al menos 2 caracteres');
  if (!esTexto(email) || !REGEX_EMAIL.test(email)) errores.push('El correo no es válido');
  if (typeof password !== 'string' || password.length < 8) errores.push('La contraseña debe tener al menos 8 caracteres');
  return errores;
});

// Solo se aceptan textos: evita inyecciones como { "email": { "$gt": "" } }
const validarLogin = validar(({ email, password }) => (
  esTexto(email) && esTexto(password) ? [] : ['Escribe tu correo y tu contraseña']
));

const validarProducto = validar(({ nombre, descripcion, precio, stock, categoria }) => {
  const errores = [];
  if (!esTexto(nombre)) errores.push('El nombre es obligatorio');
  else if (nombre.trim().length > 120) errores.push('El nombre no puede superar 120 caracteres');
  if (descripcion !== undefined && typeof descripcion !== 'string') errores.push('La descripción debe ser texto');
  else if (descripcion?.length > 500) errores.push('La descripción no puede superar 500 caracteres');
  if (!esNumero(precio) || precio < 0) errores.push('El precio debe ser un número mayor o igual a 0');
  if (!Number.isInteger(stock) || stock < 0) errores.push('El stock debe ser un entero mayor o igual a 0');
  if (!CATEGORIAS.includes(categoria)) errores.push(`La categoría debe ser una de: ${CATEGORIAS.join(', ')}`);
  return errores;
});

const validarId = (req, res, next) => {
  if (mongoose.isValidObjectId(req.params.id)) return next();
  return next(new ErrorApi(400, 'El identificador no es válido'));
};

module.exports = { validarRegistro, validarLogin, validarProducto, validarId };
