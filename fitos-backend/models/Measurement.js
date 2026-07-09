const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const measurementSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  member_id: { type: String, ref: 'Member', required: true },
  gym_id: { type: String, ref: 'Gym', required: true },
  weight_kg: Number,
  chest_cm: Number,
  waist_cm: Number,
  hips_cm: Number,
  arms_cm: Number,
  body_fat_pct: Number,
  date: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Measurement', measurementSchema);
