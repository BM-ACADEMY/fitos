const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const gymSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  slug: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  owner_name: { type: String, required: true },
  phone: { type: String, unique: true, required: true },
  email: String,
  address: String,
  city: { type: String, default: 'Pondicherry' },
  plan: { type: String, enum: ['free', 'starter', 'basic', 'premium'], default: 'free' },
  trial_ends_at: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  plan_expires_at: Date,
  is_active: { type: Boolean, default: true },
  razorpay_sub_id: String,
  logo_url: String,
  gstin: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Gym', gymSchema);
