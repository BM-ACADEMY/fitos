const Trainer = require('../models/Trainer');
const Member = require('../models/Member');
const TrainerAttendance = require('../models/TrainerAttendance');
const PtSession = require('../models/PtSession');
const PtPackage = require('../models/PtPackage');

const toObj = (doc) => ({ ...doc, id: doc._id });

exports.listTrainers = async (req, res) => {
  try {
    const trainers = await Trainer.find({ gym_id: req.user.gym_id }).sort({ created_at: 1 }).lean();
    const withCounts = await Promise.all(trainers.map(async (t) => ({
      ...t, id: t._id,
      member_count: await Member.countDocuments({ trainer_id: t._id, status: 'active' }),
    })));
    res.json({ ok: true, trainers: withCounts });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch trainers' });
  }
};

exports.createTrainer = async (req, res) => {
  try {
    const { name, phone, specialization, base_salary, pt_commission_pct } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
    const trainer = await Trainer.create({ gym_id: req.user.gym_id, name, phone, specialization, base_salary: base_salary || 0, pt_commission_pct: pt_commission_pct || 10 });
    res.status(201).json({ ok: true, trainer: toObj(trainer.toObject()) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create trainer' });
  }
};

exports.updateTrainer = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'specialization', 'base_salary', 'pt_commission_pct', 'is_active'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    if (!Object.keys(update).length) return res.status(400).json({ error: 'No valid fields' });
    const trainer = await Trainer.findOneAndUpdate({ _id: req.params.id, gym_id: req.user.gym_id }, { $set: update }, { new: true }).lean();
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
    res.json({ ok: true, trainer: toObj(trainer) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update trainer' });
  }
};

exports.deleteTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findOneAndUpdate({ _id: req.params.id, gym_id: req.user.gym_id }, { $set: { is_active: false } }).lean();
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to deactivate trainer' });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { status, date } = req.body;
    const attendDate = date ? new Date(date) : new Date();
    attendDate.setHours(0, 0, 0, 0);

    const attendance = await TrainerAttendance.findOneAndUpdate(
      { trainer_id: req.params.id, date: attendDate },
      { $set: { gym_id: req.user.gym_id, status: status || 'present' } },
      { upsert: true, new: true }
    ).lean();
    res.status(201).json({ ok: true, attendance: toObj(attendance) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

exports.getEarnings = async (req, res) => {
  try {
    if (req.user.role === 'trainer' && req.user.id !== req.params.id)
      return res.status(403).json({ error: 'Can only view own earnings' });

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split('-').map(Number);
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd = new Date(year, mon, 0, 23, 59, 59);

    const trainer = await Trainer.findOne({ _id: req.params.id, gym_id: req.user.gym_id }).lean();
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

    const attAgg = await TrainerAttendance.aggregate([
      { $match: { trainer_id: req.params.id, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }, absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } }, half_days: { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } } } },
    ]);
    const { present = 0, absent = 0, half_days = 0 } = attAgg[0] || {};

    const ptPackages = await PtPackage.find({ trainer_id: req.params.id }).lean();
    const packageIds = ptPackages.map(p => p._id);
    const ptAgg = await PtSession.aggregate([
      { $match: { package_id: { $in: packageIds }, status: 'completed', completed_at: { $gte: monthStart, $lte: monthEnd } } },
      { $lookup: { from: 'ptpackages', localField: 'package_id', foreignField: '_id', as: 'pkg' } },
      { $unwind: '$pkg' },
      { $group: { _id: null, pt_revenue: { $sum: '$pkg.price_per_session' }, sessions_completed: { $sum: 1 } } },
    ]);
    const { pt_revenue = 0, sessions_completed = 0 } = ptAgg[0] || {};

    const workingDays = 26;
    const dailyRate = Number(trainer.base_salary) / workingDays;
    const deductions = Math.round((absent * dailyRate + half_days * dailyRate * 0.5) * 100) / 100;
    const commission = Math.round(pt_revenue * Number(trainer.pt_commission_pct) / 100 * 100) / 100;
    const net_pay = Math.round((Number(trainer.base_salary) - deductions + commission) * 100) / 100;

    res.json({ ok: true, month, trainer: trainer.name, base_salary: Number(trainer.base_salary), present, absent, half_days, deductions, pt_sessions_completed: sessions_completed, pt_revenue, pt_commission_pct: Number(trainer.pt_commission_pct), commission, net_pay });
  } catch (e) {
    console.error('[trainers/earnings]', e.message);
    res.status(500).json({ error: 'Earnings calc failed' });
  }
};
