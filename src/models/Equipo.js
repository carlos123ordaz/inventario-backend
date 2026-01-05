const mongoose = require('mongoose');
const { auditPlugin } = require('../utils/auditPlugin');

const equipoSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['LAPTOP', 'DESKTOP', 'MOUSE', 'MONITOR', 'COOLER', 'TECLADO', 'CELULAR', 'OTRO'],
    required: [true, 'El tipo de equipo es requerido'],
    index: true
  },
  marca: {
    type: String,
    required: [true, 'La marca es requerida'],
    trim: true,
    index: true
  },
  modelo: {
    type: String,
    required: [true, 'El modelo es requerido'],
    trim: true
  },
  serie: {
    type: String,
    required: [true, 'El número de serie es requerido'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  host: {
    type: String,
    trim: true,
    uppercase: true
  },

  estado: {
    type: String,
    enum: ['Disponible', 'En Uso', 'Mantenimiento', 'Dado de Baja', 'Extraviado'],
    default: 'Disponible',
    index: true
  },
  fechaRegistro: {
    type: Date,
    default: Date.now,
    required: true
  },
  fechaCompra: {
    type: Date,
    required: [true, 'La fecha de compra es requerida']
  },
  primerUso: {
    type: Date,
    default: function () {
      return this.fechaCompra;
    }
  },
  antiguedad: {
    type: Number,
    default: 0
  },

  procesador: {
    type: String,
    trim: true
  },
  almacenamiento: {
    type: String,
    trim: true
  },
  memoria: {
    type: String,
    trim: true
  },
  pantalla: {
    type: String,
    trim: true,
    default: ''
  },
  tarjetaGrafica: {
    type: String,
    trim: true,
    default: ''
  },

  puertoRed: {
    type: Boolean,
    default: false
  },
  puertosUSB: {
    type: Boolean,
    default: true
  },
  puertoSerial: {
    type: Boolean,
    default: false
  },
  puertoHDMI: {
    type: Boolean,
    default: false
  },
  puertoC: {
    type: Boolean,
    default: false
  },

  clavesBIOS: {
    contrasena: {
      type: String,
      trim: true,
      default: ''
    },
    notas: {
      type: String,
      trim: true,
      default: ''
    }
  },
  clavesAdministrador: {
    usuario: {
      type: String,
      trim: true,
      default: ''
    },
    contrasena: {
      type: String,
      trim: true,
      default: ''
    },
    notas: {
      type: String,
      trim: true,
      default: ''
    }
  },
  clavesEquipo: {
    usuario: {
      type: String,
      trim: true,
      default: ''
    },
    contrasena: {
      type: String,
      trim: true,
      default: ''
    },
    notas: {
      type: String,
      trim: true,
      default: ''
    }
  },

  observaciones: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

equipoSchema.pre('save', function (next) {
  if (this.fechaCompra) {
    const hoy = new Date();
    const compra = new Date(this.fechaCompra);
    const diffTime = Math.abs(hoy - compra);
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    this.antiguedad = Math.round(diffYears * 10) / 10;
  }
  next();
});

equipoSchema.virtual('historial', {
  ref: 'Historial',
  localField: '_id',
  foreignField: 'equipo'
});

equipoSchema.virtual('asignacionActual', {
  ref: 'Historial',
  localField: '_id',
  foreignField: 'equipo',
  justOne: true,
  match: { activo: true }
});

equipoSchema.index({ estado: 1, tipo: 1 });
equipoSchema.index({ marca: 'text', modelo: 'text', serie: 'text', host: 'text' });

equipoSchema.methods.estaDisponible = function () {
  return this.estado === 'Disponible';
};

equipoSchema.methods.tieneClavesSecuridad = function () {
  return (this.tipo === 'LAPTOP' || this.tipo === 'DESKTOP') &&
    (this.clavesBIOS.contrasena ||
      this.clavesAdministrador.contrasena ||
      this.clavesEquipo.contrasena ||
      this.PIN.valor);
};

equipoSchema.plugin(auditPlugin, { collectionName: 'equipos' });

module.exports = mongoose.model('Equipo', equipoSchema);