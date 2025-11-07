const mongoose = require('mongoose');
const bcrypt = require('bcrypt')

const usuarioSchema = new mongoose.Schema({
  dni: {
    type: String,
    required: [true, 'El DNI es requerido'],
    unique: true,
    trim: true,
    index: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es requerido'],
    trim: true
  },
  cargo: {
    type: String,
    required: [true, 'El cargo es requerido'],
    trim: true
  },
  area: {
    type: String,
    required: [true, 'El área es requerida'],
    trim: true,
    index: true
  },
  correo: {
    type: String,
    required: [true, 'El correo es requerido'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingrese un correo válido']
  },
  password: {
    type: String
  },
  telefono: {
    type: String,
    required: [true, 'El teléfono es requerido'],
    trim: true
  },
  usuario: {
    type: String,
    required: [true, 'El usuario es requerido'],
    unique: true,
    trim: true,
    lowercase: true
  },
  iniciales: {
    type: String,
    required: [true, 'Las iniciales son requeridas'],
    trim: true,
    uppercase: true,
    maxlength: 4
  },
  estado: {
    type: String,
    enum: ['Activo', 'Inactivo', 'Baja'],
    default: 'Activo',
    index: true
  },
  observacion: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

usuarioSchema.virtual('nombreCompleto').get(function () {
  return `${this.nombre} ${this.apellido}`;
});

usuarioSchema.virtual('equiposActuales', {
  ref: 'Historial',
  localField: '_id',
  foreignField: 'usuario',
  match: { activo: true }
});

usuarioSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

usuarioSchema.methods.compararPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

usuarioSchema.index({ nombre: 'text', apellido: 'text', correo: 'text' });

module.exports = mongoose.model('Usuario', usuarioSchema);