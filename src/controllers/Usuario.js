const Usuario = require('../models/Usuario');
const Historial = require('../models/Historial');
const { validationResult } = require('express-validator');
const axios = require('axios'); // npm install axios
const bcrypt = require('bcrypt');

exports.obtenerUsuarios = async (req, res) => {
  try {
    const { estado, area, page = 1, limit = 10 } = req.query;
    let filtro = {};

    if (estado) filtro.estado = estado;
    if (area) filtro.area = area;

    const usuarios = await Usuario.find(filtro)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ _id: -1 });

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
    console.error(error);
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


const BITRIX_URL = 'https://corsusaint.bitrix24.com/rest/4296/gzwh0355xyw5ihbc/user.get';

function soloNumeros(valor) {
  if (!valor) return null;
  const nums = valor.replace(/\D/g, '');
  return nums || null;
}

exports.sincronizarBitrix = async (req, res) => {
  try {
    // 1. Obtener todos los usuarios de Bitrix24 (paginado)
    let allUsersRaw = [];
    let start = 0;

    while (true) {
      const response = await axios.get(BITRIX_URL, { params: { start } });
      const data = response.data;
      allUsersRaw.push(...data.result);

      if (data.next) {
        start = data.next;
      } else {
        break;
      }
    }

    // 2. Mapear usuarios de Bitrix al esquema de MongoDB
    const bitrixUsers = [];
    for (const user of allUsersRaw) {
      const dni = soloNumeros(user.UF_USR_1583783785065);
      if (!dni) continue; // Saltar usuarios sin DNI

      const hashedPassword = await bcrypt.hash(dni, 10);

      bitrixUsers.push({
        nombre: user.NAME || '',
        apellido: user.LAST_NAME || '',
        correo: (user.EMAIL || '').toLowerCase().trim(),
        cargo: user.WORK_POSITION || 'Sin cargo',
        telefono: {
          prefijo: '+51',
          numero: soloNumeros(user.PERSONAL_PHONE) || ''
        },
        dni,
        estado: user.ACTIVE ? 'Activo' : 'Baja',
        usuario: (user.UF_SKYPE || user.EMAIL || '').toLowerCase().trim(),
        iniciales: `${(user.NAME || '').charAt(0)}${(user.LAST_NAME || '').charAt(0)}`.toUpperCase(),
        area: user.UF_DEPARTMENT?.[0] ? `Dept ${user.UF_DEPARTMENT[0]}` : 'Sin área',
        password: hashedPassword,
      });
    }

    // 3. Obtener usuarios existentes de la DB
    const existentes = await Usuario.find({}, { dni: 1, correo: 1, estado: 1 });
    const dniSet = new Set(existentes.map(u => u.dni));
    const correoSet = new Set(existentes.map(u => u.correo));

    // 4. Separar nuevos vs existentes para actualizar estado
    const nuevos = [];
    let actualizados = 0;

    for (const user of bitrixUsers) {
      if (!dniSet.has(user.dni) && !correoSet.has(user.correo)) {
        // Usuario nuevo → insertar
        nuevos.push(user);
      } else {
        // Usuario existente → actualizar estado si cambió
        const resultado = await Usuario.findOneAndUpdate(
          {
            $or: [{ dni: user.dni }, { correo: user.correo }],
            estado: { $ne: user.estado } // Solo si el estado es diferente
          },
          {
            $set: {
              estado: user.estado,
              cargo: user.cargo,
              nombre: user.nombre,
              apellido: user.apellido,
            }
          }
        );
        if (resultado) actualizados++;
      }
    }

    // 5. Insertar nuevos usuarios
    let insertados = 0;
    if (nuevos.length > 0) {
      const result = await Usuario.insertMany(nuevos, { ordered: false }).catch(err => {
        // Manejar duplicados parciales
        if (err.insertedDocs) return { insertedCount: err.insertedDocs.length };
        throw err;
      });
      insertados = result.insertedCount || nuevos.length;
    }

    res.json({
      success: true,
      message: 'Sincronización completada',
      data: {
        totalBitrix: allUsersRaw.length,
        nuevosInsertados: insertados,
        estadosActualizados: actualizados,
        sinCambios: bitrixUsers.length - insertados - actualizados
      }
    });
  } catch (error) {
    console.error('Error en sincronización Bitrix:', error);
    res.status(500).json({
      success: false,
      message: 'Error al sincronizar con Bitrix24',
      error: error.message
    });
  }
};