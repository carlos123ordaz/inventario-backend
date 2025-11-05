const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const equipoController = require('../controllers/Equipo');


const validacionEquipo = [
  body('equipo').isIn(['Laptop', 'Desktop']).withMessage('Tipo de equipo inválido'),
  body('marca').notEmpty().withMessage('La marca es requerida'),
  body('modelo').notEmpty().withMessage('El modelo es requerido'),
  body('serie').notEmpty().withMessage('El número de serie es requerido'),
  body('host').notEmpty().withMessage('El host es requerido'),
  body('fechaCompra').isISO8601().withMessage('Fecha de compra inválida'),
  body('procesador').notEmpty().withMessage('El procesador es requerido'),
  body('almacenamiento').notEmpty().withMessage('El almacenamiento es requerido'),
  body('memoria').notEmpty().withMessage('La memoria es requerida')
];

// Rutas
router.get('/', equipoController.obtenerEquipos);
router.get('/estadisticas', equipoController.obtenerEstadisticas);
router.get('/buscar', equipoController.buscarEquipos);
router.get('/:id', equipoController.obtenerEquipoPorId);
router.post('/', validacionEquipo, equipoController.crearEquipo);
router.put('/:id', equipoController.actualizarEquipo);
router.delete('/:id', equipoController.eliminarEquipo);

module.exports = router;