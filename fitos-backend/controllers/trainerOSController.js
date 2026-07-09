const Member = require('../models/Member');
const Measurement = require('../models/Measurement');
const WorkoutPlan = require('../models/WorkoutPlan');

const toObj = (doc) => ({ ...doc, id: doc._id });

exports.createMeasurement = async (req, res) => {
  try {
    const { member_id, weight_kg, chest_cm, waist_cm, hips_cm, arms_cm, body_fat_pct, date } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id required' });
    const member = await Member.findOne({ _id: member_id, gym_id: req.user.gym_id }).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const measurement = await Measurement.create({ member_id, gym_id: req.user.gym_id, weight_kg, chest_cm, waist_cm, hips_cm, arms_cm, body_fat_pct, date: date ? new Date(date) : new Date() });
    res.status(201).json({ ok: true, measurement: toObj(measurement.toObject()) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to log measurement' });
  }
};

exports.getMeasurements = async (req, res) => {
  try {
    const measurements = await Measurement.find({ member_id: req.params.memberId, gym_id: req.user.gym_id }).sort({ date: 1 }).limit(50).lean();
    res.json({ ok: true, measurements: measurements.map(toObj) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch measurements' });
  }
};

exports.saveWorkout = async (req, res) => {
  try {
    const { member_id, plan_data } = req.body;
    if (!member_id || !plan_data) return res.status(400).json({ error: 'member_id and plan_data required' });
    const trainerId = req.user.role === 'trainer' ? req.user.id : (req.body.trainer_id || null);
    const plan = await WorkoutPlan.create({ gym_id: req.user.gym_id, member_id, trainer_id: trainerId, generated_by: 'trainer', plan_data });
    res.status(201).json({ ok: true, plan: toObj(plan.toObject()) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save workout' });
  }
};

exports.getMyMembers = async (req, res) => {
  try {
    const members = await Member.find({ trainer_id: req.user.id, gym_id: req.user.gym_id, status: 'active' }).sort({ name: 1 }).lean();
    res.json({ ok: true, members: members.map(m => ({ id: m._id, name: m.name, phone: m.phone, goal: m.goal, fitness_level: m.fitness_level, expires_at: m.expires_at, status: m.status })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};
