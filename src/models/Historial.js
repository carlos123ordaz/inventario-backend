const mongoose = require('mongoose');

const historialSchema = new mongoose.Schema({
  equipo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipo',
    required: [true, 'El equipo es requerido'],
    index: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: [true, 'El usuario es requerido'],
    index: true
  },
  
  fechaAsignacion: {
    type: Date,
    default: Date.now,
    required: true
  },
  fechaDevolucion: {
    type: Date,
    default: null
  },
 
  tipoUso: {
    type: String
  },
  
  activo: {
    type: Boolean,
    default: true,
    index: true
  },
  
  tiempoUso: {
    type: Number, 
    default: 0
  },
  
  observaciones: {
    type: String,
    trim: true,
    default: ''
  },

}, {
  timestamps: true
});

historialSchema.pre('save', function(next) {
  if (this.fechaDevolucion && this.fechaAsignacion) {
    const diffTime = Math.abs(new Date(this.fechaDevolucion) - new Date(this.fechaAsignacion));
    this.tiempoUso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } else if (this.activo) {
    const diffTime = Math.abs(new Date() - new Date(this.fechaAsignacion));
    this.tiempoUso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  next();
});

historialSchema.index({ usuario: 1, activo: 1 });
historialSchema.index({ equipo: 1, activo: 1 });
historialSchema.statics.tieneAsignacionActiva = async function(equipoId) {
  const asignacion = await this.findOne({ equipo: equipoId, activo: true });
  return !!asignacion;
};

historialSchema.statics.equiposDeUsuario = async function(usuarioId, soloActivos = true) {
  const query = { usuario: usuarioId };
  if (soloActivos) query.activo = true;
  
  return await this.find(query)
    .populate('equipo')
    .sort({ fechaAsignacion: -1 });
};


historialSchema.statics.historialDeEquipo = async function(equipoId) {
  return await this.find({ equipo: equipoId })
    .populate('usuario', 'nombre apellido area cargo')
    .sort({ fechaAsignacion: -1 });
};

module.exports = mongoose.model('Historial', historialSchema);