const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const Gym = require('../models/Gym');
const GymPlan = require('../models/GymPlan');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const TrialBooking = require('../models/TrialBooking');
const Referral = require('../models/Referral');
const { sendWhatsApp } = require('../utils/whatsapp');

const APP_URL = process.env.APP_URL || 'https://fitos.in';
const rzp = () => new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

exports.getGymInfo = async (req, res) => {
  try {
    const gym = await Gym.findOne({ slug: req.params.slug, is_active: true }, 'id slug name city address logo_url').lean();
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    const plans = await GymPlan.find({ gym_id: gym._id, is_active: true }, 'id name duration_months price').sort({ duration_months: 1 }).lean();
    res.json({ ok: true, gym: { ...gym, id: gym._id }, plans: plans.map(p => ({ ...p, id: p._id })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load gym' });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { plan_id, name, phone } = req.body;
    if (!plan_id || !name || !phone) return res.status(400).json({ error: 'plan_id, name, phone required' });

    const gym = await Gym.findOne({ slug: req.params.slug, is_active: true }, '_id').lean();
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const plan = await GymPlan.findOne({ _id: plan_id, gym_id: gym._id }).lean();
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const total = Math.round(Number(plan.price) * 1.18 * 100);
    const order = await rzp().orders.create({ amount: total, currency: 'INR', receipt: `enr_${Date.now()}`, notes: { slug: req.params.slug, plan_id, name, phone, goal: req.body.goal || '', gender: req.body.gender || '', ref: req.body.ref || '' } });
    res.json({ ok: true, order, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    console.error('[enrollment/order]', e.message);
    res.status(500).json({ error: 'Order creation failed' });
  }
};

exports.verifyEnrollment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) return res.status(400).json({ error: 'Signature verification failed' });

    const order = await rzp().orders.fetch(razorpay_order_id);
    const notes = order.notes || {};

    const gym = await Gym.findOne({ slug: notes.slug }, 'id name').lean();
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const plan = await GymPlan.findById(notes.plan_id).lean();
    const months = plan?.duration_months || 1;

    // Idempotency: skip if payment already processed
    const dup = await Payment.findOne({ razorpay_payment_id });
    if (dup) return res.json({ ok: true, already_processed: true });

    const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + months);
    const member = await Member.create({
      gym_id: gym._id, name: notes.name, phone: notes.phone, gender: notes.gender || null, goal: notes.goal || null,
      enrollment_source: 'online', plan: plan?.name || 'monthly', plan_duration: months, expires_at: expiresAt,
      referral_token: Math.random().toString(36).slice(2, 8).toUpperCase(),
    });

    const qrToken = jwt.sign({ member_id: member._id, gym_id: gym._id }, process.env.JWT_SECRET);
    member.qr_token = qrToken;
    await member.save();

    const amount = Number(plan?.price || order.amount / 118);
    const gst = Math.round(amount * 0.18 * 100) / 100;
    const total = Math.round((amount + gst) * 100) / 100;
    const count = await Payment.countDocuments({ gym_id: gym._id });
    await Payment.create({ gym_id: gym._id, member_id: member._id, amount, gst_amount: gst, total_amount: total, method: 'razorpay', razorpay_payment_id, razorpay_order_id, plan_months: months, invoice_number: `FIT-${String(count + 1).padStart(5, '0')}`, status: 'paid' });

    if (notes.ref) {
      const referrer = await Member.findOne({ referral_token: notes.ref, gym_id: gym._id }, '_id').lean();
      if (referrer) await Referral.create({ referrer_id: referrer._id, referred_member_id: member._id, gym_id: gym._id });
    }

    sendWhatsApp(notes.phone, 'welcome_new_member', { member_name: notes.name, gym_name: gym.name, plan: plan?.name || 'monthly', expiry_date: expiresAt.toLocaleDateString('en-IN'), qr_link: `${APP_URL}/member` }, gym._id).catch(() => {});

    res.status(201).json({ ok: true, member_id: member._id });
  } catch (e) {
    console.error('[enrollment/verify]', e.message);
    res.status(500).json({ error: 'Enrollment failed' });
  }
};

exports.bookTrial = async (req, res) => {
  try {
    const { name, phone, gender, goal, preferred_date, preferred_time } = req.body;
    if (!name || !phone || !preferred_date) return res.status(400).json({ error: 'name, phone, preferred_date required' });
    const gym = await Gym.findOne({ slug: req.params.slug, is_active: true }, '_id').lean();
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    const trial = await TrialBooking.create({ gym_id: gym._id, name, phone, gender, goal, preferred_date, preferred_time, source: 'online' });
    res.status(201).json({ ok: true, trial: { ...trial.toObject(), id: trial._id } });
  } catch (e) {
    res.status(500).json({ error: 'Trial booking failed' });
  }
};
