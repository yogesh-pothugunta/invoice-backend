const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  company: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  logo: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);