const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const trainerAttendanceSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  trainer_id: { type: String, ref: 'Trainer', required: true },
  gym_id: { type: String, ref: 'Gym', required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['present', 'absent', 'half_day'], default: 'present' },
}, { timestamps: false });
trainerAttendanceSchema.index({ trainer_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('TrainerAttendance', trainerAttendanceSchema);
