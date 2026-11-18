const mongoose = require('mongoose');

// Tokens invalidados al cerrar sesión. MongoDB los borra solo cuando vencen (índice TTL),
// porque después de esa fecha el JWT ya no sería aceptado de todos modos.
const tokenRevocadoSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  expiraEn: { type: Date, required: true, index: { expires: 0 } },
});

module.exports = mongoose.model('TokenRevocado', tokenRevocadoSchema);
