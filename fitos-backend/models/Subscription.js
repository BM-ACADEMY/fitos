const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const subscriptionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  gym_id: { type: String, ref: 'Gym', required: true },
  plan_key: { type: String, required: true },
  razorpay_sub_id: String,
  status: { type: String, enum: ['active', 'halted', 'cancelled'], default: 'active' },
  current_period_end: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Subscription', subscriptionSchema);
