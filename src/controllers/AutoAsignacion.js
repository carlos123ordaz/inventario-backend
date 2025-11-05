// controllers/AutoAsignacion.js
const Equipo = require('../models/Equipo');
const Usuario = require('../models/Usuario');
const Historial = require('../models/Historial');

exports.autoAsignarEquipo = async (req, res) => {
  try {
    const {
      marca,
      modelo,
      serie,
      host,
      procesador,
      almacenamiento,
      memoria,
      tarjetaGrafica,
      puertoRed,
      puertosUSB,
      puertoSerial,
      puertoHDMI,
      puertoC,
      usuarioId,
      observaciones,
      tipoUso = 'Asignación Definitiva',
      fechaCompra
    } = req.body;

    if (!serie) {
      return res.status(400).json({
        success: false,
        message: 'El número de serie es requerido'
      });
    }

    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar un usuario'
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
    let equipo = await Equipo.findOne({ serie: serie.toUpperCase() });
    
    if (equipo) {
      const updateData = {};
      if (marca && marca !== 'N/A') updateData.marca = marca;
      if (modelo && modelo !== 'N/A') updateData.modelo = modelo;
      if (host && host !== 'N/A') updateData.host = host.toUpperCase();
      if (procesador && procesador !== 'N/A') updateData.procesador = procesador;
      if (almacenamiento && almacenamiento !== 'N/A') updateData.almacenamiento = almacenamiento;
      if (memoria && memoria !== 'N/A') updateData.memoria = memoria;
      if (tarjetaGrafica) updateData.tarjetaGrafica = tarjetaGrafica;
      if (puertoRed !== undefined) updateData.puertoRed = puertoRed;
      if (puertosUSB !== undefined) updateData.puertosUSB = puertosUSB;
      if (puertoSerial !== undefined) updateData.puertoSerial = puertoSerial;
      if (puertoHDMI !== undefined) updateData.puertoHDMI = puertoHDMI;
      if (puertoC !== undefined) updateData.puertoC = puertoC;
      
      if (observaciones) updateData.observaciones = observaciones;
      await Equipo.collection.updateOne(
        { _id: equipo._id },
        { 
          $set: {
            ...updateData,
            fechaCompra: new Date(), 
            antiguedad: 0             
          }
        }
      );
      
      equipo = await Equipo.findById(equipo._id);
      const asignacionExistente = await Historial.findOne({
        equipo: equipo._id,
        usuario: usuarioId,
        activo: true
      });

      if (asignacionExistente) {
        return res.json({
          success: true,
          message: 'Equipo actualizado. Ya tiene asignación activa con este usuario',
          data: {
            equipo,
            asignacion: asignacionExistente,
            accion: 'actualizado'
          }
        });
      }
      const otraAsignacion = await Historial.findOne({
        equipo: equipo._id,
        activo: true
      }).populate('usuario', 'nombre apellido');

      if (otraAsignacion) {
        return res.status(400).json({
          success: false,
          message: `El equipo ya está asignado a ${otraAsignacion.usuario.nombre} ${otraAsignacion.usuario.apellido}`,
          data: {
            equipo,
            asignacionActual: otraAsignacion
          }
        });
      }
      const historial = await Historial.create({
        equipo: equipo._id,
        usuario: usuarioId,
        tipoUso,
        observaciones: observaciones || 'Auto-asignación desde aplicación desktop',
        activo: true
      });

      await Equipo.findByIdAndUpdate(equipo._id, { estado: 'En Uso' });
      await historial.populate('equipo usuario');

      return res.json({
        success: true,
        message: 'Equipo actualizado y asignado exitosamente',
        data: {
          equipo,
          asignacion: historial,
          accion: 'actualizado_y_asignado'
        }
      });

    } else {
      let tipoEquipo = 'LAPTOP'; 
      if (modelo) {
        const modeloLower = modelo.toLowerCase();
        if (modeloLower.includes('desktop') || 
            modeloLower.includes('optiplex') || 
            modeloLower.includes('tower') ||
            modeloLower.includes('elite desk')) {
          tipoEquipo = 'DESKTOP';
        }
      }

      const fechaCompraValida = fechaCompra ? new Date(fechaCompra) : new Date();
      const datosEquipo = {
        equipo: tipoEquipo,
        marca: marca && marca !== 'N/A' ? marca : 'Sin especificar',
        modelo: modelo && modelo !== 'N/A' ? modelo : 'Sin especificar',
        serie: serie.toUpperCase(),
        host: host && host !== 'N/A' ? host.toUpperCase() : 'SIN-HOST',
        procesador: procesador && procesador !== 'N/A' ? procesador : 'Sin especificar',
        almacenamiento: almacenamiento && almacenamiento !== 'N/A' ? almacenamiento : 'Sin especificar',
        memoria: memoria && memoria !== 'N/A' ? memoria : 'Sin especificar',
        tarjetaGrafica: tarjetaGrafica || '',
        puertoRed: puertoRed !== undefined ? puertoRed : false,
        puertosUSB: puertosUSB !== undefined ? puertosUSB : true,
        puertoSerial: puertoSerial !== undefined ? puertoSerial : false,
        puertoHDMI: puertoHDMI !== undefined ? puertoHDMI : false,
        puertoC: puertoC !== undefined ? puertoC : false,
        fechaCompra: fechaCompraValida,
        primerUso: fechaCompraValida,
        observaciones: observaciones || 'Creado desde aplicación desktop',
        estado: 'En Uso'
      };

      equipo = await Equipo.create(datosEquipo);
      const historial = await Historial.create({
        equipo: equipo._id,
        usuario: usuarioId,
        tipoUso,
        observaciones: observaciones || 'Auto-asignación inicial desde aplicación desktop',
        activo: true
      });

      await historial.populate('equipo usuario');

      return res.status(201).json({
        success: true,
        message: 'Equipo creado y asignado exitosamente',
        data: {
          equipo,
          asignacion: historial,
          accion: 'creado_y_asignado'
        }
      });
    }

  } catch (error) {
    console.error('Error en auto-asignación:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el proceso de asignación',
      error: error.message
    });
  }
};

exports.previsualizarEquipo = async (req, res) => {
  try {
    const { serie } = req.params;
    
    if (!serie) {
      return res.status(400).json({
        success: false,
        message: 'El número de serie es requerido'
      });
    }

    const equipo = await Equipo.findOne({ serie: serie.toUpperCase() });
    
    if (!equipo) {
      return res.json({
        success: true,
        existe: false,
        message: 'Equipo no encontrado. Se creará uno nuevo al asignar.',
        data: null
      });
    }
    const asignacionActual = await Historial.findOne({
      equipo: equipo._id,
      activo: true
    }).populate('usuario', 'nombre apellido area cargo');

    return res.json({
      success: true,
      existe: true,
      data: {
        ...equipo.toObject(),
        asignacionActual
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al previsualizar equipo',
      error: error.message
    });
  }
};