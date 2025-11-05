const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const historialController = require('../controllers/Historial');

const validacionAsignacion = [
  body('equipoId').notEmpty().withMessage('El ID del equipo es requerido'),
  body('usuarioId').notEmpty().withMessage('El ID del usuario es requerido'),
  body('tipoUso').optional().isIn(['Asignación Definitiva', 'Préstamo Temporal', 'Uso en Proyecto', 'Reemplaza temporal'])
];                                 

const validacionTransferencia = [
  body('equipoId').notEmpty().withMessage('El ID del equipo es requerido'),
  body('nuevoUsuarioId').notEmpty().withMessage('El ID del nuevo usuario es requerido')
];

router.get('/', historialController.obtenerHistorial);
router.get('/activos', historialController.obtenerAsignacionesActivas);
router.get('/estadisticas', historialController.obtenerEstadisticasHistorial);
router.get('/:id', historialController.obtenerAsignacionPorId);
router.post('/asignar', validacionAsignacion, historialController.asignarEquipo);
router.post('/transferir', validacionTransferencia, historialController.transferirEquipo);
router.patch('/devolver/:historialId', historialController.devolverEquipo);
router.patch('/devolver-equipo/:equipoId', historialController.devolverEquipoPorId);

module.exports = router;