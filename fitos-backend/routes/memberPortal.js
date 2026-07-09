const router = require('express').Router();
const auth = require('../middleware/auth');
const { getMe, getAttendance, getPayments, getPlans, getReferral } = require('../controllers/memberPortalController');

router.get('/me', auth(['member']), getMe);
router.get('/attendance', auth(['member']), getAttendance);
router.get('/payments', auth(['member']), getPayments);
router.get('/plans', auth(['member']), getPlans);
router.get('/referral', auth(['member']), getReferral);

module.exports = router;
