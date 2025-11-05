const Usuario = require('../models/Usuario');
const Historial = require('../models/Historial');
const { validationResult } = require('express-validator');

exports.obtenerUsuarios = async (req, res) => {
  try {
    const { estado, area, page = 1, limit = 10 } = req.query;
    let filtro = {};
    
    if (estado) filtro.estado = estado;
    if (area) filtro.area = area;
    
    const usuarios = await Usuario.find(filtro)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Usuario.countDocuments(filtro);
    
    res.json({
      success: true,
      data: usuarios,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

exports.obtenerUsuarioPorId = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    const equiposActuales = await Historial.equiposDeUsuario(usuario._id, true);
    
    res.json({
      success: true,
      data: {
        ...usuario.toObject(),
        equiposAsignados: equiposActuales
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: error.message
    });
  }
};

exports.crearUsuario = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const usuario = await Usuario.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: usuario
    });
  } catch (error) {
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `El ${campo} ya está registrado`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: error.message
    });
  }
};


exports.actualizarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: usuario
    });
  } catch (error) {
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `El ${campo} ya está registrado en otro usuario`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
};


exports.eliminarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    const tieneEquipos = await Historial.findOne({
      usuario: req.params.id,
      activo: true
    });
    
    if (tieneEquipos) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el usuario porque tiene equipos asignados'
      });
    }
    
    await usuario.deleteOne();
    
    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};

exports.buscarUsuarios = async (req, res) => {
  try {
    const { termino } = req.query;
    
    if (!termino) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un término de búsqueda'
      });
    }
    
    const usuarios = await Usuario.find({
      $or: [
        { nombre: { $regex: termino, $options: 'i' } },
        { apellido: { $regex: termino, $options: 'i' } },
        { dni: { $regex: termino, $options: 'i' } },
        { correo: { $regex: termino, $options: 'i' } },
        { usuario: { $regex: termino, $options: 'i' } },
        { area: { $regex: termino, $options: 'i' } }
      ]
    }).limit(20);
    
    res.json({
      success: true,
      count: usuarios.length,
      data: usuarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en la búsqueda',
      error: error.message
    });
  }
};

exports.obtenerHistorialUsuario = async (req, res) => {
  try {
    const historial = await Historial.find({ usuario: req.params.id })
      .populate('equipo', 'marca modelo serie equipo')
      .sort({ fechaAsignacion: -1 });
    
    res.json({
      success: true,
      count: historial.length,
      data: historial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
      error: error.message
    });
  }
};