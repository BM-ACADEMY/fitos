const jwt = require('jsonwebtoken');
const TrialBooking = require('../models/TrialBooking');
const Member = require('../models/Member');
const Gym = require('../models/Gym');
const { sendWhatsApp } = require('../utils/whatsapp');

const APP_URL = process.env.APP_URL || 'https://fitos.in';
const toObj = (doc) => ({ ...doc, id: doc._id });

exports.listTrials = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { gym_id: req.user.gym_id };
    if (status && status !== 'all') query.status = status;
    const trials = await TrialBooking.find(query).sort({ created_at: -1 }).limit(200).lean();
    res.json({ ok: true, trials: trials.map(toObj) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch trials' });
  }
};

exports.createTrial = async (req, res) => {
  try {
    const { name, phone, gender, goal, preferred_date, preferred_time, source } = req.body;
    if (!name || !phone || !preferred_date) return res.status(400).json({ error: 'name, phone, preferred_date required' });
    const trial = await TrialBooking.create({ gym_id: req.user.gym_id, name, phone, gender, goal, preferred_date, preferred_time, source: source || 'walk_in' });
    res.status(201).json({ ok: true, trial: toObj(trial.toObject()) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create trial' });
  }
};

exports.confirmTrial = async (req, res) => {
  try {
    const { trainer_name } = req.body;
    const trial = await TrialBooking.findOneAndUpdate({ _id: req.params.id, gym_id: req.user.gym_id }, { $set: { status: 'confirmed' } }, { new: true }).lean();
    if (!trial) return res.status(404).json({ error: 'Trial not found' });

    const gym = await Gym.findById(req.user.gym_id).lean();
    sendWhatsApp(trial.phone, 'trial_booking_confirm', { name: trial.name, date: new Date(trial.preferred_date).toLocaleDateString('en-IN'), time: trial.preferred_time || 'Any time', trainer_name: trainer_name || 'Our trainer', gym_address: `${gym.name}, ${gym.address || gym.city}` }, req.user.gym_id).catch(() => {});

    res.json({ ok: true, trial: toObj(trial) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to confirm trial' });
  }
};

exports.convertTrial = async (req, res) => {
  try {
    const trial = await TrialBooking.findOne({ _id: req.params.id, gym_id: req.user.gym_id }).lean();
    if (!trial) return res.status(404).json({ error: 'Trial not found' });

    const { plan, plan_duration, trainer_id } = req.body;
    const months = Number(plan_duration) || 1;
    const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + months);

    const member = await Member.create({
      gym_id: req.user.gym_id, trainer_id: trainer_id || null, name: trial.name, phone: trial.phone,
      gender: trial.gender, goal: trial.goal, enrollment_source: 'trial_conversion',
      plan: plan || 'monthly', plan_duration: months, expires_at: expiresAt,
      referral_token: Math.random().toString(36).slice(2, 8).toUpperCase(),
    });

    const qrToken = jwt.sign({ member_id: member._id, gym_id: req.user.gym_id }, process.env.JWT_SECRET);
    member.qr_token = qrToken;
    await member.save();

    await TrialBooking.findByIdAndUpdate(req.params.id, { $set: { status: 'converted' } });

    const gym = await Gym.findById(req.user.gym_id).lean();
    sendWhatsApp(trial.phone, 'welcome_new_member', { member_name: trial.name, gym_name: gym.name, plan: plan || 'monthly', expiry_date: expiresAt.toLocaleDateString('en-IN'), qr_link: `${APP_URL}/member` }, req.user.gym_id).catch(() => {});

    res.status(201).json({ ok: true, member: { ...member.toObject(), id: member._id } });
  } catch (e) {
    console.error('[trials/convert]', e.message);
    res.status(500).json({ error: 'Conversion failed' });
  }
};

exports.updateTrialStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['attended', 'no_show', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const trial = await TrialBooking.findOneAndUpdate({ _id: req.params.id, gym_id: req.user.gym_id }, { $set: { status } }, { new: true }).lean();
    if (!trial) return res.status(404).json({ error: 'Trial not found' });
    res.json({ ok: true, trial: toObj(trial) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update trial' });
  }
};
