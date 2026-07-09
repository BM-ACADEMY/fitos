const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const couponSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  code: { type: String, unique: true, required: true },
  discount_pct: { type: Number, required: true },
  max_uses: { type: Number, default: 100 },
  expires_at: Date,
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Coupon', couponSchema);
