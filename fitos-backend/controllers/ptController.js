const PtPackage = require('../models/PtPackage');
const PtSession = require('../models/PtSession');

const toObj = (doc) => ({ ...doc, id: doc._id });

exports.createPackage = async (req, res) => {
  try {
    const { member_id, trainer_id, total_sessions, price_per_session, expires_at } = req.body;
    if (!member_id || !trainer_id || !total_sessions || !price_per_session)
      return res.status(400).json({ error: 'member_id, trainer_id, total_sessions, price_per_session required' });

    const pkg = await PtPackage.create({ gym_id: req.user.gym_id, member_id, trainer_id, total_sessions, price_per_session, total_price: Number(total_sessions) * Number(price_per_session), expires_at: expires_at || null });
    res.status(201).json({ ok: true, package: toObj(pkg.toObject()) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create PT package' });
  }
};

exports.listPackages = async (req, res) => {
  try {
    const query = { gym_id: req.user.gym_id };
    if (req.user.role === 'trainer') query.trainer_id = req.user.id;

    const packages = await PtPackage.find(query).populate('member_id', 'name').populate('trainer_id', 'name').sort({ created_at: -1 }).lean();
    res.json({ ok: true, packages: packages.map(p => ({ ...p, id: p._id, member_name: p.member_id?.name, trainer_name: p.trainer_id?.name })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
};

exports.listMemberPackages = async (req, res) => {
  try {
    const packages = await PtPackage.find({ member_id: req.params.memberId, gym_id: req.user.gym_id }).populate('trainer_id', 'name').sort({ created_at: -1 }).lean();
    res.json({ ok: true, packages: packages.map(p => ({ ...p, id: p._id, trainer_name: p.trainer_id?.name })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch member packages' });
  }
};

exports.bookSession = async (req, res) => {
  try {
    const { package_id, scheduled_at } = req.body;
    if (!package_id || !scheduled_at) return res.status(400).json({ error: 'package_id and scheduled_at required' });

    const pkg = await PtPackage.findOne({ _id: package_id, gym_id: req.user.gym_id }).lean();
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    if (pkg.used_sessions >= pkg.total_sessions) return res.status(409).json({ error: 'All sessions in this package are used' });

    const session = await PtSession.create({ package_id, gym_id: req.user.gym_id, scheduled_at });
    res.status(201).json({ ok: true, session: toObj(session.toObject()) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to book session' });
  }
};

exports.listSessions = async (req, res) => {
  try {
    const packages = req.user.role === 'trainer'
      ? await PtPackage.find({ gym_id: req.user.gym_id, trainer_id: req.user.id }, '_id').lean()
      : await PtPackage.find({ gym_id: req.user.gym_id }, '_id').lean();
    const packageIds = packages.map(p => p._id);

    const query = { gym_id: req.user.gym_id, package_id: { $in: packageIds } };
    if (req.query.status) query.status = req.query.status;

    const sessions = await PtSession.find(query).populate({ path: 'package_id', populate: [{ path: 'member_id', select: 'name' }, { path: 'trainer_id', select: 'name' }] }).sort({ scheduled_at: 1 }).limit(200).lean();
    res.json({ ok: true, sessions: sessions.map(s => ({ ...s, id: s._id, member_name: s.package_id?.member_id?.name, trainer_name: s.package_id?.trainer_id?.name })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

exports.completeSession = async (req, res) => {
  try {
    const { trainer_notes } = req.body;
    const session = await PtSession.findOneAndUpdate({ _id: req.params.id, gym_id: req.user.gym_id, status: 'scheduled' }, { $set: { status: 'completed', completed_at: new Date(), trainer_notes: trainer_notes || null } }, { new: true }).lean();
    if (!session) return res.status(404).json({ error: 'Session not found or already completed' });
    await PtPackage.findByIdAndUpdate(session.package_id, { $inc: { used_sessions: 1 } });
    res.json({ ok: true, session: toObj(session) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to complete session' });
  }
};
