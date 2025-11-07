const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const usuarioController = require('../controllers/Usuario');
const { verificarToken } = require('../middlewares/authMiddleware');

const validacionUsuario = [
  body('dni').notEmpty().withMessage('El DNI es requerido'),
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('apellido').notEmpty().withMessage('El apellido es requerido'),
  body('cargo').notEmpty().withMessage('El cargo es requerido'),
  body('area').notEmpty().withMessage('El área es requerida'),
  body('correo').isEmail().withMessage('Debe proporcionar un correo válido'),
  body('telefono').notEmpty().withMessage('El teléfono es requerido'),
  body('usuario').notEmpty().withMessage('El usuario es requerido'),
  body('iniciales').notEmpty().withMessage('Las iniciales son requeridas')
];

router.use(verificarToken)
router.get('/buscar', usuarioController.buscarUsuarios);
router.get('/:id/historial', usuarioController.obtenerHistorialUsuario);
router.get('/:id', usuarioController.obtenerUsuarioPorId);
router.get('/', usuarioController.obtenerUsuarios);

router.post('/', validacionUsuario, usuarioController.crearUsuario);
router.put('/:id', usuarioController.actualizarUsuario);
router.delete('/:id', usuarioController.eliminarUsuario);

module.exports = router;