const router = require('express').Router();
const auth = require('../middleware/auth');
const { manualCheckIn, qrCheckIn, getToday, getStats } = require('../controllers/attendanceController');

router.post('/manual', auth(['gym_admin', 'trainer']), manualCheckIn);
router.post('/qr', auth(['gym_admin', 'trainer']), qrCheckIn);
router.get('/today', auth(['gym_admin', 'trainer']), getToday);
router.get('/stats', auth(['gym_admin', 'trainer']), getStats);

module.exports = router;
