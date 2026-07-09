const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const whatsappLogSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  gym_id: { type: String, ref: 'Gym' },
  recipient_phone: { type: String, required: true },
  template_name: { type: String, required: true },
  status: { type: String, default: 'sent' },
  meta_message_id: String,
  error_detail: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
whatsappLogSchema.index({ gym_id: 1, created_at: 1 });

module.exports = mongoose.model('WhatsappLog', whatsappLogSchema);
