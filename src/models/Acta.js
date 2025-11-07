const mongoose = require('mongoose');

const actaSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    index: true
  },
  descripcion: {
    type: String,
    trim: true,
    default: ''
  },
  archivoUrl: {
    type: String,
    required: [true, 'La URL del archivo es requerida']
  },
  archivoNombre: {
    type: String,
    required: [true, 'El nombre del archivo es requerido']
  },
  archivoPath: {
    type: String,
    required: [true, 'El path del archivo es requerido']
  },
  bucketName: {
    type: String,
    default: 'actas-templates'
  },
  
  camposIdentificados: [{
    nombre: String,
    tipo: {
      type: String,
      enum: ['texto', 'fecha', 'numero'],
      default: 'texto'
    },
    categoria: {
      type: String,
      enum: ['usuario', 'equipo', 'general'],
      default: 'general'
    }
  }],
  
  mapeo: {
    usuario_nombre: String,
    usuario_apellido: String,
    usuario_nombreCompleto: String,
    usuario_dni: String,
    usuario_cargo: String,
    usuario_area: String,
    usuario_correo: String,
    usuario_telefono: String,
    usuario_iniciales: String,
    
    equipo_marca: String,
    equipo_modelo: String,
    equipo_serie: String,
    equipo_host: String,
    equipo_tipo: String,
    equipo_procesador: String,
    equipo_memoria: String,
    equipo_almacenamiento: String,
    equipo_pantalla: String,
    equipo_fechaCompra: String,
    equipo_antiguedad: String,
    
    fecha:String,
    nombre:String,
    cargo:String,
    dni:String
  },
  
  estado: {
    type: String,
    enum: ['Activa', 'Inactiva'],
    default: 'Activa',
    index: true
  },

  vecesUtilizada: {
    type: Number,
    default: 0
  },
  
  ultimoUso: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

actaSchema.index({ titulo: 'text', descripcion: 'text' });
actaSchema.index({ estado: 1, createdAt: -1 });
actaSchema.methods.registrarUso = async function() {
  this.vecesUtilizada += 1;
  this.ultimoUso = new Date();
  await this.save();
};

module.exports = mongoose.model('Acta', actaSchema);