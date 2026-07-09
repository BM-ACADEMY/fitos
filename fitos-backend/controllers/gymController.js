const Gym = require('../models/Gym');
const Member = require('../models/Member');
const CheckIn = require('../models/CheckIn');
const Payment = require('../models/Payment');
const RevenueForecast = require('../models/RevenueForecast');

exports.getProfile = async (req, res) => {
  try {
    const gym = await Gym.findById(req.user.gym_id).lean();
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    res.json({ ok: true, gym: { ...gym, id: gym._id } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'owner_name', 'email', 'address', 'city', 'logo_url', 'gstin'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    if (!Object.keys(update).length) return res.status(400).json({ error: 'No valid fields' });

    const gym = await Gym.findByIdAndUpdate(req.user.gym_id, { $set: update }, { new: true }).lean();
    res.json({ ok: true, gym: { ...gym, id: gym._id } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const isTrainer = req.user.role === 'trainer';

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [active_members, today_checkins, expiring_7d, churn_risks] = await Promise.all([
      Member.countDocuments({ gym_id, status: 'active' }),
      CheckIn.countDocuments({ gym_id, checked_in_at: { $gte: today, $lte: todayEnd } }),
      Member.countDocuments({ gym_id, status: 'active', expires_at: { $gte: today, $lte: nextWeek } }),
      Member.countDocuments({ gym_id, status: 'active', churn_risk: true }),
    ]);

    let month_revenue = null;
    if (!isTrainer) {
      const agg = await Payment.aggregate([
        { $match: { gym_id, status: 'paid', paid_at: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } },
      ]);
      month_revenue = agg.length ? Number(agg[0].total) : 0;
    }

    const expiringDocs = await Member.find({ gym_id, status: 'active', expires_at: { $gte: today, $lte: nextWeek } })
      .sort({ expires_at: 1 }).limit(10).lean();

    const expiring_members = expiringDocs.map(m => ({
      id: m._id, name: m.name, phone: m.phone, expires_at: m.expires_at,
      days_left: Math.ceil((new Date(m.expires_at) - new Date()) / (1000 * 60 * 60 * 24)),
    }));

    const forecast = await RevenueForecast.findOne({ gym_id }).sort({ created_at: -1 }).lean();

    res.json({ ok: true, active_members, today_checkins, expiring_7d, churn_risks, month_revenue, expiring_members, forecast: forecast || null });
  } catch (e) {
    console.error('[gym/dashboard]', e.message);
    res.status(500).json({ error: 'Dashboard failed' });
  }
};
