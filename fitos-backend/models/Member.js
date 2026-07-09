const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const memberSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  gym_id: { type: String, ref: 'Gym', required: true },
  trainer_id: { type: String, ref: 'Trainer' },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dob: Date,
  goal: String,
  fitness_level: { type: String, default: 'beginner' },
  health_notes: String,
  enrollment_source: { type: String, default: 'walk_in' },
  plan: { type: String, default: 'monthly' },
  plan_duration: { type: Number, default: 1 },
  joined_at: { type: Date, default: Date.now },
  expires_at: Date,
  status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active' },
  qr_token: { type: String, unique: true, sparse: true },
  emergency_contact: String,
  last_checkin_date: Date,
  churn_risk: { type: Boolean, default: false },
  referral_token: { type: String, unique: true, sparse: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

memberSchema.index({ phone: 1 });
memberSchema.index({ gym_id: 1 });
memberSchema.index({ expires_at: 1, status: 1 });

module.exports = mongoose.model('Member', memberSchema);
