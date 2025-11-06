// routes/actas.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body } = require('express-validator');
const actaController = require('../controllers/Acta');

// Configuración de multer para subir archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .docx'));
    }
  }
});

// Validaciones
const validacionActa = [
  body('titulo').notEmpty().withMessage('El título es requerido'),
  body('descripcion').optional()
];

const validacionGenerarActa = [
  body('actaId').notEmpty().withMessage('El ID del acta es requerido'),
  body('usuarioId').notEmpty().withMessage('El ID del usuario es requerido'),
  body('equipoId').optional(),
  body('historialId').optional(),
  body('observaciones').optional()
];

// Rutas
router.get('/', actaController.obtenerActas);
router.get('/estadisticas', actaController.obtenerEstadisticas);
router.get('/generadas', actaController.obtenerActasGeneradas);
router.get('/:id', actaController.obtenerActaPorId);
router.post('/', upload.single('archivo'), validacionActa, actaController.crearActa);
router.put('/:id', actaController.actualizarActa);
router.delete('/:id', actaController.eliminarActa);
router.post('/generar', validacionGenerarActa, actaController.generarActa);

module.exports = router;