const router = require('express').Router();
const { getGymInfo, createOrder, verifyEnrollment, bookTrial } = require('../controllers/enrollmentController');

router.get('/:slug', getGymInfo);
router.post('/:slug/order', createOrder);
router.post('/verify', verifyEnrollment);
router.post('/:slug/trial', bookTrial);

module.exports = router;
