const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const Member = require('../models/Member');

const toObj = (doc) => ({ ...doc, id: doc._id });

exports.createExpense = async (req, res) => {
  try {
    const { category, description, amount, date } = req.body;
    if (!description || !amount) return res.status(400).json({ error: 'description and amount required' });
    const expense = await Expense.create({ gym_id: req.user.gym_id, category: category || 'other', description, amount, date: date ? new Date(date) : new Date() });
    res.status(201).json({ ok: true, expense: toObj(expense.toObject()) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to log expense' });
  }
};

exports.listExpenses = async (req, res) => {
  try {
    const { month, category } = req.query;
    const query = { gym_id: req.user.gym_id };
    if (category) query.category = category;
    if (month) {
      const [year, mon] = month.split('-').map(Number);
      query.date = { $gte: new Date(year, mon - 1, 1), $lte: new Date(year, mon, 0, 23, 59, 59) };
    }
    const expenses = await Expense.find(query).sort({ date: -1 }).limit(500).lean();
    res.json({ ok: true, expenses: expenses.map(toObj) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, gym_id: req.user.gym_id });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

exports.getProfitLoss = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59);

    const [revenueAgg, expenseAgg] = await Promise.all([
      Payment.aggregate([{ $match: { gym_id: req.user.gym_id, status: 'paid', paid_at: { $gte: start, $lte: end } } }, { $group: { _id: null, revenue: { $sum: '$total_amount' }, gst_collected: { $sum: '$gst_amount' } } }]),
      Expense.aggregate([{ $match: { gym_id: req.user.gym_id, date: { $gte: start, $lte: end } } }, { $group: { _id: '$category', cat_total: { $sum: '$amount' } } }]),
    ]);

    const revenue = revenueAgg[0]?.revenue || 0;
    const gst_collected = revenueAgg[0]?.gst_collected || 0;
    const expense_breakdown = expenseAgg.map(r => ({ category: r._id, total: r.cat_total }));
    const expenses = expense_breakdown.reduce((s, r) => s + r.total, 0);

    res.json({ ok: true, month, revenue, expenses, net_profit: Math.round((revenue - expenses) * 100) / 100, gst_collected, expense_breakdown });
  } catch (e) {
    console.error('[accounts/pl]', e.message);
    res.status(500).json({ error: 'P&L calc failed' });
  }
};
