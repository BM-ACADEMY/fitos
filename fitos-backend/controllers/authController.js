const jwt = require('jsonwebtoken');
const Gym = require('../models/Gym');
const Trainer = require('../models/Trainer');
const Member = require('../models/Member');
const MasterAdmin = require('../models/MasterAdmin');
const OtpStore = require('../models/OtpStore');
const GymPlan = require('../models/GymPlan');
const { sendTextMessage } = require('../utils/whatsapp');

const OTP_TTL_MIN = 5;
const isDev = process.env.NODE_ENV !== 'production';

const makeToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

async function findUserByPhone(phone) {
  const g = await Gym.findOne({ phone, is_active: true });
  if (g) return { role: 'gym_admin', id: g._id, gym_id: g._id, name: g.name };

  const t = await Trainer.findOne({ phone, is_active: true });
  if (t) return { role: 'trainer', id: t._id, gym_id: t.gym_id, name: t.name };

  const m = await Member.findOne({ phone, status: { $ne: 'suspended' } });
  if (m) return { role: 'member', id: m._id, gym_id: m.gym_id, name: m.name };

  const ma = await MasterAdmin.findOne({ phone });
  if (ma) return { role: ma.role === 'super_admin' ? 'super_admin' : 'master_admin', id: ma._id, gym_id: null, name: ma.name };

  return null;
}

exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || String(phone).replace(/\D/g, '').length < 10)
      return res.status(400).json({ error: 'Valid phone required' });

    const user = await findUserByPhone(phone);
    if (!user) return res.status(404).json({ error: 'Phone not registered. New gym? Use /register-gym' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await OtpStore.create({ phone, otp, expires_at: new Date(Date.now() + OTP_TTL_MIN * 60000) });

    await sendTextMessage(phone, `Your FitOS login OTP is ${otp}. Valid for ${OTP_TTL_MIN} minutes.`);
    if (isDev) console.log(`[OTP] ${phone} -> ${otp}`);

    res.json({ ok: true, role: user.role, ...(isDev ? { dev_otp: otp } : {}) });
  } catch (e) {
    console.error('[auth/send-otp]', e.message);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const otpDoc = await OtpStore.findOne({ phone, otp, used: false, expires_at: { $gt: new Date() } }).sort({ created_at: -1 });
    if (!otpDoc) return res.status(401).json({ error: 'Invalid or expired OTP' });

    otpDoc.used = true;
    await otpDoc.save();

    const user = await findUserByPhone(phone);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ ok: true, token: makeToken(user), user });
  } catch (e) {
    console.error('[auth/verify-otp]', e.message);
    res.status(500).json({ error: 'OTP verification failed' });
  }
};

exports.registerGym = async (req, res) => {
  try {
    const { gym_name, owner_name, phone, city, email } = req.body;
    if (!gym_name || !owner_name || !phone)
      return res.status(400).json({ error: 'gym_name, owner_name, phone required' });

    const exists = await Gym.findOne({ phone });
    if (exists) return res.status(409).json({ error: 'Phone already registered. Use login.' });

    const slug = gym_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).slice(2, 6);

    const gym = await Gym.create({ slug, name: gym_name, owner_name, phone, city: city || 'Pondicherry', email: email || null });

    await GymPlan.insertMany([
      { gym_id: gym._id, name: 'Monthly', duration_months: 1, price: 499 },
      { gym_id: gym._id, name: 'Quarterly', duration_months: 3, price: 1299 },
      { gym_id: gym._id, name: 'Half-Yearly', duration_months: 6, price: 2399 },
      { gym_id: gym._id, name: 'Annual', duration_months: 12, price: 4499 },
    ]);

    const token = makeToken({ role: 'gym_admin', id: gym._id, gym_id: gym._id, name: gym.owner_name });
    res.status(201).json({ ok: true, token, gym: { id: gym._id, slug: gym.slug, name: gym.name, trial_ends_at: gym.trial_ends_at } });
  } catch (e) {
    console.error('[auth/register-gym]', e.message);
    res.status(500).json({ error: 'Gym registration failed' });
  }
};
