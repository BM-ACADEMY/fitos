const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const trainerPermissionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  trainer_id: { type: String, ref: 'Trainer', required: true },
  page: { type: String, required: true },
  allowed: { type: Boolean, default: true },
}, { timestamps: false });
trainerPermissionSchema.index({ trainer_id: 1, page: 1 }, { unique: true });

module.exports = mongoose.model('TrainerPermission', trainerPermissionSchema);
