const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Usuario = require('../models/Usuario');
const TokenRevocado = require('../models/TokenRevocado');
const { ErrorApi } = require('../middleware/errores');

// jwtid identifica cada token para poder revocarlo al cerrar sesión
const crearToken = ({ id, nombre }) => jwt.sign({ nombre }, env.JWT_SECRET, {
  subject: String(id),
  jwtid: crypto.randomUUID(),
  expiresIn: env.JWT_EXPIRES_IN,
  algorithm: 'HS256',
});

const respuestaSesion = (usuario) => ({
  token: crearToken(usuario),
  usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
});

const registrar = async (req, res) => {
  const { nombre, email, password } = req.body;
  const usuario = await Usuario.create({ nombre, email, password });
  res.status(201).json(respuestaSesion(usuario));
};

const iniciarSesion = async (req, res) => {
  const { email, password } = req.body;
  const usuario = await Usuario.findOne({ email: email.trim().toLowerCase() }).select('+password');

  // El mismo mensaje en ambos casos: no revela si el correo existe
  if (!usuario || !(await usuario.compararPassword(password))) {
    throw new ErrorApi(401, 'Correo o contraseña incorrectos');
  }

  res.json(respuestaSesion(usuario));
};

const cerrarSesion = async (req, res) => {
  const { id, jti, exp } = req.usuario;
  await TokenRevocado.updateOne(
    { jti },
    { $setOnInsert: { jti, usuario: id, expiraEn: new Date(exp * 1000) } },
    { upsert: true },
  );
  res.json({ mensaje: 'Sesión cerrada' });
};

const perfil = async (req, res) => {
  const usuario = await Usuario.findById(req.usuario.id);
  if (!usuario) throw new ErrorApi(401, 'Tu sesión no es válida o ya expiró');
  res.json({ id: usuario.id, nombre: usuario.nombre, email: usuario.email });
};

module.exports = { registrar, iniciarSesion, cerrarSesion, perfil, crearToken };
