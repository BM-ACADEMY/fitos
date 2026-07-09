const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const checkInSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  gym_id: { type: String, ref: 'Gym', required: true },
  member_id: { type: String, ref: 'Member', required: true },
  checked_in_at: { type: Date, default: Date.now },
  method: { type: String, enum: ['manual', 'qr'], default: 'manual' },
}, { timestamps: false });
checkInSchema.index({ gym_id: 1, checked_in_at: 1 });

module.exports = mongoose.model('CheckIn', checkInSchema);
