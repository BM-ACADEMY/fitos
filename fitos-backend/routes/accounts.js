const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireFeature } = require('../middleware/planGate');
const { createExpense, listExpenses, deleteExpense, getProfitLoss } = require('../controllers/accountController');

router.post('/expenses', auth(['gym_admin']), requireFeature('expenses'), createExpense);
router.get('/expenses', auth(['gym_admin']), requireFeature('expenses'), listExpenses);
router.delete('/expenses/:id', auth(['gym_admin']), deleteExpense);
router.get('/pl', auth(['gym_admin']), requireFeature('expenses'), getProfitLoss);

module.exports = router;
