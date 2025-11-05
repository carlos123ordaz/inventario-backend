const Equipo = require('../models/Equipo');
const Historial = require('../models/Historial');
const { validationResult } = require('express-validator');

exports.obtenerEquipos = async (req, res) => {
  try {
    const { estado, equipo, marca, page = 1, limit = 10 } = req.query;
    let filtro = {};
    
    if (estado) filtro.estado = estado;
    if (equipo) filtro.equipo = equipo;
    if (marca) filtro.marca = marca;
    
    const skip = (page - 1) * limit;
    
    const equipos = await Equipo.aggregate([
      { $match: filtro },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'historials',
          let: { equipoId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$equipo', '$$equipoId'] },
                    { $eq: ['$activo', true] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: 'usuarios',
                localField: 'usuario',
                foreignField: '_id',
                as: 'usuario'
              }
            },
            { $unwind: { path: '$usuario', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                'usuario.nombre': 1,
                'usuario.apellido': 1,
                'usuario.area': 1
              }
            }
          ],
          as: 'asignacionActual'
        }
      },
      {
        $addFields: {
          asignacionActual: { $arrayElemAt: ['$asignacionActual', 0] }
        }
      }
    ]);
    
    const total = await Equipo.countDocuments(filtro);
    
    res.json({
      success: true,
      data: equipos,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener equipos',
      error: error.message
    });
  }
};

exports.obtenerEquipoPorId = async (req, res) => {
  try {
    const equipo = await Equipo.findById(req.params.id);
    
    if (!equipo) {
      return res.status(404).json({
        success: false,
        message: 'Equipo no encontrado'
      });
    }
    
    const asignacionActual = await Historial.findOne({
      equipo: equipo._id,
      activo: true
    }).populate('usuario', 'nombre apellido area cargo correo');
    
    const historial = await Historial.historialDeEquipo(equipo._id);
    
    res.json({
      success: true,
      data: {
        ...equipo.toObject(),
        asignacionActual,
        historial
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener equipo',
      error: error.message
    });
  }
};

exports.crearEquipo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const equipo = await Equipo.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Equipo creado exitosamente',
      data: equipo
    });
  } catch (error) {
    console.log(error)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El número de serie ya está registrado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear equipo',
      error: error.message
    });
  }
};

exports.actualizarEquipo = async (req, res) => {
  try {
    if (req.body.estado) {
      const tieneAsignacion = await Historial.tieneAsignacionActiva(req.params.id);
      if (tieneAsignacion && req.body.estado === 'Disponible') {
        return res.status(400).json({
          success: false,
          message: 'No se puede cambiar a Disponible mientras tenga una asignación activa'
        });
      }
    }
    
    const equipo = await Equipo.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!equipo) {
      return res.status(404).json({
        success: false,
        message: 'Equipo no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Equipo actualizado exitosamente',
      data: equipo
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El número de serie ya está registrado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar equipo',
      error: error.message
    });
  }
};

// Eliminar equipo
exports.eliminarEquipo = async (req, res) => {
  try {
    const equipo = await Equipo.findById(req.params.id);
    
    if (!equipo) {
      return res.status(404).json({
        success: false,
        message: 'Equipo no encontrado'
      });
    }
    
    // Verificar si tiene asignación activa
    const tieneAsignacion = await Historial.tieneAsignacionActiva(req.params.id);
    
    if (tieneAsignacion) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el equipo porque tiene una asignación activa'
      });
    }
    
    await equipo.deleteOne();
    
    res.json({
      success: true,
      message: 'Equipo eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar equipo',
      error: error.message
    });
  }
};

exports.buscarEquipos = async (req, res) => {
  try {
    const { termino } = req.query;
    
    if (!termino) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un término de búsqueda'
      });
    }
    
    const equipos = await Equipo.find({
      $or: [
        { marca: { $regex: termino, $options: 'i' } },
        { modelo: { $regex: termino, $options: 'i' } },
        { serie: { $regex: termino, $options: 'i' } },
        { host: { $regex: termino, $options: 'i' } },
        { procesador: { $regex: termino, $options: 'i' } }
      ]
    }).limit(20);
    
    res.json({
      success: true,
      count: equipos.length,
      data: equipos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en la búsqueda',
      error: error.message
    });
  }
};

exports.obtenerEstadisticas = async (req, res) => {
  try {
    const totalEquipos = await Equipo.countDocuments();
    const disponibles = await Equipo.countDocuments({ estado: 'Disponible' });
    const enUso = await Equipo.countDocuments({ estado: 'En Uso' });
    const enMantenimiento = await Equipo.countDocuments({ estado: 'Mantenimiento' });
    const dadoDeBaja = await Equipo.countDocuments({ estado: 'Dado de Baja' });
    
    const porTipo = await Equipo.aggregate([
      {
        $group: {
          _id: '$equipo',
          cantidad: { $sum: 1 }
        }
      }
    ]);
    
    const porMarca = await Equipo.aggregate([
      {
        $group: {
          _id: '$marca',
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { cantidad: -1 } },
      { $limit: 10 }
    ]);
    
    const porEstado = await Equipo.aggregate([
      {
        $group: {
          _id: '$estado',
          cantidad: { $sum: 1 }
        }
      }
    ]);
    
    const equiposAntiguos = await Equipo.find()
      .sort({ antiguedad: -1 })
      .limit(5)
      .select('marca modelo serie antiguedad estado');
    
    res.json({
      success: true,
      data: {
        resumen: {
          totalEquipos,
          disponibles,
          enUso,
          enMantenimiento,
          dadoDeBaja
        },
        porTipo,
        porMarca,
        porEstado,
        equiposAntiguos
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