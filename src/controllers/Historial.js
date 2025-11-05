const Historial = require('../models/Historial');
const Equipo = require('../models/Equipo');
const Usuario = require('../models/Usuario');
const { validationResult } = require('express-validator');

exports.asignarEquipo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { equipoId, usuarioId, tipoUso, observaciones } = req.body;
    const equipo = await Equipo.findById(equipoId);
    if (!equipo) {
      return res.status(404).json({
        success: false,
        message: 'Equipo no encontrado'
      });
    }

    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    if (usuario.estado !== 'Activo') {
      return res.status(400).json({
        success: false,
        message: 'El usuario no está activo'
      });
    }

    const tieneAsignacion = await Historial.tieneAsignacionActiva(equipoId);
    if (tieneAsignacion) {
      return res.status(400).json({
        success: false,
        message: 'El equipo ya tiene una asignación activa'
      });
    }
    
    const historial = await Historial.create({
      equipo: equipoId,
      usuario: usuarioId,
      tipoUso: tipoUso,
      observaciones,
      activo: true
    });
    
    await Equipo.findByIdAndUpdate(equipoId, { estado: 'En Uso' });
    await historial.populate('equipo usuario');
    
    res.status(201).json({
      success: true,
      message: 'Equipo asignado exitosamente',
      data: historial
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: 'Error al asignar equipo',
      error: error.message
    });
  }
};

exports.devolverEquipo = async (req, res) => {
  try {
    const { historialId } = req.params;
    const { observaciones } = req.body;
    
    const historial = await Historial.findById(historialId);
    
    if (!historial) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }
    
    if (!historial.activo) {
      return res.status(400).json({
        success: false,
        message: 'Esta asignación ya fue finalizada'
      });
    }
    
    historial.fechaDevolucion = new Date();
    historial.activo = false;
    if (observaciones) {
      historial.observaciones = `${historial.observaciones} | Devolución: ${observaciones}`;
    }
    await historial.save();
    await Equipo.findByIdAndUpdate(historial.equipo, { estado: 'Disponible' });
    
    await historial.populate('equipo usuario');
    
    res.json({
      success: true,
      message: 'Equipo devuelto exitosamente',
      data: historial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al devolver equipo',
      error: error.message
    });
  }
};

exports.devolverEquipoPorId = async (req, res) => {
  try {
    const { equipoId } = req.params;
    const { observaciones } = req.body;
    const historial = await Historial.findOne({
      equipo: equipoId,
      activo: true
    });
    
    if (!historial) {
      return res.status(404).json({
        success: false,
        message: 'Este equipo no tiene una asignación activa'
      });
    }

    historial.fechaDevolucion = new Date();
    historial.activo = false;
    if (observaciones) {
      historial.observaciones = `${historial.observaciones} | Devolución: ${observaciones}`;
    }
    await historial.save();
    await Equipo.findByIdAndUpdate(equipoId, { estado: 'Disponible' });
    
    await historial.populate('equipo usuario');
    
    res.json({
      success: true,
      message: 'Equipo devuelto exitosamente',
      data: historial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al devolver equipo',
      error: error.message
    });
  }
};

exports.obtenerHistorial = async (req, res) => {
  try {
    const { activo, equipoId, usuarioId, page = 1, limit = 20 } = req.query;
    let filtro = {};
    
    if (activo !== undefined) filtro.activo = activo === 'true';
    if (equipoId) filtro.equipo = equipoId;
    if (usuarioId) filtro.usuario = usuarioId;
    
    const historial = await Historial.find(filtro)
      .populate('equipo', 'marca modelo serie equipo')
      .populate('usuario', 'nombre apellido area cargo')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ fechaAsignacion: -1 });
    
    const total = await Historial.countDocuments(filtro);
    
    res.json({
      success: true,
      data: historial,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
      error: error.message
    });
  }
};

exports.obtenerAsignacionPorId = async (req, res) => {
  try {
    const historial = await Historial.findById(req.params.id)
      .populate('equipo')
      .populate('usuario');
    
    if (!historial) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: historial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener asignación',
      error: error.message
    });
  }
};

exports.obtenerAsignacionesActivas = async (req, res) => {
  try {
    const asignaciones = await Historial.find({ activo: true })
      .populate('equipo', 'marca modelo serie equipo estado')
      .populate('usuario', 'nombre apellido area cargo')
      .sort({ fechaAsignacion: -1 });
    
    res.json({
      success: true,
      count: asignaciones.length,
      data: asignaciones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener asignaciones activas',
      error: error.message
    });
  }
};

exports.transferirEquipo = async (req, res) => {
  try {
    const { equipoId, nuevoUsuarioId, observaciones, registradoPor } = req.body;
    const asignacionActual = await Historial.findOne({
      equipo: equipoId,
      activo: true
    });
    
    if (!asignacionActual) {
      return res.status(404).json({
        success: false,
        message: 'El equipo no tiene una asignación activa'
      });
    }
    const nuevoUsuario = await Usuario.findById(nuevoUsuarioId);
    if (!nuevoUsuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario destino no encontrado'
      });
    }
    
    if (nuevoUsuario.estado !== 'Activo') {
      return res.status(400).json({
        success: false,
        message: 'El usuario destino no está activo'
      });
    }

    asignacionActual.fechaDevolucion = new Date();
    asignacionActual.activo = false;
    asignacionActual.observaciones = `${asignacionActual.observaciones} | Transferido`;
    await asignacionActual.save();
    const nuevaAsignacion = await Historial.create({
      equipo: equipoId,
      usuario: nuevoUsuarioId,
      tipoUso: asignacionActual.tipoUso,
      observaciones: observaciones || `Transferido desde ${asignacionActual.usuario}`,
      registradoPor: registradoPor || 'Sistema',
      activo: true
    });
    
    await nuevaAsignacion.populate('equipo usuario');
    
    res.json({
      success: true,
      message: 'Equipo transferido exitosamente',
      data: nuevaAsignacion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al transferir equipo',
      error: error.message
    });
  }
};

exports.obtenerEstadisticasHistorial = async (req, res) => {
  try {
    const totalAsignaciones = await Historial.countDocuments();
    const asignacionesActivas = await Historial.countDocuments({ activo: true });
    const asignacionesFinalizadas = await Historial.countDocuments({ activo: false });
    const usuariosMasEquipos = await Historial.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: '$usuario',
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { cantidad: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'usuarios',
          localField: '_id',
          foreignField: '_id',
          as: 'usuario'
        }
      },
      { $unwind: '$usuario' },
      {
        $project: {
          nombre: '$usuario.nombre',
          apellido: '$usuario.apellido',
          area: '$usuario.area',
          cantidad: 1
        }
      }
    ]);

    const equiposMasCambios = await Historial.aggregate([
      {
        $group: {
          _id: '$equipo',
          cambios: { $sum: 1 }
        }
      },
      { $sort: { cambios: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'equipos',
          localField: '_id',
          foreignField: '_id',
          as: 'equipo'
        }
      },
      { $unwind: '$equipo' },
      {
        $project: {
          marca: '$equipo.marca',
          modelo: '$equipo.modelo',
          serie: '$equipo.serie',
          cambios: 1
        }
      }
    ]);
    
    const tiempoPromedioUso = await Historial.aggregate([
      { $match: { activo: false, tiempoUso: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          promedioDias: { $avg: '$tiempoUso' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        resumen: {
          totalAsignaciones,
          asignacionesActivas,
          asignacionesFinalizadas
        },
        usuariosMasEquipos,
        equiposMasCambios,
        tiempoPromedioUso: tiempoPromedioUso[0]?.promedioDias || 0
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