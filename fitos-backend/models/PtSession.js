const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ptSessionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  package_id: { type: String, ref: 'PtPackage', required: true },
  gym_id: { type: String, ref: 'Gym', required: true },
  scheduled_at: { type: Date, required: true },
  completed_at: Date,
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },
  trainer_notes: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('PtSession', ptSessionSchema);
