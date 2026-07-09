const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const otpStoreSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  phone: { type: String, required: true },
  otp: { type: String, required: true },
  expires_at: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
otpStoreSchema.index({ phone: 1, expires_at: 1 });

module.exports = mongoose.model('OtpStore', otpStoreSchema);
