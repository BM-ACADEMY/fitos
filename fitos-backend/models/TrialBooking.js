const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const trialBookingSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  gym_id: { type: String, ref: 'Gym', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  gender: String,
  goal: String,
  preferred_date: { type: Date, required: true },
  preferred_time: String,
  status: { type: String, enum: ['pending', 'confirmed', 'attended', 'converted', 'no_show'], default: 'pending' },
  source: { type: String, default: 'online' },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('TrialBooking', trialBookingSchema);
