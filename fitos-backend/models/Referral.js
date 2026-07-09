const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const referralSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  referrer_id: { type: String, ref: 'Member', required: true },
  referred_member_id: { type: String, ref: 'Member', required: true },
  gym_id: { type: String, ref: 'Gym', required: true },
  reward_applied: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Referral', referralSchema);
