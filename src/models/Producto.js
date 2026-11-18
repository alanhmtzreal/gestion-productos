const mongoose = require('mongoose');

const CATEGORIAS = ['Electrónica', 'Hogar', 'Ropa', 'Alimentos', 'Papelería', 'Deportes', 'Otros'];

const productoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 120 },
    descripcion: { type: String, trim: true, maxlength: 500, default: '' },
    precio: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    categoria: { type: String, required: true, enum: CATEGORIAS },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Producto', productoSchema);
module.exports.CATEGORIAS = CATEGORIAS;
