const jwt = require('jsonwebtoken');
const Member = require('../models/Member');
const CheckIn = require('../models/CheckIn');

exports.manualCheckIn = async (req, res) => {
  try {
    const { member_id } = req.body;
    const member = await Member.findOne({ _id: member_id, gym_id: req.user.gym_id }).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const dup = await CheckIn.findOne({ member_id, checked_in_at: { $gte: today, $lte: todayEnd } });
    if (dup) return res.status(409).json({ error: 'Already checked in today', member: member.name });

    await CheckIn.create({ gym_id: req.user.gym_id, member_id, method: 'manual' });
    await Member.findByIdAndUpdate(member_id, { last_checkin_date: new Date() });
    res.status(201).json({ ok: true, member: member.name, method: 'manual' });
  } catch (e) {
    console.error('[attendance/manual]', e.message);
    res.status(500).json({ error: 'Check-in failed' });
  }
};

exports.qrCheckIn = async (req, res) => {
  try {
    const { qr_token } = req.body;
    let decoded;
    try { decoded = jwt.verify(qr_token, process.env.JWT_SECRET); }
    catch { return res.status(400).json({ error: 'Invalid QR code' }); }

    if (decoded.gym_id !== req.user.gym_id) return res.status(403).json({ error: 'QR belongs to a different gym' });

    const member = await Member.findOne({ _id: decoded.member_id, gym_id: req.user.gym_id }).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.status !== 'active') return res.status(403).json({ error: `Membership ${member.status}`, member: member.name });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const dup = await CheckIn.findOne({ member_id: member._id, checked_in_at: { $gte: today, $lte: todayEnd } });
    if (dup) return res.status(409).json({ error: 'Already checked in today', member: member.name });

    await CheckIn.create({ gym_id: req.user.gym_id, member_id: member._id, method: 'qr' });
    await Member.findByIdAndUpdate(member._id, { last_checkin_date: new Date() });
    res.status(201).json({ ok: true, member: member.name, method: 'qr' });
  } catch (e) {
    console.error('[attendance/qr]', e.message);
    res.status(500).json({ error: 'QR check-in failed' });
  }
};

exports.getToday = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const checkIns = await CheckIn.find({ gym_id: req.user.gym_id, checked_in_at: { $gte: today, $lte: todayEnd } })
      .populate('member_id', 'name').sort({ checked_in_at: -1 }).lean();

    // Compute hourly distribution
    const hourlyMap = {};
    for (const c of checkIns) {
      const h = new Date(c.checked_in_at).getHours();
      hourlyMap[h] = (hourlyMap[h] || 0) + 1;
    }
    const hourly = Object.entries(hourlyMap).map(([hour, count]) => ({ hour: Number(hour), count })).sort((a, b) => a.hour - b.hour);

    res.json({ ok: true, check_ins: checkIns.map(c => ({ ...c, id: c._id, member_name: c.member_id?.name })), hourly, total: checkIns.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch today attendance' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const gym_id = req.user.gym_id;
    const now = new Date();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfWeek); startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [this_week, last_week, this_month] = await Promise.all([
      CheckIn.countDocuments({ gym_id, checked_in_at: { $gte: startOfWeek } }),
      CheckIn.countDocuments({ gym_id, checked_in_at: { $gte: startOfLastWeek, $lt: startOfWeek } }),
      CheckIn.countDocuments({ gym_id, checked_in_at: { $gte: startOfMonth } }),
    ]);

    const trendAgg = await CheckIn.aggregate([
      { $match: { gym_id, checked_in_at: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$checked_in_at' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({ ok: true, this_week, last_week, this_month, trend: trendAgg.map(r => ({ date: r._id, count: r.count })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
