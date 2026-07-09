const router = require('express').Router();
const auth = require('../middleware/auth');
const { listTrials, createTrial, confirmTrial, convertTrial, updateTrialStatus } = require('../controllers/trialController');

router.get('/', auth(['gym_admin']), listTrials);
router.post('/', auth(['gym_admin']), createTrial);
router.patch('/:id/confirm', auth(['gym_admin']), confirmTrial);
router.patch('/:id/convert', auth(['gym_admin']), convertTrial);
router.patch('/:id/status', auth(['gym_admin']), updateTrialStatus);

module.exports = router;
