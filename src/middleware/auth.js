const jwt = require('jsonwebtoken');
const env = require('../config/env');
const TokenRevocado = require('../models/TokenRevocado');
const { ErrorApi } = require('./errores');

// Protege una ruta: exige "Authorization: Bearer <token>" con un JWT válido y no revocado
const requiereAuth = async (req, res, next) => {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    return next(new ErrorApi(401, 'Debes iniciar sesión para realizar esta operación'));
  }

  let datos;
  try {
    datos = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return next(new ErrorApi(401, 'Tu sesión no es válida o ya expiró'));
  }

  try {
    if (await TokenRevocado.exists({ jti: datos.jti })) {
      return next(new ErrorApi(401, 'La sesión fue cerrada; inicia sesión de nuevo'));
    }
  } catch (error) {
    return next(error);
  }

  req.usuario = { id: datos.sub, nombre: datos.nombre, jti: datos.jti, exp: datos.exp };
  return next();
};

module.exports = requiereAuth;
