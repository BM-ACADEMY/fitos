const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const masterAdminSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  phone: { type: String, unique: true, required: true },
  email: String,
  role: { type: String, enum: ['admin', 'super_admin'], default: 'admin' },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('MasterAdmin', masterAdminSchema);
