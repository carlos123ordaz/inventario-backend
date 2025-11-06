// controllers/Acta.js
const Acta = require('../models/Acta');
const ActaGenerada = require('../models/ActaGenerada');
const Usuario = require('../models/Usuario');
const Equipo = require('../models/Equipo');
const Historial = require('../models/Historial');
const { validationResult } = require('express-validator');
const GCSHelper = require('../utils/gcsHelper');
const DocxProcessor = require('../utils/docxProcessor');

// Obtener todas las actas
exports.obtenerActas = async (req, res) => {
  try {
    const { estado, page = 1, limit = 10 } = req.query;
    let filtro = {};
    
    if (estado) filtro.estado = estado;
    
    const actas = await Acta.find(filtro)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Acta.countDocuments(filtro);
    
    res.json({
      success: true,
      data: actas,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener actas',
      error: error.message
    });
  }
};

// Obtener acta por ID
exports.obtenerActaPorId = async (req, res) => {
  try {
    const acta = await Acta.findById(req.params.id);
    
    if (!acta) {
      return res.status(404).json({
        success: false,
        message: 'Acta no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: acta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener acta',
      error: error.message
    });
  }
};

// Crear acta (subir template)
exports.crearActa = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Debe subir un archivo'
      });
    }

    // Validar que sea un archivo Word
    if (!req.file.originalname.match(/\.(docx)$/)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se permiten archivos .docx'
      });
    }

    // Subir archivo a Google Cloud Storage
    const fileData = await GCSHelper.uploadTemplate(req.file);

    // Extraer campos del documento
    const campos = await DocxProcessor.extractFields(req.file.buffer);

    // Crear mapeo automático basado en los campos encontrados
    const mapeo = {};
    campos.forEach(campo => {
      const nombreLower = campo.nombre.toLowerCase();
      
      // Mapeo automático de campos comunes
      if (nombreLower.includes('nombre') && nombreLower.includes('completo')) {
        mapeo.usuario_nombreCompleto = campo.nombre;
      } else if (nombreLower.includes('nombre')) {
        mapeo.usuario_nombre = campo.nombre;
      } else if (nombreLower.includes('apellido')) {
        mapeo.usuario_apellido = campo.nombre;
      } else if (nombreLower.includes('dni')) {
        mapeo.usuario_dni = campo.nombre;
      } else if (nombreLower.includes('cargo')) {
        mapeo.usuario_cargo = campo.nombre;
      } else if (nombreLower.includes('area')) {
        mapeo.usuario_area = campo.nombre;
      } else if (nombreLower.includes('correo') || nombreLower.includes('email')) {
        mapeo.usuario_correo = campo.nombre;
      } else if (nombreLower.includes('telefono') || nombreLower.includes('celular')) {
        mapeo.usuario_telefono = campo.nombre;
      } else if (nombreLower.includes('marca')) {
        mapeo.equipo_marca = campo.nombre;
      } else if (nombreLower.includes('modelo')) {
        mapeo.equipo_modelo = campo.nombre;
      } else if (nombreLower.includes('serie')) {
        mapeo.equipo_serie = campo.nombre;
      } else if (nombreLower.includes('host')) {
        mapeo.equipo_host = campo.nombre;
      } else if (nombreLower.includes('fecha') && nombreLower.includes('actual')) {
        mapeo.fecha_actual = campo.nombre;
      }
    });

    // Crear acta
    const acta = await Acta.create({
      titulo: req.body.titulo,
      descripcion: req.body.descripcion || '',
      archivoUrl: fileData.url,
      archivoNombre: fileData.filename,
      archivoPath: fileData.path,
      bucketName: fileData.bucketName,
      camposIdentificados: campos,
      mapeo: req.body.mapeo || mapeo
    });

    res.status(201).json({
      success: true,
      message: 'Acta creada exitosamente',
      data: acta
    });
  } catch (error) {
    console.error('Error al crear acta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear acta',
      error: error.message
    });
  }
};

// Actualizar acta
exports.actualizarActa = async (req, res) => {
  try {
    const acta = await Acta.findByIdAndUpdate(
      req.params.id,
      {
        titulo: req.body.titulo,
        descripcion: req.body.descripcion,
        estado: req.body.estado,
        mapeo: req.body.mapeo
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!acta) {
      return res.status(404).json({
        success: false,
        message: 'Acta no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Acta actualizada exitosamente',
      data: acta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar acta',
      error: error.message
    });
  }
};

// Eliminar acta
exports.eliminarActa = async (req, res) => {
  try {
    const acta = await Acta.findById(req.params.id);
    
    if (!acta) {
      return res.status(404).json({
        success: false,
        message: 'Acta no encontrada'
      });
    }

    // Eliminar archivo de GCS
    try {
      await GCSHelper.deleteFile(acta.bucketName, acta.archivoNombre);
    } catch (error) {
      console.error('Error al eliminar archivo de GCS:', error);
    }

    await acta.deleteOne();
    
    res.json({
      success: true,
      message: 'Acta eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar acta',
      error: error.message
    });
  }
};

// Generar acta para un usuario (con o sin equipo)
exports.generarActa = async (req, res) => {
  try {
    const { actaId, usuarioId, equipoId, historialId, observaciones } = req.body;

    // Validar que exista el acta
    const acta = await Acta.findById(actaId);
    if (!acta) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla de acta no encontrada'
      });
    }

    // Validar que exista el usuario
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Obtener equipo e historial si se proporcionan
    let equipo = null;
    let historial = null;

    if (equipoId) {
      equipo = await Equipo.findById(equipoId);
      if (!equipo) {
        return res.status(404).json({
          success: false,
          message: 'Equipo no encontrado'
        });
      }
    }

    if (historialId) {
      historial = await Historial.findById(historialId);
    } else if (equipoId) {
      // Buscar asignación activa si no se proporciona historialId
      historial = await Historial.findOne({
        equipo: equipoId,
        usuario: usuarioId,
        activo: true
      });
    }

    // Descargar template desde GCS
    const templateBuffer = await GCSHelper.downloadFile(
      acta.bucketName,
      acta.archivoNombre
    );

    // Preparar datos para el template
    const templateData = DocxProcessor.prepareTemplateData(usuario, equipo, historial);

    // Generar documento
    const generatedBuffer = await DocxProcessor.generateDocument(templateBuffer, templateData);

    // Subir documento generado a GCS
    const generatedFilename = `${acta.titulo.replace(/\s+/g, '_')}-${usuario.dni}-${Date.now()}.docx`;
    const generatedFileData = await GCSHelper.uploadGenerated(
      generatedBuffer,
      generatedFilename
    );

    // Registrar acta generada
    const actaGenerada = await ActaGenerada.create({
      acta: actaId,
      usuario: usuarioId,
      equipo: equipoId || null,
      historial: historialId || null,
      archivoUrl: generatedFileData.url,
      archivoNombre: generatedFileData.filename,
      archivoPath: generatedFileData.path,
      datosUtilizados: templateData,
      generadoPor: req.body.generadoPor || 'Sistema',
      observaciones: observaciones || ''
    });

    // Actualizar contador de uso del acta
    await acta.registrarUso();

    // Poblar datos para la respuesta
    await actaGenerada.populate('acta usuario equipo');

    res.status(201).json({
      success: true,
      message: 'Acta generada exitosamente',
      data: actaGenerada
    });
  } catch (error) {
    console.error('Error al generar acta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar acta',
      error: error.message
    });
  }
};

// Obtener actas generadas
exports.obtenerActasGeneradas = async (req, res) => {
  try {
    const { usuarioId, equipoId, actaId, page = 1, limit = 10 } = req.query;
    let filtro = {};
    
    if (usuarioId) filtro.usuario = usuarioId;
    if (equipoId) filtro.equipo = equipoId;
    if (actaId) filtro.acta = actaId;
    
    const actasGeneradas = await ActaGenerada.find(filtro)
      .populate('acta', 'titulo descripcion')
      .populate('usuario', 'nombre apellido dni area')
      .populate('equipo', 'marca modelo serie')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await ActaGenerada.countDocuments(filtro);
    
    res.json({
      success: true,
      data: actasGeneradas,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener actas generadas',
      error: error.message
    });
  }
};

// Obtener estadísticas de actas
exports.obtenerEstadisticas = async (req, res) => {
  try {
    const totalActas = await Acta.countDocuments();
    const actasActivas = await Acta.countDocuments({ estado: 'Activa' });
    const totalGeneradas = await ActaGenerada.countDocuments();
    
    const actasMasUsadas = await Acta.find()
      .sort({ vecesUtilizada: -1 })
      .limit(5)
      .select('titulo descripcion vecesUtilizada ultimoUso');
    
    const generadasPorMes = await ActaGenerada.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: {
        resumen: {
          totalActas,
          actasActivas,
          totalGeneradas
        },
        actasMasUsadas,
        generadasPorMes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};