const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const workoutPlanSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  gym_id: { type: String, ref: 'Gym', required: true },
  member_id: { type: String, ref: 'Member', required: true },
  trainer_id: { type: String, ref: 'Trainer' },
  generated_by: { type: String, enum: ['ai', 'trainer'], default: 'ai' },
  plan_data: { type: mongoose.Schema.Types.Mixed, required: true },
  diet_data: { type: mongoose.Schema.Types.Mixed },
  is_active: { type: Boolean, default: true },
  sent_to_member: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);
