const { Router } = require('express');
const auth = require('../controllers/auth.controller');
const { asincrono } = require('../middleware/errores');
const { validarRegistro, validarLogin } = require('../middleware/validar');
const requiereAuth = require('../middleware/auth');

const router = Router();

router.post('/register', validarRegistro, asincrono(auth.registrar));
router.post('/login', validarLogin, asincrono(auth.iniciarSesion));
router.post('/logout', requiereAuth, asincrono(auth.cerrarSesion));
router.get('/perfil', requiereAuth, asincrono(auth.perfil));

module.exports = router;
