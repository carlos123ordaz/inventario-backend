const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const equipoController = require('../controllers/Equipo');
const importExportController = require('../controllers/equipoImportExport');
const { verificarToken } = require('../middlewares/authMiddleware');

const validacionEquipo = [
  body('tipo').isIn(['LAPTOP', 'DESKTOP', 'MOUSE', 'MONITOR', 'TECLADO', 'COOLER', 'CELULAR', 'OTRO']).withMessage('Tipo de equipo inválido'),
  body('marca').notEmpty().withMessage('La marca es requerida'),
  body('modelo').notEmpty().withMessage('El modelo es requerido'),
  body('serie').notEmpty().withMessage('El número de serie es requerido'),
];

router.use(verificarToken);

// Rutas específicas PRIMERO
router.get('/estadisticas', equipoController.obtenerEstadisticas);
router.get('/campos-mapeo', importExportController.obtenerCamposMapeo);
router.get('/exportar', importExportController.exportarEquipos);
router.post('/previsualizar-csv', importExportController.uploadMiddleware, importExportController.previsualizarCSV);
router.post('/importar', importExportController.uploadMiddleware, importExportController.importarEquipos);

// Rutas con parámetros al final
router.get('/', equipoController.obtenerEquipos);
router.get('/:id', equipoController.obtenerEquipoPorId);
router.post('/', validacionEquipo, equipoController.crearEquipo);
router.put('/:id', equipoController.actualizarEquipo);
router.delete('/:id', equipoController.eliminarEquipo);

module.exports = router;