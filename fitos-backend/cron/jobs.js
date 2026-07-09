const cron = require('node-cron');
const Member = require('../models/Member');
const Gym = require('../models/Gym');
const GymPlan = require('../models/GymPlan');
const CheckIn = require('../models/CheckIn');
const Payment = require('../models/Payment');
const RevenueForecast = require('../models/RevenueForecast');
const { sendWhatsApp } = require('../utils/whatsapp');

const APP_URL = process.env.APP_URL || 'https://fitos.in';

/* ═══ 9AM — Renewal reminders + auto-expire ═══ */
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON 9AM] Renewals + auto-expire starting');
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in7days = new Date(today); in7days.setDate(in7days.getDate() + 7);
    const in7daysEnd = new Date(in7days); in7daysEnd.setHours(23, 59, 59, 999);
    const in3days = new Date(today); in3days.setDate(in3days.getDate() + 3);
    const in3daysEnd = new Date(in3days); in3daysEnd.setHours(23, 59, 59, 999);

    // 7-day reminders
    const r7 = await Member.find({ status: 'active', expires_at: { $gte: in7days, $lte: in7daysEnd } })
      .populate('gym_id', 'slug name').lean();
    for (const m of r7) {
      await sendWhatsApp(m.phone, 'renewal_7day', { member_name: m.name, expiry_date: new Date(m.expires_at).toLocaleDateString('en-IN'), renewal_link: `${APP_URL}/join/${m.gym_id?.slug}` }, m.gym_id?._id);
    }

    // 3-day urgent — engagement-aware (R2 RenewalBot)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const r3 = await Member.find({ status: 'active', expires_at: { $gte: in3days, $lte: in3daysEnd } })
      .populate('gym_id', 'slug name').lean();
    for (const m of r3) {
      const visits30d = await CheckIn.countDocuments({ member_id: m._id, checked_in_at: { $gte: thirtyDaysAgo } });
      const cheapestPlan = await GymPlan.findOne({ gym_id: m.gym_id?._id, is_active: true }).sort({ price: 1 }).lean();
      const price = cheapestPlan?.price || 499;
      if (visits30d >= 8) {
        await sendWhatsApp(m.phone, 'renewal_3day_urgent', { member_name: m.name, days_left: '3', plan_price: `₹${price}`, renewal_link: `${APP_URL}/join/${m.gym_id?.slug}` }, m.gym_id?._id);
      } else {
        await sendWhatsApp(m.phone, 'renewal_lowengagement', { member_name: m.name, gym_name: m.gym_id?.name, days_left: '3', renewal_link: `${APP_URL}/join/${m.gym_id?.slug}` }, m.gym_id?._id);
      }
    }

    // Auto-expire
    const expResult = await Member.updateMany({ status: 'active', expires_at: { $lt: today } }, { $set: { status: 'expired' } });
    console.log(`[CRON 9AM] Done: ${r7.length} 7-day, ${r3.length} 3-day, ${expResult.modifiedCount} expired`);
  } catch (e) { console.error('[CRON 9AM]', e.message); }
}, { timezone: 'Asia/Kolkata' });

/* ═══ 8AM — Birthday greetings ═══ */
cron.schedule('0 8 * * *', async () => {
  console.log('[CRON 8AM] Birthdays starting');
  try {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    // Use aggregation to find members whose dob month-day matches today
    const members = await Member.aggregate([
      { $match: { status: 'active', dob: { $exists: true, $ne: null } } },
      { $addFields: { monthDay: { $dateToString: { format: '%m-%d', date: '$dob' } } } },
      { $match: { monthDay: `${month}-${day}` } },
      { $lookup: { from: 'gyms', localField: 'gym_id', foreignField: '_id', as: 'gym' } },
      { $unwind: '$gym' },
    ]);
    for (const m of members) {
      await sendWhatsApp(m.phone, 'birthday_wishes', { member_name: m.name, gym_name: m.gym.name }, m.gym_id);
    }
    console.log(`[CRON 8AM] Done: ${members.length} birthday messages`);
  } catch (e) { console.error('[CRON 8AM]', e.message); }
}, { timezone: 'Asia/Kolkata' });

/* ═══ 6PM — Revenue summary (premium gyms) ═══ */
cron.schedule('0 18 * * *', async () => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const premiumGyms = await Gym.find({ plan: 'premium', is_active: true }, 'name').lean();
    for (const g of premiumGyms) {
      const agg = await Payment.aggregate([{ $match: { gym_id: g._id, paid_at: { $gte: today, $lte: todayEnd } } }, { $group: { _id: null, total: { $sum: '$total_amount' } } }]);
      console.log(`[CRON 6PM] ${g.name}: ₹${agg[0]?.total || 0} collected today`);
    }
  } catch (e) { console.error('[CRON 6PM]', e.message); }
}, { timezone: 'Asia/Kolkata' });

/* ═══ 10AM — ChurnShield (R2, premium gyms) ═══ */
cron.schedule('0 10 * * *', async () => {
  console.log('[CRON 10AM] ChurnShield starting');
  try {
    const d10date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const d10dateEnd = new Date(d10date); d10dateEnd.setHours(23, 59, 59, 999);
    d10date.setHours(0, 0, 0, 0);
    const d20date = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    const d20dateEnd = new Date(d20date); d20dateEnd.setHours(23, 59, 59, 999);
    d20date.setHours(0, 0, 0, 0);
    const d30date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const d10 = await Member.find({ status: 'active', last_checkin_date: { $gte: d10date, $lte: d10dateEnd } })
      .populate('gym_id', 'name slug plan').lean();
    const d10Premium = d10.filter(m => m.gym_id?.plan === 'premium');
    for (const m of d10Premium) {
      await sendWhatsApp(m.phone, 'churn_winback', { member_name: m.name, gym_name: m.gym_id?.name, days_absent: '10', offer_link: `${APP_URL}/join/${m.gym_id?.slug}` }, m.gym_id?._id);
    }

    const d20 = await Member.find({ status: 'active', last_checkin_date: { $gte: d20date, $lte: d20dateEnd } })
      .populate('gym_id', 'name slug plan').lean();
    const d20Premium = d20.filter(m => m.gym_id?.plan === 'premium');
    for (const m of d20Premium) {
      await sendWhatsApp(m.phone, 'churn_winback', { member_name: m.name, gym_name: m.gym_id?.name, days_absent: '20', offer_link: `${APP_URL}/join/${m.gym_id?.slug}` }, m.gym_id?._id);
    }

    const flagResult = await Member.updateMany({ status: 'active', churn_risk: false, last_checkin_date: { $lt: d30date } }, { $set: { churn_risk: true } });
    console.log(`[CRON 10AM] Done: ${d10Premium.length} d10, ${d20Premium.length} d20, ${flagResult.modifiedCount} flagged`);
  } catch (e) { console.error('[CRON 10AM]', e.message); }
}, { timezone: 'Asia/Kolkata' });

/* ═══ 11PM — Revenue Oracle (R2) ═══ */
cron.schedule('0 23 * * *', async () => {
  console.log('[CRON 11PM] Revenue Oracle starting');
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const gyms = await Gym.find({ is_active: true, plan: 'premium' }, '_id').lean();
    for (const g of gyms) {
      const upcoming = await Member.countDocuments({ gym_id: g._id, status: 'active', expires_at: { $gte: today, $lte: in30days } });
      const avgAgg = await Payment.aggregate([{ $match: { gym_id: g._id, paid_at: { $gte: ninetyDaysAgo } } }, { $group: { _id: null, avg: { $avg: '$total_amount' } } }]);
      const avg = avgAgg[0]?.avg || 499;
      const rate = 0.7; // default renewal rate
      const projected = Math.round(upcoming * rate * avg);
      await RevenueForecast.create({ gym_id: g._id, projected_amount: projected, upcoming_renewals: upcoming, renewal_rate: rate });
    }
    console.log(`[CRON 11PM] Done: forecasts for ${gyms.length} gyms`);
  } catch (e) { console.error('[CRON 11PM]', e.message); }
}, { timezone: 'Asia/Kolkata' });

console.log('[CRON] Scheduled: 8AM birthdays · 9AM renewals · 10AM ChurnShield · 6PM summary · 11PM Revenue Oracle');
