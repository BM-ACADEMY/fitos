const Gym = require('../models/Gym');
const Member = require('../models/Member');
const Subscription = require('../models/Subscription');
const WorkoutPlan = require('../models/WorkoutPlan');
const WhatsappLog = require('../models/WhatsappLog');
const Coupon = require('../models/Coupon');
const CouponUse = require('../models/CouponUse');
const { sendTextMessage } = require('../utils/whatsapp');

const PLAN_PRICE = { free: 0, starter: 149, basic: 349, premium: 799 };
const toObj = (doc) => ({ ...doc, id: doc._id });

exports.getOverview = async (req, res) => {
  try {
    const planAgg = await Gym.aggregate([{ $match: { is_active: true } }, { $group: { _id: '$plan', count: { $sum: 1 } } }]);
    const distribution = {};
    let mrr = 0;
    for (const r of planAgg) { distribution[r._id] = r.count; mrr += (PLAN_PRICE[r._id] || 0) * r.count; }

    const [total_gyms, active_gyms, total_members] = await Promise.all([
      Gym.countDocuments(),
      Gym.countDocuments({ is_active: true }),
      Member.countDocuments({ status: 'active' }),
    ]);

    const recent_signups = await Gym.find().sort({ created_at: -1 }).limit(10).lean();
    res.json({ ok: true, mrr, arr: mrr * 12, total_gyms, active_gyms, total_members, plan_distribution: distribution, recent_signups: recent_signups.map(toObj) });
  } catch (e) {
    console.error('[master/overview]', e.message);
    res.status(500).json({ error: 'Overview failed' });
  }
};

exports.listGyms = async (req, res) => {
  try {
    const { plan, city, status } = req.query;
    const query = {};
    if (plan) query.plan = plan;
    if (city) query.city = { $regex: city, $options: 'i' };
    if (status === 'active') query.is_active = true;
    if (status === 'inactive') query.is_active = false;

    const gyms = await Gym.find(query).sort({ created_at: -1 }).limit(500).lean();
    const withCounts = await Promise.all(gyms.map(async (g) => ({ ...g, id: g._id, member_count: await Member.countDocuments({ gym_id: g._id, status: 'active' }) })));
    res.json({ ok: true, gyms: withCounts });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
};

exports.overridePlan = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only super_admin can change plans' });
    const { plan } = req.body;
    if (!['free', 'starter', 'basic', 'premium'].includes(plan)) return res.status(400).json({ error: 'Invalid plan' });
    const gym = await Gym.findByIdAndUpdate(req.params.id, { $set: { plan } }, { new: true }).lean();
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    res.json({ ok: true, gym: { id: gym._id, name: gym.name, plan: gym.plan } });
  } catch (e) {
    res.status(500).json({ error: 'Plan override failed' });
  }
};

exports.suspendGym = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndUpdate(req.params.id, { $set: { is_active: req.body.active === true } }, { new: true }).lean();
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    res.json({ ok: true, gym: { id: gym._id, name: gym.name, is_active: gym.is_active } });
  } catch (e) {
    res.status(500).json({ error: 'Suspend failed' });
  }
};

exports.getRevenue = async (req, res) => {
  try {
    const twelveMonthsAgo = new Date(); twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const trendAgg = await Gym.aggregate([{ $match: { created_at: { $gte: twelveMonthsAgo } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$created_at' } }, new_gyms: { $sum: 1 } } }, { $sort: { _id: 1 } }]);

    const gyms = await Gym.find({ is_active: true }).lean();
    const topGymsData = await Promise.all(gyms.map(async (g) => ({ name: g.name, plan: g.plan, city: g.city, member_count: await Member.countDocuments({ gym_id: g._id, status: 'active' }) })));
    topGymsData.sort((a, b) => b.member_count - a.member_count);

    res.json({ ok: true, signups_trend: trendAgg.map(r => ({ month: r._id, new_gyms: r.new_gyms })), top_gyms: topGymsData.slice(0, 10) });
  } catch (e) {
    res.status(500).json({ error: 'Revenue data failed' });
  }
};

exports.waHealth = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [templates, recent_failures] = await Promise.all([
      WhatsappLog.aggregate([{ $match: { created_at: { $gte: thirtyDaysAgo } } }, { $group: { _id: '$template_name', total: { $sum: 1 }, sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } }, { $sort: { total: -1 } }]),
      WhatsappLog.find({ status: 'failed' }).sort({ created_at: -1 }).limit(20).lean(),
    ]);
    res.json({ ok: true, templates: templates.map(r => ({ template_name: r._id, total: r.total, sent: r.sent, failed: r.failed })), recent_failures });
  } catch (e) {
    res.status(500).json({ error: 'WA health failed' });
  }
};

exports.broadcast = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only super_admin can broadcast' });
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const gyms = await Gym.find({ is_active: true }, 'phone').lean();
    let sent = 0;
    for (const g of gyms) { const r = await sendTextMessage(g.phone, message); if (r.ok) sent++; }
    res.json({ ok: true, total: gyms.length, sent });
  } catch (e) {
    res.status(500).json({ error: 'Broadcast failed' });
  }
};

exports.listCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ created_at: -1 }).lean();
    const withUses = await Promise.all(coupons.map(async (c) => ({ ...c, id: c._id, uses: await CouponUse.countDocuments({ coupon_id: c._id }) })));
    res.json({ ok: true, coupons: withUses });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const { code, discount_pct, max_uses, expires_at } = req.body;
    if (!code || !discount_pct) return res.status(400).json({ error: 'code and discount_pct required' });
    const coupon = await Coupon.create({ code: code.toUpperCase(), discount_pct, max_uses: max_uses || 100, expires_at: expires_at || null });
    res.status(201).json({ ok: true, coupon: toObj(coupon.toObject()) });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Coupon code already exists' });
    res.status(500).json({ error: 'Failed to create coupon' });
  }
};

exports.deactivateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, { $set: { is_active: false } }).lean();
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to deactivate' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    const [cancelled, plans_this_month, aiByGymAgg] = await Promise.all([
      Subscription.countDocuments({ status: 'cancelled', created_at: { $gte: ninetyDaysAgo } }),
      WorkoutPlan.countDocuments({ generated_by: 'ai', created_at: { $gte: startOfMonth } }),
      WorkoutPlan.aggregate([{ $match: { generated_by: 'ai', created_at: { $gte: startOfMonth } } }, { $group: { _id: '$gym_id', plans: { $sum: 1 } } }, { $sort: { plans: -1 } }, { $limit: 5 }, { $lookup: { from: 'gyms', localField: '_id', foreignField: '_id', as: 'gym' } }, { $unwind: '$gym' }, { $project: { name: '$gym.name', plans: 1 } }]),
    ]);

    res.json({ ok: true, cancelled_90d: cancelled, ai_plans_this_month: plans_this_month, ai_cost_estimate: plans_this_month * 4, top_ai_gyms: aiByGymAgg.map(r => ({ name: r.name, plans: r.plans })) });
  } catch (e) {
    res.status(500).json({ error: 'Analytics failed' });
  }
};
