const router = require('express').Router();
const auth = require('../middleware/auth');
const { listPlans, createPlan, updatePlan } = require('../controllers/gymPlanController');

router.get('/', auth(['gym_admin', 'trainer']), listPlans);
router.post('/', auth(['gym_admin']), createPlan);
router.patch('/:id', auth(['gym_admin']), updatePlan);

module.exports = router;
