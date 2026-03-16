const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const utenteSchema = new mongoose.Schema({
  username:   { type: String, required: true, unique: true, trim: true },
  password:   { type: String, required: true, select: false },
  nome:       { type: String, required: true },
  cognome:    { type: String, required: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  ruolo:      { type: String, enum: ['operatore', 'supervisore', 'admin'], default: 'operatore' },
  attivo:     { type: Boolean, default: true },
  ultimoAccesso: Date,
}, { timestamps: true });

utenteSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

utenteSchema.methods.verificaPassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

utenteSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Utente', utenteSchema);
