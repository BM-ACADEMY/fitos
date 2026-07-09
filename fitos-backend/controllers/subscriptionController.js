const Razorpay = require('razorpay');
const Gym = require('../models/Gym');
const Subscription = require('../models/Subscription');
const FitosPlan = require('../models/FitosPlan');

const rzp = () => new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
const PLAN_MAP = { starter: process.env.RZP_PLAN_STARTER, basic: process.env.RZP_PLAN_BASIC, premium: process.env.RZP_PLAN_PREMIUM };

exports.listPlans = async (req, res) => {
  try {
    const plans = await FitosPlan.find({ is_active: true }, 'key name price member_limit features').sort({ price: 1 }).lean();
    res.json({ ok: true, plans });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

exports.subscribe = async (req, res) => {
  try {
    const { plan_key } = req.body;
    const rzpPlanId = PLAN_MAP[plan_key];
    if (!rzpPlanId) return res.status(400).json({ error: 'Invalid plan_key (starter/basic/premium)' });

    const sub = await rzp().subscriptions.create({ plan_id: rzpPlanId, customer_notify: 1, total_count: 12, notes: { gym_id: req.user.gym_id, plan_key } });
    await Subscription.create({ gym_id: req.user.gym_id, plan_key, razorpay_sub_id: sub.id, status: 'active' });

    res.json({ ok: true, subscription_id: sub.id, short_url: sub.short_url, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    console.error('[subscription/subscribe]', e.message);
    res.status(500).json({ error: 'Subscription creation failed' });
  }
};

exports.cancel = async (req, res) => {
  try {
    const gym = await Gym.findById(req.user.gym_id, 'razorpay_sub_id').lean();
    if (gym?.razorpay_sub_id) await rzp().subscriptions.cancel(gym.razorpay_sub_id).catch(() => {});
    await Gym.findByIdAndUpdate(req.user.gym_id, { $set: { plan: 'free', razorpay_sub_id: null } });
    await Subscription.updateMany({ gym_id: req.user.gym_id, status: 'active' }, { $set: { status: 'cancelled' } });
    res.json({ ok: true, downgraded_to: 'free' });
  } catch (e) {
    res.status(500).json({ error: 'Cancellation failed' });
  }
};

exports.getCurrent = async (req, res) => {
  try {
    const gym = await Gym.findById(req.user.gym_id, 'plan trial_ends_at plan_expires_at').lean();
    const sub = await Subscription.findOne({ gym_id: req.user.gym_id, status: 'active' }, 'razorpay_sub_id status').lean();
    res.json({ ok: true, plan: gym.plan, trial_ends_at: gym.trial_ends_at, plan_expires_at: gym.plan_expires_at, razorpay_sub_id: sub?.razorpay_sub_id, sub_status: sub?.status });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};
