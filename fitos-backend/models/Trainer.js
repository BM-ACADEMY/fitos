const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const trainerSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  gym_id: { type: String, ref: 'Gym', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  specialization: String,
  base_salary: { type: Number, default: 0 },
  pt_commission_pct: { type: Number, default: 10 },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Trainer', trainerSchema);
