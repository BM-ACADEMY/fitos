const Member = require('../models/Member');
const Gym = require('../models/Gym');
const CheckIn = require('../models/CheckIn');
const Payment = require('../models/Payment');
const WorkoutPlan = require('../models/WorkoutPlan');
const Referral = require('../models/Referral');

const APP_URL = process.env.APP_URL || 'https://fitos.in';

exports.getMe = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const gym = await Gym.findById(member.gym_id, 'name slug').lean();
    const days_remaining = member.expires_at ? Math.ceil((new Date(member.expires_at) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

    res.json({ ok: true, member: { id: member._id, name: member.name, phone: member.phone, plan: member.plan, expires_at: member.expires_at, status: member.status, qr_token: member.qr_token, goal: member.goal, referral_token: member.referral_token, gym_name: gym?.name, gym_slug: gym?.slug, days_remaining } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const [check_ins, this_month] = await Promise.all([
      CheckIn.find({ member_id: req.user.id }).sort({ checked_in_at: -1 }).limit(60).lean(),
      CheckIn.countDocuments({ member_id: req.user.id, checked_in_at: { $gte: startOfMonth } }),
    ]);
    res.json({ ok: true, check_ins: check_ins.map(c => ({ checked_in_at: c.checked_in_at, method: c.method })), this_month });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ member_id: req.user.id, status: 'paid' }).sort({ paid_at: -1 }).limit(30).lean();
    res.json({ ok: true, payments: payments.map(p => ({ id: p._id, total_amount: p.total_amount, method: p.method, invoice_number: p.invoice_number, plan_months: p.plan_months, paid_at: p.paid_at })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

exports.getPlans = async (req, res) => {
  try {
    const plans = await WorkoutPlan.find({ member_id: req.user.id, is_active: true }).sort({ created_at: -1 }).limit(3).lean();
    res.json({ ok: true, plans: plans.map(p => ({ id: p._id, generated_by: p.generated_by, plan_data: p.plan_data, diet_data: p.diet_data, created_at: p.created_at })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

exports.getReferral = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id, 'referral_token gym_id').lean();
    const gym = await Gym.findById(member.gym_id, 'slug').lean();
    const referral_count = await Referral.countDocuments({ referrer_id: req.user.id });
    res.json({ ok: true, referral_link: `${APP_URL}/join/${gym?.slug}?ref=${member.referral_token}`, referral_count });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch referral info' });
  }
};
