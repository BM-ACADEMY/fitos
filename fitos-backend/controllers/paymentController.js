const crypto = require('crypto');
const Razorpay = require('razorpay');
const Member = require('../models/Member');
const Gym = require('../models/Gym');
const Payment = require('../models/Payment');
const { sendWhatsApp } = require('../utils/whatsapp');
const { generateInvoice } = require('../utils/invoice');

/* ⚠️ CRITICAL: EVERY export here is gym_admin only — trainers get 403. */

const rzp = () => new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

async function nextInvoiceNumber(gymId) {
  const count = await Payment.countDocuments({ gym_id: gymId });
  return `FIT-${String(count + 1).padStart(5, '0')}`;
}

async function recordPaymentAndExtend({ gymId, memberId, amount, method, planMonths, razorpayPaymentId, razorpayOrderId, notes }) {
  const gst = Math.round(amount * 0.18 * 100) / 100;
  const total = Math.round((amount + gst) * 100) / 100;
  const invoiceNumber = await nextInvoiceNumber(gymId);

  const payment = await Payment.create({
    gym_id: gymId, member_id: memberId, amount, gst_amount: gst, total_amount: total,
    method, razorpay_payment_id: razorpayPaymentId || null, razorpay_order_id: razorpayOrderId || null,
    plan_months: planMonths, invoice_number: invoiceNumber, notes: notes || null, status: 'paid',
  });

  const member = await Member.findById(memberId);
  const currentExpiry = member.expires_at && new Date(member.expires_at) > new Date() ? new Date(member.expires_at) : new Date();
  currentExpiry.setMonth(currentExpiry.getMonth() + planMonths);
  await Member.findByIdAndUpdate(memberId, { expires_at: currentExpiry, status: 'active' });

  return payment.toObject();
}

exports.recordPayment = async (req, res) => {
  try {
    const { member_id, amount, method, plan_months, notes } = req.body;
    if (!member_id || !amount) return res.status(400).json({ error: 'member_id and amount required' });
    if (!['cash', 'upi'].includes(method)) return res.status(400).json({ error: 'method must be cash or upi' });

    const member = await Member.findOne({ _id: member_id, gym_id: req.user.gym_id }).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const payment = await recordPaymentAndExtend({ gymId: req.user.gym_id, memberId: member_id, amount: Number(amount), method, planMonths: Number(plan_months) || 1, notes });

    const gym = await Gym.findById(req.user.gym_id).lean();
    sendWhatsApp(member.phone, 'payment_success', { member_name: member.name, gym_name: gym.name, amount: `₹${payment.total_amount}`, invoice_number: payment.invoice_number }, req.user.gym_id).catch(() => {});

    res.status(201).json({ ok: true, payment: { ...payment, id: payment._id } });
  } catch (e) {
    console.error('[payments/record]', e.message);
    res.status(500).json({ error: 'Payment recording failed' });
  }
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });
    const total = Math.round(Number(amount) * 1.18 * 100);
    const order = await rzp().orders.create({ amount: total, currency: 'INR', receipt: `fit_${Date.now()}` });
    res.json({ ok: true, order, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    console.error('[payments/rzp-order]', e.message);
    res.status(500).json({ error: 'Razorpay order failed' });
  }
};

exports.verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, member_id, amount, plan_months } = req.body;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) return res.status(400).json({ error: 'Signature verification failed' });

    const member = await Member.findOne({ _id: member_id, gym_id: req.user.gym_id }).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const payment = await recordPaymentAndExtend({ gymId: req.user.gym_id, memberId: member_id, amount: Number(amount), method: 'razorpay', planMonths: Number(plan_months) || 1, razorpayPaymentId: razorpay_payment_id, razorpayOrderId: razorpay_order_id });

    const gym = await Gym.findById(req.user.gym_id).lean();
    sendWhatsApp(member.phone, 'payment_success', { member_name: member.name, gym_name: gym.name, amount: `₹${payment.total_amount}`, invoice_number: payment.invoice_number }, req.user.gym_id).catch(() => {});

    res.json({ ok: true, payment: { ...payment, id: payment._id } });
  } catch (e) {
    console.error('[payments/rzp-verify]', e.message);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.listPayments = async (req, res) => {
  try {
    const { member_id, from, to, method } = req.query;
    const query = { gym_id: req.user.gym_id };
    if (member_id) query.member_id = member_id;
    if (method) query.method = method;
    if (from || to) { query.paid_at = {}; if (from) query.paid_at.$gte = new Date(from); if (to) query.paid_at.$lte = new Date(to); }

    const payments = await Payment.find(query).populate('member_id', 'name').sort({ paid_at: -1 }).limit(500).lean();
    res.json({ ok: true, payments: payments.map(p => ({ ...p, id: p._id, member_name: p.member_id?.name, member_id: p.member_id?._id })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [monthAgg, totalAgg, pending_renewals] = await Promise.all([
      Payment.aggregate([{ $match: { gym_id, status: 'paid', paid_at: { $gte: startOfMonth } } }, { $group: { _id: null, this_month: { $sum: '$total_amount' }, avg_payment: { $avg: '$total_amount' }, total_payments: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { gym_id, status: 'paid' } }, { $group: { _id: null, avg_payment: { $avg: '$total_amount' }, total_payments: { $sum: 1 } } }]),
      Member.countDocuments({ gym_id, status: 'active', expires_at: { $gte: today, $lte: nextWeek } }),
    ]);

    const monthlyAgg = await Payment.aggregate([
      { $match: { gym_id, paid_at: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paid_at' } }, total: { $sum: '$total_amount' } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({ ok: true, this_month: monthAgg[0]?.this_month || 0, avg_payment: totalAgg[0]?.avg_payment || 0, total_payments: totalAgg[0]?.total_payments || 0, pending_renewals, monthly: monthlyAgg.map(r => ({ month: r._id, total: r.total })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payment stats' });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, gym_id: req.user.gym_id }).lean();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    const pdf = await generateInvoice(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${req.params.id.slice(0, 8)}.pdf`);
    res.send(pdf);
  } catch (e) {
    console.error('[payments/invoice]', e.message);
    res.status(500).json({ error: 'Invoice generation failed' });
  }
};
