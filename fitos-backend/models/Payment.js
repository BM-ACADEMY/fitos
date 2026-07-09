const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  gym_id: { type: String, ref: 'Gym', required: true },
  member_id: { type: String, ref: 'Member', required: true },
  amount: { type: Number, required: true },
  gst_amount: { type: Number, default: 0 },
  total_amount: { type: Number, required: true },
  method: { type: String, enum: ['cash', 'upi', 'razorpay', 'card'], default: 'cash' },
  razorpay_payment_id: String,
  razorpay_order_id: String,
  status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'paid' },
  plan_months: { type: Number, default: 1 },
  invoice_number: String,
  notes: String,
  paid_at: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
paymentSchema.index({ gym_id: 1, created_at: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
