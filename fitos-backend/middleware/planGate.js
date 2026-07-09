const Gym = require('../models/Gym');
const Member = require('../models/Member');

const PLAN_ORDER = ['free', 'starter', 'basic', 'premium'];

const PLAN_FEATURES = {
  free:    ['manual_attendance', 'cash_payments'],
  starter: ['manual_attendance', 'cash_payments', 'qr_attendance', 'whatsapp_alerts', 'reports'],
  basic:   ['manual_attendance', 'cash_payments', 'qr_attendance', 'whatsapp_alerts', 'reports',
            'razorpay', 'invoices', 'expenses', 'pt_sessions', 'multi_staff'],
  premium: ['manual_attendance', 'cash_payments', 'qr_attendance', 'whatsapp_alerts', 'reports',
            'razorpay', 'invoices', 'expenses', 'pt_sessions', 'multi_staff',
            'ai_workout', 'ai_diet', 'churn_shield', 'revenue_oracle', 'multi_branch', 'referrals'],
};

const MEMBER_LIMITS = { free: 5, starter: 50, basic: 150, premium: 99999 };

/** Gate a route behind a plan feature. Usage: requireFeature('razorpay') */
function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      const gym = await Gym.findById(req.user.gym_id, 'plan trial_ends_at').lean();
      if (!gym) return res.status(404).json({ error: 'Gym not found' });

      let plan = gym.plan;
      // Free trial gets premium features until trial ends
      if (plan === 'free' && gym.trial_ends_at && new Date(gym.trial_ends_at) > new Date()) {
        plan = 'premium';
      }

      if (!PLAN_FEATURES[plan]?.includes(feature)) {
        return res.status(403).json({ error: `This feature requires a higher plan`, feature, current_plan: gym.plan, upgrade_url: '/upgrade' });
      }
      next();
    } catch (e) {
      console.error('[planGate]', e.message);
      res.status(500).json({ error: 'Plan check failed' });
    }
  };
}

/** Block member creation when the gym's plan member limit is reached. */
async function checkMemberLimit(req, res, next) {
  try {
    const gym = await Gym.findById(req.user.gym_id, 'plan').lean();
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const limit = MEMBER_LIMITS[gym.plan] ?? 5;
    const count = await Member.countDocuments({ gym_id: req.user.gym_id, status: { $ne: 'suspended' } });

    if (count >= limit) {
      return res.status(403).json({ error: `Member limit reached for ${gym.plan} plan (${limit} members)`, current_count: count, limit, upgrade_url: '/upgrade' });
    }
    next();
  } catch (e) {
    console.error('[checkMemberLimit]', e.message);
    res.status(500).json({ error: 'Member limit check failed' });
  }
}

module.exports = { requireFeature, checkMemberLimit, PLAN_ORDER, MEMBER_LIMITS };
