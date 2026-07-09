const Member = require('../models/Member');
const WorkoutPlan = require('../models/WorkoutPlan');
const { generateWorkoutPlan, generateDietPlan } = require('../services/ai');
const { sendWhatsApp } = require('../utils/whatsapp');

const APP_URL = process.env.APP_URL || 'https://fitos.in';
const toObj = (doc) => ({ ...doc, id: doc._id });

exports.createWorkoutPlan = async (req, res) => {
  try {
    const { member_id } = req.body;
    const member = await Member.findOne({ _id: member_id, gym_id: req.user.gym_id }).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const plan = await generateWorkoutPlan(member);
    const doc = await WorkoutPlan.create({ gym_id: req.user.gym_id, member_id, generated_by: 'ai', plan_data: plan });
    res.status(201).json({ ok: true, plan_id: doc._id, plan });
  } catch (e) {
    console.error('[ai/workout-plan]', e.message);
    res.status(500).json({ error: 'AI plan generation failed. Check Anthropic credits.', detail: e.message });
  }
};

exports.createDietPlan = async (req, res) => {
  try {
    const { member_id, plan_id } = req.body;
    const member = await Member.findOne({ _id: member_id, gym_id: req.user.gym_id }).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const diet = await generateDietPlan(member);
    if (plan_id) {
      await WorkoutPlan.findOneAndUpdate({ _id: plan_id, gym_id: req.user.gym_id }, { $set: { diet_data: diet } });
    } else {
      await WorkoutPlan.create({ gym_id: req.user.gym_id, member_id, generated_by: 'ai', plan_data: {}, diet_data: diet });
    }
    res.status(201).json({ ok: true, diet });
  } catch (e) {
    console.error('[ai/diet-plan]', e.message);
    res.status(500).json({ error: 'Diet plan generation failed', detail: e.message });
  }
};

exports.sendPlan = async (req, res) => {
  try {
    const { plan_id } = req.body;
    const doc = await WorkoutPlan.findOne({ _id: plan_id, gym_id: req.user.gym_id }).populate('member_id', 'name phone').lean();
    if (!doc) return res.status(404).json({ error: 'Plan not found' });
    await sendWhatsApp(doc.member_id.phone, 'workout_plan_ready', { member_name: doc.member_id.name, plan_link: `${APP_URL}/member` }, req.user.gym_id);
    await WorkoutPlan.findByIdAndUpdate(plan_id, { $set: { sent_to_member: true } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to send plan' });
  }
};

exports.getPlans = async (req, res) => {
  try {
    const plans = await WorkoutPlan.find({ member_id: req.params.memberId, gym_id: req.user.gym_id }).sort({ created_at: -1 }).limit(5).lean();
    res.json({ ok: true, plans: plans.map(toObj) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};
