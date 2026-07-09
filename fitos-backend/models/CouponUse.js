const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const couponUseSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  coupon_id: { type: String, ref: 'Coupon', required: true },
  gym_id: { type: String, ref: 'Gym', required: true },
  used_at: { type: Date, default: Date.now },
}, { timestamps: false });

module.exports = mongoose.model('CouponUse', couponUseSchema);
