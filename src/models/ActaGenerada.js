const mongoose = require('mongoose');

const actaGeneradaSchema = new mongoose.Schema({
  acta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Acta',
    required: true,
    index: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    index: true
  },
  equipo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipo',
    required: false,
    index: true
  },
  historial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Historial',
    required: false
  },
  archivoUrl: {
    type: String,
    required: true
  },
  archivoNombre: {
    type: String,
    required: true
  },
  archivoPath: {
    type: String,
    required: true
  },
  
  datosUtilizados: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  generadoPor: {
    type: String,
    default: 'Sistema'
  },
  
  observaciones: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

actaGeneradaSchema.index({ usuario: 1, createdAt: -1 });
actaGeneradaSchema.index({ acta: 1, createdAt: -1 });
actaGeneradaSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActaGenerada', actaGeneradaSchema);