const router = require('express').Router();
const auth = require('../middleware/auth');
const { getProfile, updateProfile, getDashboard } = require('../controllers/gymController');

router.get('/profile', auth(['gym_admin', 'trainer']), getProfile);
router.patch('/profile', auth(['gym_admin']), updateProfile);
router.get('/dashboard', auth(['gym_admin', 'trainer']), getDashboard);

module.exports = router;
