const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const revenueForecastSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  gym_id: { type: String, ref: 'Gym', required: true },
  forecast_date: { type: Date, default: Date.now },
  projected_amount: Number,
  upcoming_renewals: Number,
  renewal_rate: Number,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('RevenueForecast', revenueForecastSchema);
