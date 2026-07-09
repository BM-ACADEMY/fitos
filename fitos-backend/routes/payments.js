const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireFeature } = require('../middleware/planGate');
const { recordPayment, createRazorpayOrder, verifyRazorpay, listPayments, getStats, getInvoice } = require('../controllers/paymentController');

/* ⚠️ CRITICAL: ALL routes are gym_admin only — trainers get 403 */
router.post('/record', auth(['gym_admin']), recordPayment);
router.post('/razorpay/order', auth(['gym_admin']), requireFeature('razorpay'), createRazorpayOrder);
router.post('/razorpay/verify', auth(['gym_admin']), verifyRazorpay);
router.get('/', auth(['gym_admin']), listPayments);
router.get('/stats', auth(['gym_admin']), getStats);
router.get('/:id/invoice', auth(['gym_admin']), getInvoice);

module.exports = router;
