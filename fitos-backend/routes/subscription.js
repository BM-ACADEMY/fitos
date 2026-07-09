const router = require('express').Router();
const auth = require('../middleware/auth');
const { listPlans, subscribe, cancel, getCurrent } = require('../controllers/subscriptionController');

router.get('/plans', listPlans);
router.post('/subscribe', auth(['gym_admin']), subscribe);
router.post('/cancel', auth(['gym_admin']), cancel);
router.get('/current', auth(['gym_admin']), getCurrent);

module.exports = router;
