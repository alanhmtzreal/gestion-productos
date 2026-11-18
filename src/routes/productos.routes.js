const { Router } = require('express');
const productos = require('../controllers/productos.controller');
const { asincrono } = require('../middleware/errores');
const { validarProducto, validarId } = require('../middleware/validar');
const requiereAuth = require('../middleware/auth');

const router = Router();

// Todas las operaciones de productos requieren sesión
router.use(requiereAuth);

router.get('/', asincrono(productos.listar));
router.get('/:id', validarId, asincrono(productos.obtener));
router.post('/', validarProducto, asincrono(productos.crear));
router.put('/:id', validarId, validarProducto, asincrono(productos.actualizar));
router.delete('/:id', validarId, asincrono(productos.eliminar));

module.exports = router;
