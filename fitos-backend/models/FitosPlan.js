const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const fitosPlanSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  key: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  member_limit: { type: Number, required: true },
  features: { type: mongoose.Schema.Types.Mixed, default: [] },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('FitosPlan', fitosPlanSchema);
