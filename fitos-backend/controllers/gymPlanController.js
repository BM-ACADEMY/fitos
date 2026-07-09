const GymPlan = require('../models/GymPlan');

const toObj = (doc) => ({ ...doc, id: doc._id });

exports.listPlans = async (req, res) => {
  try {
    const plans = await GymPlan.find({ gym_id: req.user.gym_id }).sort({ duration_months: 1 }).lean();
    res.json({ ok: true, plans: plans.map(toObj) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const { name, duration_months, price } = req.body;
    if (!name || !duration_months || !price) return res.status(400).json({ error: 'name, duration_months, price required' });
    const plan = await GymPlan.create({ gym_id: req.user.gym_id, name, duration_months, price });
    res.status(201).json({ ok: true, plan: toObj(plan.toObject()) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const allowed = ['name', 'duration_months', 'price', 'is_active'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    if (!Object.keys(update).length) return res.status(400).json({ error: 'No valid fields' });

    const plan = await GymPlan.findOneAndUpdate({ _id: req.params.id, gym_id: req.user.gym_id }, { $set: update }, { new: true }).lean();
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json({ ok: true, plan: toObj(plan) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
};
