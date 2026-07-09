const jwt = require('jsonwebtoken');
const Member = require('../models/Member');
const Gym = require('../models/Gym');
const CheckIn = require('../models/CheckIn');
const Payment = require('../models/Payment');
const PtPackage = require('../models/PtPackage');
const Measurement = require('../models/Measurement');
const { sendWhatsApp } = require('../utils/whatsapp');

const APP_URL = process.env.APP_URL || 'https://fitos.in';
const toObj = (doc) => ({ ...doc, id: doc._id });

exports.listMembers = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { gym_id: req.user.gym_id };
    if (req.user.role === 'trainer') query.trainer_id = req.user.id;
    if (status && status !== 'all') query.status = status;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];

    const members = await Member.find(query).populate('trainer_id', 'name').sort({ created_at: -1 }).limit(500).lean();
    res.json({ ok: true, members: members.map(m => ({ ...m, id: m._id, trainer_name: m.trainer_id?.name || null, trainer_id: m.trainer_id?._id || null })) });
  } catch (e) {
    console.error('[members/list]', e.message);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

exports.createMember = async (req, res) => {
  try {
    const { name, phone, gender, dob, goal, fitness_level, health_notes, enrollment_source, plan, plan_duration, trainer_id, emergency_contact } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });

    const months = Number(plan_duration) || 1;
    const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + months);

    const member = await Member.create({
      gym_id: req.user.gym_id, trainer_id: trainer_id || null, name, phone,
      gender, dob, goal, fitness_level: fitness_level || 'beginner', health_notes,
      enrollment_source: enrollment_source || 'walk_in', plan: plan || 'monthly',
      plan_duration: months, expires_at: expiresAt, emergency_contact,
      referral_token: Math.random().toString(36).slice(2, 8).toUpperCase(),
    });

    const qrToken = jwt.sign({ member_id: member._id, gym_id: req.user.gym_id }, process.env.JWT_SECRET);
    member.qr_token = qrToken;
    await member.save();

    const gym = await Gym.findById(req.user.gym_id);
    if (gym) sendWhatsApp(phone, 'welcome_new_member', { member_name: name, gym_name: gym.name, plan: plan || 'monthly', expiry_date: expiresAt.toLocaleDateString('en-IN'), qr_link: `${APP_URL}/member` }, req.user.gym_id).catch(() => {});

    res.status(201).json({ ok: true, member: toObj(member.toObject()) });
  } catch (e) {
    console.error('[members/create]', e.message);
    res.status(500).json({ error: 'Failed to create member' });
  }
};

exports.getMember = async (req, res) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, gym_id: req.user.gym_id }).populate('trainer_id', 'name').lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const [checkins, payments, packages, meas] = await Promise.all([
      CheckIn.find({ member_id: req.params.id }).sort({ checked_in_at: -1 }).limit(30).lean(),
      Payment.find({ member_id: req.params.id }).sort({ created_at: -1 }).limit(10).lean(),
      PtPackage.find({ member_id: req.params.id }).sort({ created_at: -1 }).lean(),
      Measurement.find({ member_id: req.params.id }).sort({ date: -1 }).limit(20).lean(),
    ]);

    res.json({ ok: true, member: { ...member, id: member._id, trainer_name: member.trainer_id?.name || null, trainer_id: member.trainer_id?._id || null }, check_ins: checkins.map(toObj), payments: payments.map(toObj), pt_packages: packages.map(toObj), measurements: meas.map(toObj) });
  } catch (e) {
    console.error('[members/detail]', e.message);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
};

exports.updateMember = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'gender', 'dob', 'goal', 'fitness_level', 'health_notes', 'trainer_id', 'plan', 'status', 'emergency_contact', 'expires_at'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    if (!Object.keys(update).length) return res.status(400).json({ error: 'No valid fields to update' });

    const member = await Member.findOneAndUpdate({ _id: req.params.id, gym_id: req.user.gym_id }, { $set: update }, { new: true }).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json({ ok: true, member: toObj(member) });
  } catch (e) {
    console.error('[members/update]', e.message);
    res.status(500).json({ error: 'Failed to update member' });
  }
};

exports.deleteMember = async (req, res) => {
  try {
    const member = await Member.findOneAndUpdate({ _id: req.params.id, gym_id: req.user.gym_id }, { $set: { status: 'suspended' } }, { new: true }).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json({ ok: true, suspended: member._id });
  } catch (e) {
    res.status(500).json({ error: 'Failed to suspend member' });
  }
};
