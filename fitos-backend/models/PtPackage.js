const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ptPackageSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  gym_id: { type: String, ref: 'Gym', required: true },
  member_id: { type: String, ref: 'Member', required: true },
  trainer_id: { type: String, ref: 'Trainer', required: true },
  total_sessions: { type: Number, required: true },
  used_sessions: { type: Number, default: 0 },
  price_per_session: { type: Number, required: true },
  total_price: { type: Number, required: true },
  expires_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('PtPackage', ptPackageSchema);
