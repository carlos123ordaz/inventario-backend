const express = require('express');
const router = express.Router();
const autoAsignacionController = require('../controllers/AutoAsignacion');

router.post('/auto-asignar', autoAsignacionController.autoAsignarEquipo);
router.get('/previsualizar/:serie', autoAsignacionController.previsualizarEquipo);

module.exports = router;