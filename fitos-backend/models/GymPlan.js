const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const gymPlanSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  gym_id: { type: String, ref: 'Gym', required: true },
  name: { type: String, required: true },
  duration_months: { type: Number, default: 1 },
  price: { type: Number, required: true },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('GymPlan', gymPlanSchema);
